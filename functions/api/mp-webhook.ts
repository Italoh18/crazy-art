
import { sendEmail, templates, getAdminEmail } from '../services/email';

export interface Env {
  DB: any;
  MP_ACCESS_TOKEN: string;
  RESEND_API_KEY?: string;
  ADMIN_EMAIL?: string;
  SENDER_EMAIL?: string;
}

export const onRequestPost: any = async ({ request, env }: { request: Request, env: Env }) => {
  const url = new URL(request.url);
  console.log(`[Webhook] Notificação recebida: ${url.search}`);

  try {
    // 1. Identificar o ID do pagamento e o tipo
    // O Mercado Pago pode enviar via Query String ou via JSON Body
    const body = await request.json().catch(() => ({}));
    const type = url.searchParams.get('type') || url.searchParams.get('topic') || body?.type;
    const id = url.searchParams.get('data.id') || body?.data?.id || url.searchParams.get('id') || body?.id;

    console.log(`[Webhook] Tipo: ${type}, ID: ${id}`);

    // Se não for um evento de pagamento, ignoramos mas retornamos 200 (exigência do MP)
    if (type !== 'payment' || !id) {
       return new Response('OK', { status: 200 });
    }

    if (!env.MP_ACCESS_TOKEN) {
      console.error('[Webhook] ERRO: MP_ACCESS_TOKEN não configurado nas variáveis de ambiente');
      return new Response('Internal Error', { status: 500 });
    }

    // 2. Consultar o status real do pagamento na API do Mercado Pago
    const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${id}`, {
      headers: {
        'Authorization': `Bearer ${env.MP_ACCESS_TOKEN}`
      }
    });

    if (!mpRes.ok) {
       const errTxt = await mpRes.text();
       console.error(`[Webhook] Erro ao consultar pagamento ${id}:`, errTxt);
       return new Response('MP API Error', { status: 500 });
    }

    const paymentData: any = await mpRes.json();
    console.log(`[Webhook] Status do pagamento ${id}: ${paymentData.status}`);
    
    // 3. Se aprovado, processar os pedidos vinculados
    if (paymentData.status === 'approved') {
      const reference = paymentData.external_reference;

      if (reference) {
        // Suporta IDs únicos ou múltiplos separados por vírgula
        const orderIds = String(reference).includes(',') ? reference.split(',') : [reference];
        console.log(`[Webhook] Processando faturas aprovadas: ${reference}`);

        for (const orderId of orderIds) {
          const trimmedId = orderId.trim();
          if (trimmedId) {
            try {
              // Atualizamos o status e registramos a data do pagamento
              const result = await env.DB.prepare(
                "UPDATE orders SET status = 'paid', paid_at = datetime('now') WHERE id = ?"
              )
              .bind(trimmedId)
              .run();

              if (result.meta.changes > 0) {
                console.log(`[Webhook] Pedido ${trimmedId} movido para PAGO com sucesso.`);
                
                // --- NOTIFICAÇÃO & EMAIL ADMIN ---
                // Busca número do pedido e nome do cliente para a mensagem
                const orderData: any = await env.DB.prepare(`
                    SELECT o.order_number, c.name as client_name 
                    FROM orders o 
                    JOIN clients c ON o.client_id = c.id 
                    WHERE o.id = ?
                `).bind(trimmedId).first();

                if (orderData) {
                    const formattedOrder = String(orderData.order_number).padStart(5,'0');
                    const notifId = crypto.randomUUID();
                    
                    // 1. Notificação Interna
                    await env.DB.prepare(
                        "INSERT INTO notifications (id, target_role, type, title, message, created_at) VALUES (?, 'admin', 'success', 'Pagamento Confirmado', ?, ?)"
                    ).bind(
                        notifId,
                        `O pedido #${formattedOrder} de ${orderData.client_name} foi pago.`,
                        new Date().toISOString()
                    ).run();

                    // 2. E-mail para o Admin
                    await sendEmail(env, {
                        to: [getAdminEmail(env)],
                        subject: `Pagamento Confirmado #${formattedOrder}`,
                        html: templates.paymentConfirmedAdmin(formattedOrder, orderData.client_name)
                    });
                }

              } else {
                console.warn(`[Webhook] Pedido ${trimmedId} não encontrado no banco ou já estava pago.`);
              }
            } catch (dbError: any) {
              console.error(`[Webhook] Falha ao atualizar pedido ${trimmedId} no banco:`, dbError.message);
            }
          }
        }
      } else {
        console.warn(`[Webhook] Pagamento ${id} aprovado, mas sem external_reference.`);
      }
    }

    // Sempre responder 200 para evitar retentativas infinitas do Mercado Pago
    return new Response('OK', { status: 200 });

  } catch (e: any) {
    console.error('[Webhook] Erro Crítico:', e.message);
    // Retornamos 500 para o MP tentar novamente mais tarde se for um erro temporário de código
    return new Response(e.message, { status: 500 });
  }
};
