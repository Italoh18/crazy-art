
import { sendEmail, getAdminEmail, getRenderedTemplate } from '../services/email';
import { sendPushNotification, notifyAdminsPush } from '../services/push';

export interface Env {
  DB: any;
  MP_ACCESS_TOKEN: string;
  RESEND_API_KEY: string;
  ADMIN_EMAIL?: string;
  VAPID_PUBLIC_KEY?: string;
  VAPID_PRIVATE_KEY?: string;
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
        if (reference.startsWith('LAYOUT_')) {
          const requestId = reference.replace('LAYOUT_', '');
          
          const order: any = await env.DB.prepare(`
              SELECT o.*, c.name, c.email, c.phone 
              FROM orders o
              JOIN clients c ON o.client_id = c.id 
              WHERE o.id = ?
          `).bind(requestId).first();
          
          // Se for uma solicitação de layout e ainda não confirmamos pagamento
          if (order) {
            const { meta } = await env.DB.prepare(
              "UPDATE orders SET payment_status = 'paid', status = 'open', paid_at = ?, payment_method = 'mercadopago' WHERE id = ? AND payment_status != 'paid'"
            ).bind(nowTs, requestId).run();

            // Se o update não alterou nada, significa que já foi pago/processado por outra chamada
            if (meta.changes === 0) {
                return new Response('OK', { status: 200 });
            }

            const isMolde = order.source === 'montagem_molde';
            const label = isMolde ? 'Montagem de Molde' : 'Layout Simples';

            // Notify Admin
            const adminEmail = getAdminEmail(env);
            const html = `
                <div style="font-family: sans-serif; max-width: 600px; border: 1px solid #eee; padding: 20px; border-radius: 15px;">
                    <h2 style="color: #10B981; text-transform: uppercase;">💰 Pagamento Confirmado: ${label}</h2>
                    <p>O cliente <strong>${order.name}</strong> pagou pela solicitação de ${label}.</p>
                    
                    <div style="background: #f9fafb; padding: 15px; border-radius: 10px; margin: 20px 0;">
                        <h3 style="margin-top: 0; font-size: 14px; color: #666;">DADOS DO CLIENTE</h3>
                        <p><strong>Nome:</strong> ${order.name}</p>
                        <p><strong>E-mail:</strong> ${order.email}</p>
                        <p><strong>WhatsApp:</strong> ${order.phone || 'Não informado'}</p>
                    </div>

                    <div style="background: #f9fafb; padding: 15px; border-radius: 10px; margin: 20px 0;">
                        <h3 style="margin-top: 0; font-size: 14px; color: #666;">DETALHES DO BRIEFING</h3>
                        <p style="white-space: pre-wrap;">${order.description}</p>
                    </div>

                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin: 20px 0;">
                        <div style="background: #f9fafb; padding: 10px; border-radius: 10px; text-align: center;">
                            <p style="font-size: 10px; font-weight: bold; margin-bottom: 5px;">EXEMPLO</p>
                            ${order.example_url ? `<a href="${order.example_url}" target="_blank"><img src="${order.example_url}" style="width: 100%; height: 100px; object-cover; border-radius: 5px;" /></a>` : 'Não enviado'}
                        </div>
                        <div style="background: #f9fafb; padding: 10px; border-radius: 10px; text-align: center;">
                            <p style="font-size: 10px; font-weight: bold; margin-bottom: 5px;">LOGO</p>
                            ${order.logo_url ? `<a href="${order.logo_url}" target="_blank"><img src="${order.logo_url}" style="width: 100%; height: 100px; object-cover; border-radius: 5px;" /></a>` : 'Não enviado'}
                        </div>
                    </div>

                    <div style="border-top: 1px solid #eee; pt: 20px;">
                        <p><strong>Número do Pedido:</strong> #${order.order_number}</p>
                        <p><strong>ID Técnico:</strong> ${requestId}</p>
                        <p><strong>Valor:</strong> R$ ${Number(order.total).toFixed(2)}</p>
                        <p><strong>Pagamento:</strong> MercadoPago (Aprovado)</p>
                        <p><strong>Status:</strong> <span style="color: #10B981;">Aberto</span></p>
                    </div>
                </div>
            `;

            await sendEmail(env, {
                to: adminEmail,
                subject: `[${label}] PAGAMENTO APROVADO - ${order.name}`,
                html
            });

            // Notificação Admin (In-App)
            const adminPushMsg = `O cliente ${order.name} pagou a solicitação de ${label.toLowerCase()}.`;
            await env.DB.prepare(`
                INSERT INTO notifications (id, target_role, type, title, message, created_at, reference_id, is_read)
                VALUES (?, 'admin', 'success', ?, ?, ?, ?, 0)
            `).bind(
                crypto.randomUUID(), 
                `Pagamento Confirmado: ${label}`, 
                adminPushMsg, 
                nowTs, 
                requestId
            ).run();

            // PUSH ADMIN
            await notifyAdminsPush(env, { 
                title: `Pagamento: ${label}`, 
                body: adminPushMsg, 
                url: '/orders' 
            });

            // Notificação Cliente
            const clientPushMsg = `Sua solicitação de ${label.toLowerCase()} foi paga com sucesso e já está em nossa fila de produção.`;
            await env.DB.prepare(`
                INSERT INTO notifications (id, target_role, user_id, type, title, message, created_at, is_read)
                VALUES (?, 'client', ?, 'success', 'Pagamento Confirmado', ?, ?, 0)
            `).bind(crypto.randomUUID(), order.client_id, clientPushMsg, nowTs).run();

            // PUSH CLIENTE
            await sendPushNotification(env, order.client_id, {
                title: 'Pagamento Confirmado',
                body: clientPushMsg,
                url: '/minha-area'
            });

          }

          return new Response('OK', { status: 200 });
        }

