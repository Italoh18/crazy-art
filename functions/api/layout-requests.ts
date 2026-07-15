
import { Env, getAuth } from './_auth';
import { sendEmail, getAdminEmail } from '../services/email';
import { sendPushNotification, notifyAdminsPush } from '../services/push';

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
      const { serviceId, description, exampleUrl, logoUrl, paymentMethod, value, discount = 0, type = 'layout_simples', quantity = 1 } = body;

      const isMolde = type === 'montagem_molde';
      const label = isMolde ? 'Montagem de Molde' : 'Layout Simples';

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
        // Calcular saldo disponível real: Limite - Pedidos Abertos
        const { results: openOrders } = await env.DB.prepare(`
          SELECT SUM(total) as total_open FROM orders 
          WHERE client_id = ? AND status = 'open'
        `).bind(clientId).all();
        
        const totalOpen = Number((openOrders as any)[0]?.total_open || 0);
        const availableCredit = Number(client.creditLimit || 0) - totalOpen;

        if (availableCredit < value) {
          return new Response(JSON.stringify({ error: `Saldo de crédito insuficiente. Disponível: R$ ${availableCredit.toFixed(2)}` }), { status: 400 });
        }
        
        // NÃO subtraímos do creditLimit aqui. 
        // O valor será "consumido" do saldo disponível enquanto o pedido estiver com status 'open'.
        // Assim que for finalizado, o saldo é liberado automaticamente.
      }

      // Calcular Número do Pedido
      const { results: maxResults } = await env.DB.prepare('SELECT MAX(order_number) as last FROM orders').all();
      const lastNum = (maxResults as any)[0]?.last;
      const nextOrderNumber = (Number(lastNum) || 0) + 1;

      // Salvar na tabela Global de Pedidos
      await env.DB.prepare(`
        INSERT INTO orders (
          id, order_number, client_id, description, 
          example_url, logo_url, total, total_cost,
          payment_method, payment_status, status, 
          source, order_date, due_date, created_at, 
          production_step, is_confirmed, discount
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
      `).bind(
        requestId,
        nextOrderNumber,
        clientId,
        description,
        exampleUrl || null,
        logoUrl || null,
        value,
        0, // total_cost
        paymentMethod,
        paymentMethod === 'credit' ? 'paid' : 'pending',
        paymentMethod === 'credit' ? 'open' : 'draft',
        type,
        now.split('T')[0],
        paymentMethod === 'credit' 
          ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
          : now.split('T')[0],
        now,
        'production',
        discount
      ).run();

      // Invalida o cupom se o usuário utilizou um
      const coupon_code = body.couponCode || body.coupon_code || body.coupon;
      if (coupon_code && clientId) {
          const cleanCouponCode = String(coupon_code).toUpperCase().trim();
          await env.DB.prepare(
              'UPDATE client_coupons SET is_used = 1 WHERE client_id = ? AND code = ? AND is_used = 0'
          ).bind(clientId, cleanCouponCode).run();
      }

      // Salvar as réplicas na lista pública se houver
      if (body.replicas && Array.isArray(body.replicas) && body.replicas.length > 0) {
        try {
          await env.DB.prepare(`
            CREATE TABLE IF NOT EXISTS public_lists (
              id TEXT PRIMARY KEY,
              client_id TEXT NOT NULL,
              title TEXT NOT NULL,
              items TEXT NOT NULL,
              created_at TEXT NOT NULL,
              updated_at TEXT NOT NULL,
              is_locked INTEGER DEFAULT 0
            )
          `).run();

          let publicList: any = await env.DB.prepare('SELECT * FROM public_lists WHERE client_id = ? ORDER BY created_at DESC LIMIT 1').bind(clientId).first();
          
          let existingItems: any[] = [];
          if (publicList) {
            try {
              existingItems = typeof publicList.items === 'string' ? JSON.parse(publicList.items) : (publicList.items || []);
              if (!Array.isArray(existingItems)) existingItems = [];
            } catch (e) {
              existingItems = [];
            }
          }

          const newItemsMapped = body.replicas.map((r: any) => ({
            id: r.id || crypto.randomUUID(),
            category: r.category || 'unisex',
            size: r.size || 'M',
            name: r.name || '',
            number: r.number || '',
            shortSize: r.shortSize || r.size || 'M',
            shortNumber: r.shortNumber || r.number || '',
            isSimple: false,
            isConjunto: !!r.isConjunto
          }));

          const mergedItems = [...existingItems, ...newItemsMapped];
          const mergedItemsStr = JSON.stringify(mergedItems);

          if (publicList) {
            await env.DB.prepare(`
              UPDATE public_lists
              SET items = ?, updated_at = ?
              WHERE id = ?
            `).bind(mergedItemsStr, now, publicList.id).run();
          } else {
            const newId = crypto.randomUUID();
            await env.DB.prepare(`
              INSERT INTO public_lists (id, client_id, title, items, created_at, updated_at, is_locked)
              VALUES (?, ?, ?, ?, ?, ?, 0)
            `).bind(
              newId,
              clientId,
              'Lista Pública de Pedido',
              mergedItemsStr,
              now,
              now
            ).run();
          }
        } catch (e) {
          console.error('[LayoutRequest] Erro ao salvar lista pública:', e);
        }
      }

      // Criar Item do Pedido
      const itemId = crypto.randomUUID();
      await env.DB.prepare(`
          INSERT INTO order_items (id, order_id, catalog_id, name, type, unit_price, quantity, total, art_link, art_extras_desc)
          VALUES (?, ?, ?, ?, 'service', ?, ?, ?, ?, ?)
      `).bind(
          itemId,
          requestId,
          serviceId,
          label,
          Number(value) / Number(quantity),
          quantity,
          value,
          exampleUrl || null,
          description
      ).run();

      // Enviar Notificação In-App para Admin (Sempre que um pedido é gerado)
      const notificationTitle = `Nova Solicitação: ${label}`;
      const notificationMessage = `O cliente ${client.name} gerou um pedido de ${label.toLowerCase()}. Valor: R$ ${Number(value).toFixed(2)} (${paymentMethod === 'credit' ? 'Crédito' : 'Aguardando Pagamento Online'})`;
      
      await env.DB.prepare(`
        INSERT INTO notifications (id, target_role, type, title, message, created_at, reference_id, is_read)
        VALUES (?, 'admin', 'info', ?, ?, ?, ?, 0)
      `).bind(crypto.randomUUID(), notificationTitle, notificationMessage, now, requestId).run();

      // PUSH ADMIN (Layout)
      console.log(`[LayoutRequest] Enviando push para admins: ${notificationTitle}`);
      await notifyAdminsPush(env, {
          title: notificationTitle,
          body: notificationMessage,
          url: '/orders'
      });

      // Enviar E-mail se for crédito (pago online será enviado via webhook quando aprovado)
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
          type,
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
                  title: `${label}: ${client.name}`,
                  description: `Solicitação de ${label} Personalizado`,
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
        // Listagem para o admin ou para o próprio cliente pegando da tabela orders
        let query = `
            SELECT o.*, c.name as client_name 
            FROM orders o 
            JOIN clients c ON o.client_id = c.id 
            WHERE o.source IN ('layout_simples', 'montagem_molde')
        `;
        const params: any[] = [];
        
        if (user.role === 'client') {
            query += ' AND o.client_id = ?';
            params.push(user.clientId);
        } else if (id) {
            query += ' AND o.id = ?';
            params.push(id);
        }

        query += ' ORDER BY o.created_at DESC';
        
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
    const label = data.type === 'montagem_molde' ? 'Montagem de Molde' : 'Layout Simples';
    const html = `
        <div style="font-family: sans-serif; max-width: 600px; border: 1px solid #eee; padding: 20px; border-radius: 15px;">
            <h2 style="color: #F59E0B; text-transform: uppercase;">🎨 Nova Solicitação de ${label}</h2>
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
        subject: `[${label}] Novo Pedido - ${data.clientName}`,
        html
    });
}
