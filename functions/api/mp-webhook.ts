
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
        if (reference.startsWith('LAYOUT_')) {
          const requestId = reference.replace('LAYOUT_', '');
          
          const layout: any = await env.DB.prepare(`
              SELECT lr.*, c.name, c.email, c.phone 
              FROM layout_requests lr 
              JOIN clients c ON lr.client_id = c.id 
              WHERE lr.id = ?
          `).bind(requestId).first();

          if (layout && layout.payment_status !== 'paid') {
            await env.DB.prepare(
              "UPDATE layout_requests SET payment_status = 'paid', order_status = 'open' WHERE id = ?"
            ).bind(requestId).run();

            const isMolde = layout.request_type === 'montagem_molde';
            const label = isMolde ? 'Montagem de Molde' : 'Layout Simples';

            // Criar Pedido na Tabela Global de Pedidos (Para aparecer na listagem principal)
            const { results: maxResults } = await env.DB.prepare('SELECT MAX(order_number) as last FROM orders').all();
            const lastNum = (maxResults as any)[0]?.last;
            const nextOrderNumber = (Number(lastNum) || 0) + 1;

            const orderId = crypto.randomUUID();
            await env.DB.prepare(`
                INSERT INTO orders (id, order_number, client_id, description, order_date, due_date, total, total_cost, status, created_at, source, production_step, is_confirmed, payment_method, paid_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
            `).bind(
                orderId,
                nextOrderNumber,
                layout.client_id,
                `${label}: ${layout.description.substring(0, 50)}...`,
                new Date().toISOString().split('T')[0],
                new Date().toISOString().split('T')[0],
                layout.value,
                0,
                'paid',
                new Date().toISOString(),
                layout.request_type || 'layout_simples',
                'production',
                'mercadopago',
                new Date().toISOString()
            ).run();

            // Adicionar o item ao pedido
            const itemId = crypto.randomUUID();
            await env.DB.prepare(`
                INSERT INTO order_items (id, order_id, catalog_id, name, type, unit_price, quantity, total, art_link, art_extras_desc)
                VALUES (?, ?, ?, ?, 'service', ?, 1, ?, ?, ?)
            `).bind(
                itemId,
                orderId,
                layout.service_id || 'manual',
                label,
                layout.value,
                layout.value,
                layout.example_url || null,
                layout.description
            ).run();

            // Notify Admin
            const adminEmail = getAdminEmail(env);
            const html = `
                <div style="font-family: sans-serif; max-width: 600px; border: 1px solid #eee; padding: 20px; border-radius: 15px;">
                    <h2 style="color: #10B981; text-transform: uppercase;">💰 Pagamento Confirmado: ${label}</h2>
                    <p>O cliente <strong>${layout.name}</strong> pagou pela solicitação de ${label}.</p>
                    
                    <div style="background: #f9fafb; padding: 15px; border-radius: 10px; margin: 20px 0;">
                        <h3 style="margin-top: 0; font-size: 14px; color: #666;">DADOS DO CLIENTE</h3>
                        <p><strong>Nome:</strong> ${layout.name}</p>
                        <p><strong>E-mail:</strong> ${layout.email}</p>
                        <p><strong>WhatsApp:</strong> ${layout.phone || 'Não informado'}</p>
                    </div>

                    <div style="background: #f9fafb; padding: 15px; border-radius: 10px; margin: 20px 0;">
                        <h3 style="margin-top: 0; font-size: 14px; color: #666;">DETALHES DO BRIEFING</h3>
                        <p style="white-space: pre-wrap;">${layout.description}</p>
                    </div>

                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin: 20px 0;">
                        <div style="background: #f9fafb; padding: 10px; border-radius: 10px; text-align: center;">
                            <p style="font-size: 10px; font-weight: bold; margin-bottom: 5px;">EXEMPLO</p>
                            ${layout.example_url ? `<a href="${layout.example_url}" target="_blank"><img src="${layout.example_url}" style="width: 100%; height: 100px; object-cover; border-radius: 5px;" /></a>` : 'Não enviado'}
                        </div>
                        <div style="background: #f9fafb; padding: 10px; border-radius: 10px; text-align: center;">
                            <p style="font-size: 10px; font-weight: bold; margin-bottom: 5px;">LOGO</p>
                            ${layout.logo_url ? `<a href="${layout.logo_url}" target="_blank"><img src="${layout.logo_url}" style="width: 100%; height: 100px; object-cover; border-radius: 5px;" /></a>` : 'Não enviado'}
                        </div>
                    </div>

                    <div style="border-top: 1px solid #eee; pt: 20px;">
                        <p><strong>ID do Pedido:</strong> ${requestId}</p>
                        <p><strong>Valor:</strong> R$ ${Number(layout.value).toFixed(2)}</p>
                        <p><strong>Pagamento:</strong> MercadoPago (Aprovado)</p>
                        <p><strong>Status:</strong> <span style="color: #10B981;">Aberto</span></p>
                    </div>
                </div>
            `;

            await sendEmail(env, {
                to: adminEmail,
                subject: `[${label}] PAGAMENTO APROVADO - ${layout.name}`,
                html
            });

            // Notificação Cliente
            await env.DB.prepare(`
                INSERT INTO notifications (id, target_role, user_id, type, title, message, created_at, is_read)
                VALUES (?, 'client', ?, 'success', 'Pagamento Confirmado', ?, ?, 0)
            `).bind(crypto.randomUUID(), layout.client_id, `Sua solicitação de ${label.toLowerCase()} foi paga com sucesso e já está em nossa fila de produção.`, nowTs).run();
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
            let bonusApplied = 0;
            let penaltyApplied = 0;

            if (diffDays <= 0) {
                // REGRA 1: Pagamento em dia ou adiantado -> Aumenta metade do valor do pedido
                newLimit = newLimit + (orderTotal / 2);
                creditMessage = `Pagamento pontual! Seu limite de crédito aumentou em R$ ${(orderTotal/2).toFixed(2)}.`;
                bonusApplied = 1;
            } else if (diffDays > 15) {
                // REGRA 2: Pagamento com atraso superior a 15 dias -> Diminui metade do valor do pedido (se ainda não penalizado)
                // Buscamos se já foi penalizado antes
                const alreadyPenalty: any = await env.DB.prepare("SELECT credit_penalty_applied FROM orders WHERE id = ?").bind(orderId).first();
                if (!alreadyPenalty?.credit_penalty_applied) {
                    newLimit = Math.max(0, newLimit - (orderTotal / 2));
                    creditMessage = `Pagamento com atraso (+${diffDays} dias). Seu limite de crédito foi reduzido em R$ ${(orderTotal/2).toFixed(2)}.`;
                    penaltyApplied = 1;
                } else {
                    creditMessage = "Pagamento recebido (penalidade de atraso já havia sido aplicada).";
                }
            } else {
                // Entre 1 e 15 dias de atraso: Mantém o crédito
                creditMessage = "Pagamento recebido.";
            }

            // Atualiza o limite do cliente
            await env.DB.prepare("UPDATE clients SET creditLimit = ? WHERE id = ?")
                .bind(newLimit, orderInfo.client_id).run();

            // 3. Atualiza Pedido para Pago
            // Verifica se possui produtos para mover para produção automaticamente
            const { results: items } = await env.DB.prepare(`
                SELECT type FROM order_items WHERE order_id = ?
            `).bind(orderId).all();
            
            const hasProducts = (items || []).some((i: any) => i.type === 'product');
            const newStatus = hasProducts ? 'production' : 'paid';

            await env.DB.prepare("UPDATE orders SET status = ?, paid_at = ?, payment_method = 'mercadopago', credit_bonus_applied = ?, credit_penalty_applied = ? WHERE id = ?")
                .bind(newStatus, nowTs, bonusApplied, penaltyApplied || (diffDays > 15 ? 1 : 0), orderId).run();
            
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
