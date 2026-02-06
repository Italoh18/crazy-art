
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
  
  console.log(`[Webhook] Notificação recebida em ${nowTs}: ${url.search}`);

  try {
    const body = await request.json().catch(() => ({}));
    
    // Captura o tipo da notificação (IPN ou Webhook)
    const type = url.searchParams.get('type') || url.searchParams.get('topic') || body?.type || body?.topic;
    
    // Captura o ID do recurso (pagamento)
    const id = url.searchParams.get('data.id') || body?.data?.id || url.searchParams.get('id') || body?.id;

    if (type !== 'payment' || !id) {
       console.log(`[Webhook] Ignorando notificação do tipo: ${type}`);
       return new Response('OK', { status: 200 });
    }

    if (!env.MP_ACCESS_TOKEN) {
      console.error('[Webhook] ERRO CRÍTICO: MP_ACCESS_TOKEN não configurado.');
      return new Response('Internal Error', { status: 500 });
    }

    const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${id}`, {
      headers: {
        'Authorization': `Bearer ${env.MP_ACCESS_TOKEN}`
      }
    });

    if (!mpRes.ok) {
       console.error(`[Webhook] Erro ao consultar pagamento no MP.`);
       return new Response('MP API Error', { status: 500 });
    }

    const paymentData: any = await mpRes.json();
    
    if (paymentData.status === 'approved' || paymentData.status === 'authorized') {
      const reference = paymentData.external_reference;

      if (reference) {
        let orderIds: string[] = [];

        // 1. TENTA BUSCAR NO BANCO DE LOTES PRIMEIRO
        try {
            const batch: any = await env.DB.prepare(
                "SELECT order_ids FROM payment_batches WHERE id = ?"
            ).bind(reference).first();

            if (batch && batch.order_ids) {
                console.log(`[Webhook] Referência identificada como LOTE: ${reference}`);
                orderIds = batch.order_ids.split(',').map((s: string) => s.trim());
            } else {
                // 2. CASO NÃO SEJA LOTE, TRATA COMO IDs DIRETOS (Retrocompatibilidade)
                orderIds = String(reference).includes(',') ? reference.split(',') : [reference];
            }
        } catch (e) {
            orderIds = String(reference).includes(',') ? reference.split(',') : [reference];
        }

        console.log(`[Webhook] Iniciando baixa para ${orderIds.length} pedidos.`);

        for (const orderId of orderIds) {
          const trimmedId = orderId.trim();
          if (!trimmedId) continue;

          try {
            // Tenta atualizar com e sem paid_at para resiliência
            try {
              await env.DB.prepare("UPDATE orders SET status = 'paid', paid_at = ? WHERE id = ?")
                .bind(nowTs, trimmedId).run();
            } catch {
              await env.DB.prepare("UPDATE orders SET status = 'paid' WHERE id = ?")
                .bind(trimmedId).run();
            }

            // Busca dados do pedido para notificação
            const orderData: any = await env.DB.prepare(`
                SELECT o.order_number, c.name as client_name 
                FROM orders o 
                JOIN clients c ON o.client_id = c.id 
                WHERE o.id = ?
            `).bind(trimmedId).first();

            if (orderData) {
                const formattedOrder = String(orderData.order_number).padStart(5,'0');
                
                // Notificação Admin
                await env.DB.prepare(
                    "INSERT INTO notifications (id, target_role, type, title, message, created_at) VALUES (?, 'admin', 'success', 'Pagamento Confirmado', ?, ?)"
                ).bind(crypto.randomUUID(), `O pedido #${formattedOrder} de ${orderData.client_name} foi pago com sucesso.`, nowTs).run();

                // E-mail Admin
                await sendEmail(env, {
                    to: getAdminEmail(env),
                    subject: `Pagamento Confirmado #${formattedOrder}`,
                    html: templates.paymentConfirmedAdmin(formattedOrder, orderData.client_name)
                });
            }
          } catch (err: any) {
            console.error(`[Webhook] Erro no pedido ${trimmedId}:`, err.message);
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
