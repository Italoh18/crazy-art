
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
        if (reference.startsWith('SUB_')) {
          const clientId = reference.replace('SUB_', '');
          const expiresAt = new Date();
          expiresAt.setDate(expiresAt.getDate() + 30); // 30 dias de assinatura
          
          await env.DB.prepare(
            "UPDATE clients SET is_subscriber = 1, subscription_expires_at = ? WHERE id = ?"
          ).bind(expiresAt.toISOString(), clientId).first();

          // Notificação de Assinatura
          await env.DB.prepare(`
            INSERT INTO notifications (
                id, target_role, user_id, type, title, message, created_at, is_read
            ) VALUES (?, 'client', ?, 'success', 'Assinatura Ativada', 'Sua assinatura Crazy Art foi ativada com sucesso! Aproveite downloads ilimitados.', ?, 0)
          `).bind(crypto.randomUUID(), clientId, nowTs).run();

          return new Response('OK', { status: 200 });
        }

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
            // 1. Buscar dados do pedido e cliente ANTES de atualizar status
            const orderInfo: any = await env.DB.prepare(`
                SELECT o.status, o.total, o.due_date, o.order_number, 
                       c.id as client_id, c.name as client_name, c.email as client_email, c.creditLimit
                FROM orders o 
                JOIN clients c ON o.client_id = c.id 
                WHERE o.id = ?
            `).bind(orderId).first();

            // Se não achar ou já estiver pago, pula lógica de crédito
            if (!orderInfo || orderInfo.status === 'paid') {
                console.log(`[Webhook] Pedido ${orderId} já pago ou não encontrado.`);
                continue;
            }

            // 2. Lógica de Crédito Dinâmico
            const now = new Date();
            const dueDate = new Date(orderInfo.due_date);
            // Zera as horas para comparar apenas datas
            now.setHours(0,0,0,0);
            dueDate.setHours(0,0,0,0);

            const diffTime = now.getTime() - dueDate.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            let newLimit = Number(orderInfo.creditLimit || 0);
            const orderTotal = Number(orderInfo.total || 0);
            let creditMessage = "";

            if (diffDays > 30) {
                // REGRA 3: Atraso > 30 dias -> Crédito cai para R$ 20,00
                newLimit = 20.00;
                creditMessage = "Devido ao atraso superior a 30 dias, seu limite de crédito foi reajustado para R$ 20,00.";
            } else if (diffDays > 5) {
                // REGRA 2: Atraso > 5 dias -> Diminui metade do valor do pedido
                newLimit = Math.max(0, newLimit - (orderTotal / 2));
                creditMessage = `Pagamento com atraso (+${diffDays} dias). Seu limite de crédito foi reduzido em R$ ${(orderTotal/2).toFixed(2)}.`;
            } else if (diffDays <= 0) {
                // REGRA 1: Pagamento em dia ou adiantado -> Aumenta metade do valor do pedido
                newLimit = newLimit + (orderTotal / 2);
                creditMessage = `Pagamento pontual! Seu limite de crédito aumentou em R$ ${(orderTotal/2).toFixed(2)}.`;
            } else {
                // Entre 1 e 5 dias de atraso: Mantém o crédito (sem penalidade, sem bônus)
                creditMessage = "Pagamento recebido.";
            }

            // Atualiza o limite do cliente
            await env.DB.prepare("UPDATE clients SET creditLimit = ? WHERE id = ?")
                .bind(newLimit, orderInfo.client_id).run();

            // 3. Atualiza Pedido para Pago
            await env.DB.prepare("UPDATE orders SET status = 'paid', paid_at = ? WHERE id = ?")
                .bind(nowTs, orderId).run();
            
            const formattedNum = String(orderInfo.order_number).padStart(5, '0');
                
            // NOTIFICAÇÃO ADMIN
            await env.DB.prepare(`
                INSERT INTO notifications (
                    id, target_role, type, title, message, created_at, reference_id, is_read
                ) VALUES (?, 'admin', 'success', 'Pagamento Recebido', ?, ?, ?, 0)
            `).bind(
                crypto.randomUUID(),
                `Pedido #${formattedNum} pago. ${creditMessage}`,
                nowTs,
                orderId
            ).run();

            // EMAIL ADMIN
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
                `Recebemos o pagamento do pedido #${formattedNum}. ${creditMessage} Novo limite: R$ ${newLimit.toFixed(2)}`,
                nowTs,
                orderId
            ).run();
            
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