        if (reference.startsWith('SUB_')) {
          const clientId = reference.replace('SUB_', '');
          const expiresAt = new Date();
          expiresAt.setDate(expiresAt.getDate() + 30); // 30 dias de assinatura
          
          await env.DB.prepare(
            "UPDATE clients SET is_subscriber = 1, subscription_expires_at = ? WHERE id = ?"
          ).bind(expiresAt.toISOString(), clientId).first();

          // Notificação de Assinatura
          const subMsg = 'Sua assinatura Crazy Art foi ativada com sucesso! Aproveite downloads ilimitados.';
          await env.DB.prepare(`
            INSERT INTO notifications (
                id, target_role, user_id, type, title, message, created_at, is_read
            ) VALUES (?, 'client', ?, 'success', 'Assinatura Ativada', ?, ?, 0)
          `).bind(crypto.randomUUID(), clientId, subMsg, nowTs).run();

          // PUSH CLIENTE (Assinatura)
          await sendPushNotification(env, clientId, {
              title: 'Assinatura Ativada',
              body: subMsg,
              url: '/minha-area'
          });

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
                SELECT o.*, 
                       c.id as client_id, c.name as client_name, c.email as client_email, c.creditLimit
                FROM orders o 
                JOIN clients c ON o.client_id = c.id 
                WHERE o.id = ?
            `).bind(orderId).first();

            // Se não achar ou já possuir marcação de pago (ou em produção), pula lógica repetida
            // Pedidos físicos vão para 'production' ao serem pagos, por isso checamos ambos.
            const isAlreadyPaid = orderInfo?.paid_at || orderInfo?.payment_status === 'paid' || orderInfo?.status === 'paid' || orderInfo?.status === 'production';

            if (!orderInfo || isAlreadyPaid) {
                console.log(`[Webhook] Pedido ${orderId} já processado como pago ou não encontrado.`);
                continue;
            }

            // 2. Lógica de Crédito Dinâmico
            const now = new Date();
            const dueDate = new Date(orderInfo.due_date);
            now.setHours(0,0,0,0);
            dueDate.setHours(0,0,0,0);

            const diffTime = now.getTime() - dueDate.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            let newLimit = Number(orderInfo.creditLimit || 0);
            const orderTotal = Number(orderInfo.total || 0);
            let creditMessage = "";
            let bonusApplied = 0;
            let penaltyApplied = 0;

            if (diffDays <= 0) {
                newLimit = newLimit + (orderTotal / 2);
                creditMessage = `Pagamento pontual! Seu limite de crédito aumentou em R$ ${(orderTotal/2).toFixed(2)}.`;
                bonusApplied = 1;
            } else if (diffDays > 15) {
                const alreadyPenalty: any = await env.DB.prepare("SELECT credit_penalty_applied FROM orders WHERE id = ?").bind(orderId).first();
                if (!alreadyPenalty?.credit_penalty_applied) {
                    newLimit = Math.max(0, newLimit - (orderTotal / 2));
                    creditMessage = `Pagamento com atraso (+${diffDays} dias). Seu limite de crédito foi reduzido em R$ ${(orderTotal/2).toFixed(2)}.`;
                    penaltyApplied = 1;
                } else {
                    creditMessage = "Pagamento recebido (penalidade de atraso já havia sido aplicada).";
                }
            } else {
                creditMessage = "Pagamento recebido.";
            }

            // 3. Atualiza Pedido para Pago ATOMICAMENTE
            // Verifica se possui produtos para mover para produção automaticamente
            const { results: items } = await env.DB.prepare(`
                SELECT type, catalog_id, name, download_link FROM order_items WHERE order_id = ?
            `).bind(orderId).all();
            
            const hasProducts = (items || []).some((i: any) => i.type === 'product');
            const newStatus = hasProducts ? 'production' : 'paid';

            const { meta } = await env.DB.prepare("UPDATE orders SET status = ?, paid_at = ?, payment_method = 'mercadopago', credit_bonus_applied = ?, credit_penalty_applied = ? WHERE id = ? AND paid_at IS NULL")
                .bind(newStatus, nowTs, bonusApplied, penaltyApplied || (diffDays > 15 ? 1 : 0), orderId).run();
            
            // Se o update não alterou nada, significa que já foi processado
            if (meta.changes === 0) {
                console.log(`[Webhook] Pedido ${orderId} já processado simultaneamente por outra instância.`);
                continue;
            }

            // Registrar artes compradas de forma robusta e segura
            try {
              const artItems = (items || []).filter((i: any) => i.type === 'art');
              for (const art of artItems) {
                let finalDl = art.download_link;
                if (!finalDl && art.catalog_id && art.catalog_id !== 'manual') {
                  try {
                    const catalogItem: any = await env.DB.prepare('SELECT download_link FROM catalog WHERE id = ?').bind(art.catalog_id).first();
                    if (catalogItem && catalogItem.download_link) {
                      finalDl = catalogItem.download_link;
                    }
                  } catch (catalogErr) {
                    console.error("Error retrieving catalog download link:", catalogErr);
                  }
                }
                await env.DB.prepare(`
                  INSERT OR IGNORE INTO client_purchased_arts (id, client_id, art_id, art_name, download_link, purchased_at)
                  VALUES (?, ?, ?, ?, ?, ?)
                `).bind(
                  crypto.randomUUID(),
                  orderInfo.client_id,
                  String(art.catalog_id || 'manual'),
                  String(art.name || 'Arte Digital'),
                  finalDl ? String(finalDl) : null,
                  nowTs
                ).run();
              }
            } catch (err: any) {
              console.warn("[Webhook] Tabela client_purchased_arts inexistente ou erro ao registrar artes:", err.message);
            }

            // 4. Atualiza o limite do cliente agora que temos certeza que fomos nós que processamos o pagamento
            await env.DB.prepare("UPDATE clients SET creditLimit = ? WHERE id = ?")
                .bind(newLimit, orderInfo.client_id).run();
            
            const formattedNum = String(orderInfo.order_number).padStart(5, '0');
                
            // NOTIFICAÇÃO ADMIN
            const adminNotifMsg = `Pedido #${formattedNum} pago. ${creditMessage}`;
            await env.DB.prepare(`
                INSERT INTO notifications (
                    id, target_role, type, title, message, created_at, reference_id, is_read
                ) VALUES (?, 'admin', 'success', 'Pagamento Recebido', ?, ?, ?, 0)
            `).bind(
                crypto.randomUUID(),
                adminNotifMsg,
                nowTs,
                orderId
            ).run();

            // PUSH ADMIN
            await notifyAdminsPush(env, { 
                title: 'Pagamento Recebido', 
                body: adminNotifMsg, 
                url: '/orders' 
            });

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
            const clientNotifMsg = `Recebemos o pagamento do pedido #${formattedNum}. ${creditMessage} Novo limite: R$ ${newLimit.toFixed(2)}`;
            await env.DB.prepare(`
                INSERT INTO notifications (
                    id, target_role, user_id, type, title, message, created_at, reference_id, is_read
                ) VALUES (?, 'client', ?, 'success', 'Pagamento Confirmado', ?, ?, ?, 0)
            `).bind(
                crypto.randomUUID(),
                orderInfo.client_id,
                clientNotifMsg,
                nowTs,
                orderId
            ).run();

            // PUSH CLIENTE
            await sendPushNotification(env, orderInfo.client_id, {
                title: 'Pagamento Confirmado',
                body: clientNotifMsg,
                url: '/minha-area'
            });
            
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
