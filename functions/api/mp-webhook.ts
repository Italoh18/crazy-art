
import { sendEmail, getAdminEmail, templates } from '../services/email';

export interface Env {
  DB: any;
  MP_ACCESS_TOKEN: string;
  RESEND_API_KEY: string;
  ADMIN_EMAIL?: string;
}

export const onRequestPost: any = async ({ request, env }: { request: Request, env: Env }) => {
  const url = new URL(request.url);
  const nowTs = new Date().toISOString();
  
  // LOGS CRÍTICOS: Veja isso no painel da Cloudflare (Workers & Pages > Logs)
  console.log(`[Webhook] Recebido: ${url.search}`);

  try {
    const body = await request.json().catch(() => ({}));
    console.log(`[Webhook] Body ID: ${body?.data?.id || body?.id}, Type: ${body?.type}`);
    
    // 1. Identifica o ID do pagamento
    const type = url.searchParams.get('type') || body?.type || body?.topic;
    const id = url.searchParams.get('data.id') || body?.data?.id || url.searchParams.get('id') || body?.id;

    if (type !== 'payment' || !id) {
       console.log("[Webhook] Ignorado (não é pagamento ou sem ID)");
       return new Response('OK', { status: 200 });
    }

    // 2. Consulta o status no Mercado Pago
    const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${id}`, {
      headers: { 'Authorization': `Bearer ${env.MP_ACCESS_TOKEN}` }
    });

    if (!mpRes.ok) {
        console.error(`[Webhook] Erro MP: ${mpRes.status}`);
        return new Response('MP API Error', { status: 500 });
    }

    const paymentData: any = await mpRes.json();
    console.log(`[Webhook] Status MP: ${paymentData.status}, Ref: ${paymentData.external_reference}`);
    
    if (paymentData.status === 'approved' || paymentData.status === 'authorized') {
      const reference = paymentData.external_reference;

      if (reference) {
        let orderIds: string[] = [];

        // Tenta buscar como Lote
        try {
            const batch: any = await env.DB.prepare(
                "SELECT order_ids FROM payment_batches WHERE id = ?"
            ).bind(reference).first();

            if (batch && batch.order_ids) {
                console.log("[Webhook] Lote encontrado");
                orderIds = batch.order_ids.split(',').map((s: string) => s.trim());
            } else {
                console.log("[Webhook] Lote não encontrado, assumindo Pedido Único");
                orderIds = [reference];
            }
        } catch (e) {
            orderIds = [reference];
        }

        console.log(`[Webhook] Processando IDs: ${JSON.stringify(orderIds)}`);

        for (const orderId of orderIds) {
          if (!orderId) continue;

          try {
            // 1. Tenta atualizar
            const updateRes = await env.DB.prepare("UPDATE orders SET status = 'paid', paid_at = ? WHERE id = ?")
                .bind(nowTs, orderId).run();
            
            console.log(`[Webhook] Update Pedido ${orderId}: Success=${updateRes.success}`);

            // 2. Busca dados para notificar
            const orderInfo: any = await env.DB.prepare(`
                SELECT o.order_number, c.name as client_name, c.id as client_id, c.email as client_email
                FROM orders o 
                JOIN clients c ON o.client_id = c.id 
                WHERE o.id = ?
            `).bind(orderId).first();

            if (orderInfo) {
                const formattedNum = String(orderInfo.order_number).padStart(5, '0');
                
                // NOTIFICAÇÃO ADMIN
                await env.DB.prepare(`
                    INSERT INTO notifications (
                        id, target_role, type, title, message, created_at, reference_id, is_read
                    ) VALUES (?, 'admin', 'success', 'Pagamento Recebido', ?, ?, ?, 0)
                `).bind(
                    crypto.randomUUID(),
                    `O pedido #${formattedNum} (${orderInfo.client_name}) foi pago.`,
                    nowTs,
                    orderId
                ).run();
                console.log("[Webhook] Notificação Admin criada");

                // EMAIL ADMIN
                await sendEmail(env, {
                    to: getAdminEmail(env),
                    subject: `Pagamento Confirmado #${formattedNum}`,
                    html: templates.paymentConfirmedAdmin(formattedNum, orderInfo.client_name)
                });

                // NOTIFICAÇÃO CLIENTE
                await env.DB.prepare(`
                    INSERT INTO notifications (
                        id, target_role, user_id, type, title, message, created_at, reference_id, is_read
                    ) VALUES (?, 'client', ?, 'success', 'Pagamento Confirmado', ?, ?, ?, 0)
                `).bind(
                    crypto.randomUUID(),
                    orderInfo.client_id,
                    `Recebemos o pagamento do seu pedido #${formattedNum}. Obrigado!`,
                    nowTs,
                    orderId
                ).run();
            } else {
                console.error(`[Webhook] Pedido ${orderId} não encontrado no banco para notificação.`);
            }
          } catch (err: any) {
            console.error(`[Webhook] Erro processando ID ${orderId}:`, err.message);
          }
        }
      }
    }

    return new Response('OK', { status: 200 });
  } catch (e: any) {
    console.error('[Webhook] Erro Fatal:', e.message);
    return new Response('OK', { status: 200 }); 
  }
};
