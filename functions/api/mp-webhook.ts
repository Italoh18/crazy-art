
import { sendEmail, getAdminEmail } from '../services/email';

export interface Env {
  DB: any;
  MP_ACCESS_TOKEN: string;
  EMAILJS_SERVICE_ID: string;
  EMAILJS_TEMPLATE_ID: string;
  EMAILJS_PUBLIC_KEY: string;
  ADMIN_EMAIL?: string;
}

export const onRequestPost: any = async ({ request, env }: { request: Request, env: Env }) => {
  const url = new URL(request.url);
  console.log(`[Webhook] Notificação recebida: ${url.search}`);

  try {
    const body = await request.json().catch(() => ({}));
    const type = url.searchParams.get('type') || url.searchParams.get('topic') || body?.type;
    const id = url.searchParams.get('data.id') || body?.data?.id || url.searchParams.get('id') || body?.id;

    if (type !== 'payment' || !id) {
       return new Response('OK', { status: 200 });
    }

    if (!env.MP_ACCESS_TOKEN) {
      console.error('[Webhook] ERRO: MP_ACCESS_TOKEN não configurado.');
      return new Response('Internal Error', { status: 500 });
    }

    const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${id}`, {
      headers: {
        'Authorization': `Bearer ${env.MP_ACCESS_TOKEN}`
      }
    });

    if (!mpRes.ok) {
       return new Response('MP API Error', { status: 500 });
    }

    const paymentData: any = await mpRes.json();
    
    if (paymentData.status === 'approved') {
      const reference = paymentData.external_reference;

      if (reference) {
        const orderIds = String(reference).includes(',') ? reference.split(',') : [reference];

        for (const orderId of orderIds) {
          const trimmedId = orderId.trim();
          if (trimmedId) {
            try {
              const result = await env.DB.prepare(
                "UPDATE orders SET status = 'paid', paid_at = datetime('now') WHERE id = ?"
              )
              .bind(trimmedId)
              .run();

              if (result.meta.changes > 0) {
                console.log(`[Webhook] Pedido ${trimmedId} pago.`);
                
                const orderData: any = await env.DB.prepare(`
                    SELECT o.order_number, c.name as client_name 
                    FROM orders o 
                    JOIN clients c ON o.client_id = c.id 
                    WHERE o.id = ?
                `).bind(trimmedId).first();

                if (orderData) {
                    const formattedOrder = String(orderData.order_number).padStart(5,'0');
                    const notifId = crypto.randomUUID();
                    
                    // Notificação Interna
                    await env.DB.prepare(
                        "INSERT INTO notifications (id, target_role, type, title, message, created_at) VALUES (?, 'admin', 'success', 'Pagamento Confirmado', ?, ?)"
                    ).bind(
                        notifId,
                        `O pedido #${formattedOrder} de ${orderData.client_name} foi pago.`,
                        new Date().toISOString()
                    ).run();

                    // E-mail Admin (Via EmailJS)
                    await sendEmail(env, {
                        to: getAdminEmail(env),
                        subject: `Pagamento Confirmado #${formattedOrder}`,
                        title: `Pagamento Aprovado`,
                        message: `O pagamento do pedido #${formattedOrder} de ${orderData.client_name} foi processado com sucesso.`
                    });
                }
              }
            } catch (dbError: any) {
              console.error(`[Webhook] DB Error:`, dbError.message);
            }
          }
        }
      }
    }

    return new Response('OK', { status: 200 });

  } catch (e: any) {
    console.error('[Webhook] Error:', e.message);
    return new Response(e.message, { status: 500 });
  }
};
