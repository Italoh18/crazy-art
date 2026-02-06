
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

    console.log(`[Webhook] Processando - Tipo: ${type}, ID do Recurso: ${id}`);

    // Só processamos se for um pagamento
    if (type !== 'payment' || !id) {
       console.log(`[Webhook] Ignorando notificação do tipo: ${type}`);
       return new Response('OK', { status: 200 });
    }

    if (!env.MP_ACCESS_TOKEN) {
      console.error('[Webhook] ERRO CRÍTICO: MP_ACCESS_TOKEN não configurado nas variáveis de ambiente.');
      return new Response('Internal Error', { status: 500 });
    }

    // Busca os detalhes do pagamento no Mercado Pago para garantir veracidade
    const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${id}`, {
      headers: {
        'Authorization': `Bearer ${env.MP_ACCESS_TOKEN}`
      }
    });

    if (!mpRes.ok) {
       const errTxt = await mpRes.text();
       console.error(`[Webhook] Erro ao consultar pagamento no MP: ${errTxt}`);
       return new Response('MP API Error', { status: 500 });
    }

    const paymentData: any = await mpRes.json();
    console.log(`[Webhook] Status do pagamento ${id}: ${paymentData.status}`);
    
    // Verificamos se o pagamento foi aprovado
    if (paymentData.status === 'approved' || paymentData.status === 'authorized') {
      const reference = paymentData.external_reference;

      if (reference) {
        // O external_reference pode conter múltiplos IDs separados por vírgula
        const orderIds = String(reference).includes(',') ? reference.split(',') : [reference];
        console.log(`[Webhook] IDs de pedidos identificados na referência: ${reference}`);

        for (const orderId of orderIds) {
          const trimmedId = orderId.trim();
          if (!trimmedId) continue;

          try {
            // TENTATIVA 1: Atualizar com paid_at (ideal)
            try {
              const res = await env.DB.prepare(
                "UPDATE orders SET status = 'paid', paid_at = ? WHERE id = ?"
              )
              .bind(nowTs, trimmedId)
              .run();

              if (res.meta.changes > 0) {
                console.log(`[Webhook] Pedido ${trimmedId} atualizado para PAGO (com data).`);
              } else {
                console.warn(`[Webhook] Pedido ${trimmedId} não encontrado no banco ou já estava pago.`);
                continue; // Não notifica se não alterou nada
              }
            } catch (dbErr: any) {
              // TENTATIVA 2: Fallback se a coluna paid_at não existir
              console.warn(`[Webhook] Falha ao atualizar paid_at (coluna pode não existir). Tentando apenas status...`);
              const resSimple = await env.DB.prepare(
                "UPDATE orders SET status = 'paid' WHERE id = ?"
              )
              .bind(trimmedId)
              .run();
              
              if (resSimple.meta.changes === 0) continue;
              console.log(`[Webhook] Pedido ${trimmedId} atualizado para PAGO (apenas status).`);
            }

            // NOTIFICAÇÕES (Somente se o banco foi atualizado com sucesso)
            const orderData: any = await env.DB.prepare(`
                SELECT o.order_number, c.name as client_name 
                FROM orders o 
                JOIN clients c ON o.client_id = c.id 
                WHERE o.id = ?
            `).bind(trimmedId).first();

            if (orderData) {
                const formattedOrder = String(orderData.order_number).padStart(5,'0');
                const notifId = crypto.randomUUID();
                
                // Grava notificação interna para o Admin
                await env.DB.prepare(
                    "INSERT INTO notifications (id, target_role, type, title, message, created_at) VALUES (?, 'admin', 'success', 'Pagamento Confirmado', ?, ?)"
                ).bind(
                    notifId,
                    `O pedido #${formattedOrder} de ${orderData.client_name} foi pago com sucesso via Mercado Pago.`,
                    nowTs
                ).run();

                // Envia E-mail para o Admin
                await sendEmail(env, {
                    to: getAdminEmail(env),
                    subject: `Pagamento Confirmado #${formattedOrder}`,
                    html: templates.paymentConfirmedAdmin(formattedOrder, orderData.client_name)
                });
            }
          } catch (orderLoopError: any) {
            console.error(`[Webhook] Erro ao processar pedido individual ${trimmedId}:`, orderLoopError.message);
          }
        }
      } else {
        console.warn(`[Webhook] Pagamento ${id} aprovado, mas sem external_reference.`);
      }
    }

    return new Response('OK', { status: 200 });

  } catch (e: any) {
    console.error('[Webhook] Erro Fatal no processamento:', e.message);
    // Retornamos 200 mesmo no erro para o MP parar de tentar se for erro de lógica, 
    // mas em um sistema real você pode querer retornar 500 para retry.
    return new Response('OK', { status: 200 }); 
  }
};
