
import { sendEmail, getAdminEmail, getRenderedTemplate } from '../services/email';

export interface Env {
  DB: any;
  MP_ACCESS_TOKEN: string;
  RESEND_API_KEY: string;
  ADMIN_EMAIL?: string;
}

export const onRequestPost: any = async ({ request, env }: { request: Request, env: Env }) => {
  const url = new URL(request.url);
  const nowTs = new Date().toISOString();
  
  console.log(`[Webhook] Recebido: ${url.search}`);

  try {
    const body = await request.json().catch(() => ({}));
    const type = url.searchParams.get('type') || body?.type || body?.topic;
    const id = url.searchParams.get('data.id') || body?.data?.id || url.searchParams.get('id') || body?.id;

    if (type !== 'payment' || !id) {
       return new Response('OK', { status: 200 });
    }

    const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${id}`, {
      headers: { 'Authorization': `Bearer ${env.MP_ACCESS_TOKEN}` }
    });

    if (!mpRes.ok) return new Response('MP API Error', { status: 500 });

    const paymentData: any = await mpRes.json();
    
    if (paymentData.status === 'approved' || paymentData.status === 'authorized') {
      const reference = paymentData.external_reference;

      if (reference) {
        let orderIds: string[] = [];

        try {
            const batch: any = await env.DB.prepare(
                "SELECT order_ids FROM payment_batches WHERE id = ?"
            ).bind(reference).first();

            if (batch && batch.order_ids) {
                orderIds = batch.order_ids.split(',').map((s: string) => s.trim());
            } else {
                orderIds = [reference];
            }
        } catch (e) {
            orderIds = [reference];
        }

        for (const orderId of orderIds) {
          if (!orderId) continue;

          try {
            await env.DB.prepare("UPDATE orders SET status = 'paid', paid_at = ? WHERE id = ?")
                .bind(nowTs, orderId).run();
            
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

                // EMAIL ADMIN (DINÂMICO)
                const emailAdmin = await getRenderedTemplate(env, 'paymentConfirmedAdmin', {
                    orderNumber: formattedNum,
                    customerName: orderInfo.client_name
                });
                await sendEmail(env, {
                    to: getAdminEmail(env),
                    subject: emailAdmin.subject,
                    html: emailAdmin.html
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
            }
          } catch (err: any) {
            console.error(`[Webhook] Erro processando ID ${orderId}:`, err.message);
          }
        }
      }
    }

    return new Response('OK', { status: 200 });
  } catch (e: any) {
    return new Response('OK', { status: 200 }); 
  }
};
