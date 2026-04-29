
import { Env, getAuth } from './_auth';
import { sendEmail, getAdminEmail } from '../services/email';

interface LayoutEnv extends Env {
    MP_ACCESS_TOKEN: string;
}

export const onRequest: any = async ({ request, env }: { request: Request, env: LayoutEnv }) => {
  try {
    const user = await getAuth(request, env);
    if (!user) return new Response(JSON.stringify({ error: 'Não autorizado' }), { status: 401 });

    const url = new URL(request.url);
    const id = url.searchParams.get('id');

    if (request.method === 'POST') {
      const body = await request.json() as any;
      const { serviceId, description, exampleUrl, logoUrl, paymentMethod, value } = body;

      if (!serviceId || !description || !value) {
        return new Response(JSON.stringify({ error: 'Campos obrigatórios ausentes' }), { status: 400 });
      }

      const requestId = crypto.randomUUID();
      const clientId = user.clientId;
      const now = new Date().toISOString();

      // Buscar info do cliente para o e-mail
      const client: any = await env.DB.prepare('SELECT * FROM clients WHERE id = ?').bind(clientId).first();
      if (!client) return new Response(JSON.stringify({ error: 'Cliente não encontrado' }), { status: 404 });

      // Verificar limite de crédito se for esse o método
      if (paymentMethod === 'credit') {
        if (client.creditLimit < value) {
          return new Response(JSON.stringify({ error: 'Limite de crédito insuficiente' }), { status: 400 });
        }
        
        // Deduzir do limite
        await env.DB.prepare('UPDATE clients SET creditLimit = creditLimit - ? WHERE id = ?')
          .bind(value, clientId)
          .run();
      }

      // Salvar solicitação na tabela de layouts (Módulo Próprio)
      await env.DB.prepare(`
        INSERT INTO layout_requests (
          id, client_id, service_id, description, example_url, logo_url, 
          value, total, payment_method, payment_status, order_status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        requestId,
        clientId,
        serviceId,
        description,
        exampleUrl || null,
        logoUrl || null,
        value,
        value,
        paymentMethod,
        paymentMethod === 'credit' ? 'credit_approved' : 'pending',
        paymentMethod === 'credit' ? 'open' : 'draft',
        now
      ).run();

      // Criar Pedido na Tabela Global de Pedidos se for Crédito (Para aparecer na listagem principal)
      if (paymentMethod === 'credit') {
        const { results: maxResults } = await env.DB.prepare('SELECT MAX(order_number) as last FROM orders').all();
        const lastNum = (maxResults as any)[0]?.last;
        const nextOrderNumber = (Number(lastNum) || 0) + 1;

        const orderId = crypto.randomUUID();
        await env.DB.prepare(`
            INSERT INTO orders (id, order_number, client_id, description, order_date, due_date, total, total_cost, status, created_at, source, production_step, is_confirmed)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
        `).bind(
            orderId,
            nextOrderNumber,
            clientId,
            `Layout Simples: ${description.substring(0, 50)}...`,
            now.split('T')[0],
            now.split('T')[0],
            value,
            0,
            'paid',
            now,
            'layout_simples',
            'production'
        ).run();

        // Adicionar o item ao pedido
        const itemId = crypto.randomUUID();
        await env.DB.prepare(`
            INSERT INTO order_items (id, order_id, catalog_id, name, type, unit_price, quantity, total, art_link, art_extras_desc)
            VALUES (?, ?, ?, ?, 'service', ?, 1, ?, ?, ?)
        `).bind(
            itemId,
            orderId,
            serviceId,
            "Layout Simples",
            value,
            value,
            exampleUrl || null,
            description
        ).run();
      }

      // Enviar E-mail se for crédito (pago online será enviado via webhook/callback de pagamento)
      if (paymentMethod === 'credit') {
        await notifyAdmin(env, {
          requestId,
          clientName: client.name,
          clientEmail: client.email,
          clientPhone: client.phone,
          description,
          exampleUrl,
          logoUrl,
          value,
          paymentMethod: 'Crédito Fidelidade',
          status: 'Aberto (Crédito Reservado)'
        });
      }

      // Se for pagamento online, gerar link do MercadoPago
      let checkoutUrl = null;
      if (paymentMethod === 'online') {
          const origin = new URL(request.url).origin;
          const preferencePayload = {
              items: [{
                  id: requestId,
                  title: `Layout Simples: ${client.name}`,
                  description: "Solicitação de Layout Personalizado",
                  category_id: "services",
                  quantity: 1,
                  currency_id: 'BRL',
                  unit_price: Number(value)
              }],
              external_reference: `LAYOUT_${requestId}`,
              back_urls: {
                  success: `${origin}/minha-area?status=success&layoutId=${requestId}`,
                  failure: `${origin}/minha-area?status=failure`,
                  pending: `${origin}/minha-area?status=pending`
              },
              auto_return: "approved",
              notification_url: `${origin}/api/mp-webhook`
          };

          const mpResponse = await fetch('https://api.mercadopago.com/checkout/preferences', {
              method: 'POST',
              headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${env.MP_ACCESS_TOKEN}`
              },
              body: JSON.stringify(preferencePayload)
          });

          if (mpResponse.ok) {
              const mpData: any = await mpResponse.json();
              checkoutUrl = mpData.init_point;
          }
      }

      return Response.json({
        success: true,
        requestId,
        checkoutUrl
      });
    }

    if (request.method === 'GET') {
        // Listagem para o admin ou para o próprio cliente
        let query = 'SELECT lr.*, c.name as client_name FROM layout_requests lr JOIN clients c ON lr.client_id = c.id';
        const params: any[] = [];
        
        if (user.role === 'client') {
            query += ' WHERE lr.client_id = ?';
            params.push(user.clientId);
        } else if (id) {
            query += ' WHERE lr.id = ?';
            params.push(id);
        }

        query += ' ORDER BY lr.created_at DESC';
        
        const { results } = await env.DB.prepare(query).bind(...params).all();
        return Response.json(results);
    }

    return new Response(JSON.stringify({ error: 'Método não permitido' }), { status: 405 });
  } catch (err: any) {
    console.error('Erro Layout Request API:', err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};

async function notifyAdmin(env: any, data: any) {
    const adminEmail = getAdminEmail(env);
    const html = `
        <div style="font-family: sans-serif; max-width: 600px; border: 1px solid #eee; padding: 20px; border-radius: 15px;">
            <h2 style="color: #F59E0B; text-transform: uppercase;">🎨 Nova Solicitação de Layout Simples</h2>
            <p>Um novo pedido personalizado foi recebido.</p>
            
            <div style="background: #f9fafb; padding: 15px; border-radius: 10px; margin: 20px 0;">
                <h3 style="margin-top: 0; font-size: 14px; color: #666;">DADOS DO CLIENTE</h3>
                <p><strong>Nome:</strong> ${data.clientName}</p>
                <p><strong>E-mail:</strong> ${data.clientEmail}</p>
                <p><strong>WhatsApp:</strong> ${data.clientPhone || 'Não informado'}</p>
            </div>

            <div style="background: #f9fafb; padding: 15px; border-radius: 10px; margin: 20px 0;">
                <h3 style="margin-top: 0; font-size: 14px; color: #666;">DETALHES DO BRIEFING</h3>
                <p style="white-space: pre-wrap;">${data.description}</p>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin: 20px 0;">
                <div style="background: #f9fafb; padding: 10px; border-radius: 10px; text-align: center;">
                    <p style="font-size: 10px; font-weight: bold; margin-bottom: 5px;">EXEMPLO</p>
                    ${data.exampleUrl ? `<a href="${data.exampleUrl}" target="_blank"><img src="${data.exampleUrl}" style="width: 100%; height: 100px; object-cover; border-radius: 5px;" /></a>` : 'Não enviado'}
                </div>
                <div style="background: #f9fafb; padding: 10px; border-radius: 10px; text-align: center;">
                    <p style="font-size: 10px; font-weight: bold; margin-bottom: 5px;">LOGO</p>
                    ${data.logoUrl ? `<a href="${data.logoUrl}" target="_blank"><img src="${data.logoUrl}" style="width: 100%; height: 100px; object-cover; border-radius: 5px;" /></a>` : 'Não enviado'}
                </div>
            </div>

            <div style="border-top: 1px solid #eee; pt: 20px;">
                <p><strong>ID do Pedido:</strong> ${data.requestId}</p>
                <p><strong>Valor:</strong> R$ ${Number(data.value).toFixed(2)}</p>
                <p><strong>Pagamento:</strong> ${data.paymentMethod}</p>
                <p><strong>Status:</strong> <span style="color: #10B981;">${data.status}</span></p>
                <p><strong>Data/Hora:</strong> ${new Date().toLocaleString('pt-BR')}</p>
            </div>
        </div>
    `;

    await sendEmail(env, {
        to: adminEmail,
        subject: `[Layout Simples] Novo Pedido - ${data.clientName}`,
        html
    });
}
