
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
  
  // Log para monitoramento no painel da Cloudflare
  console.log(`[Webhook MP] Processando notificação: ${url.search}`);

  try {
    const body = await request.json().catch(() => ({}));
    
    // 1. Identifica o ID do pagamento e o tipo
    const type = url.searchParams.get('type') || body?.type || body?.topic;
    const id = url.searchParams.get('data.id') || body?.data?.id || url.searchParams.get('id') || body?.id;

    if (type !== 'payment' || !id) {
       return new Response('OK', { status: 200 });
    }

    // 2. Consulta o status real do pagamento no Mercado Pago
    const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${id}`, {
      headers: { 'Authorization': `Bearer ${env.MP_ACCESS_TOKEN}` }
    });

    if (!mpRes.ok) return new Response('Erro ao consultar MP', { status: 500 });

    const paymentData: any = await mpRes.json();
    
    // 3. Se estiver aprovado, damos baixa nos pedidos
    if (paymentData.status === 'approved' || paymentData.status === 'authorized') {
      const reference = paymentData.external_reference; // Aqui está o nosso ID de Lote ou ID do Pedido

      if (reference) {
        let orderIds: string[] = [];

        // Verifica se a referência é um Lote no banco de dados
        try {
            const batch: any = await env.DB.prepare(
                "SELECT order_ids FROM payment_batches WHERE id = ?"
            ).bind(reference).first();

            if (batch && batch.order_ids) {
                // É um lote com múltiplos pedidos
                orderIds = batch.order_ids.split(',').map((s: string) => s.trim());
            } else {
                // É um pagamento de pedido único (retrocompatibilidade)
                orderIds = [reference];
            }
        } catch (e) {
            orderIds = [reference];
        }

        // 4. Processa cada pedido do lote
        for (const orderId of orderIds) {
          if (!orderId) continue;

          try {
            // Marcar pedido como pago
            await env.DB.prepare("UPDATE orders SET status = 'paid', paid_at = ? WHERE id = ?")
                .bind(nowTs, orderId).run();

            // Buscar dados para a notificação (Número do pedido e nome do cliente)
            const orderInfo: any = await env.DB.prepare(`
                SELECT o.order_number, c.name as client_name, c.id as client_id
                FROM orders o 
                JOIN clients c ON o.client_id = c.id 
                WHERE o.id = ?
            `).bind(orderId).first();

            if (orderInfo) {
                const formattedNum = String(orderInfo.order_number).padStart(5, '0');
                
                // --- GRAVAR NOTIFICAÇÃO PARA O ADMIN (Aparecerá no sininho do painel) ---
                await env.DB.prepare(`
                    INSERT INTO notifications (
                        id, target_role, type, title, message, created_at, reference_id, is_read
                    ) VALUES (?, 'admin', 'success', 'Pagamento Recebido', ?, ?, ?, 0)
                `).bind(
                    crypto.randomUUID(),
                    `O pedido #${formattedNum} (${orderInfo.client_name}) foi pago com sucesso via Mercado Pago.`,
                    nowTs,
                    orderId // Guardamos o ID do pedido para o Admin clicar e abrir
                ).run();

                // --- Enviar E-mail de aviso para o Admin ---
                await sendEmail(env, {
                    to: getAdminEmail(env),
                    subject: `Pagamento Confirmado #${formattedNum}`,
                    html: templates.paymentConfirmedAdmin(formattedNum, orderInfo.client_name)
                });

                // --- Notificar o Cliente também (Opcional) ---
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
            console.error(`[Webhook] Erro ao processar pedido ${orderId}:`, err.message);
          }
        }
      }
    }

    return new Response('OK', { status: 200 });
  } catch (e: any) {
    console.error('[Webhook] Erro fatal:', e.message);
    return new Response('OK', { status: 200 }); 
  }
};
