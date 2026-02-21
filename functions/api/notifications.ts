
import { Env, getAuth } from './_auth';
import { sendEmail, getAdminEmail, getRenderedTemplate } from '../services/email';

export const onRequest: any = async ({ request, env }: { request: Request, env: Env }) => {
  try {
    const user = await getAuth(request, env);
    if (!user) return new Response(JSON.stringify({ error: 'Não autorizado' }), { status: 401 });

    const url = new URL(request.url);
    const id = url.searchParams.get('id');

    // --- GET: Listar Notificações ---
    if (request.method === 'GET') {
      
      try {
        const now = new Date();
        const nowStr = now.toISOString().split('T')[0];
        
        // 1. VERIFICAÇÃO AUTOMÁTICA DE ATRASOS
        const { results: overdueOrders } = await env.DB.prepare(
          `SELECT 
             o.id, o.order_number, o.client_id, o.description, o.due_date, 
             c.email as client_email, c.name as client_name, c.creditLimit
           FROM orders o 
           JOIN clients c ON o.client_id = c.id
           WHERE o.status = 'open' AND o.due_date < ?`
        ).bind(nowStr).all();

        if (overdueOrders && overdueOrders.length > 0) {
          for (const order of overdueOrders) {
            const refId = `overdue_${order.id}`;
            const formattedOrder = String(order.order_number).padStart(5, '0');
            const dueDate = new Date(order.due_date);
            const dateStr = dueDate.toLocaleDateString();
            
            // --- NOVA LÓGICA: Penalidade Severa Automática (> 30 dias) ---
            const diffTime = now.getTime() - dueDate.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays > 30 && order.creditLimit > 20) {
                // Se deve mais de 30 dias e ainda tem limite alto, corta pra 20
                console.log(`[Auto-Penalty] Cliente ${order.client_name} tem atraso de ${diffDays} dias. Reduzindo limite.`);
                await env.DB.prepare("UPDATE clients SET creditLimit = 20.00 WHERE id = ?").bind(order.client_id).run();
                
                // Notifica a redução
                const penaltyId = `penalty_${order.client_id}_${order.id}`;
                const existingPenalty = await env.DB.prepare("SELECT id FROM notifications WHERE reference_id = ?").bind(penaltyId).first();
                
                if (!existingPenalty) {
                    await env.DB.prepare(`
                        INSERT INTO notifications (id, target_role, user_id, type, title, message, created_at, reference_id, is_read) 
                        VALUES (?, 'client', ?, 'error', 'Limite Reduzido', 'Devido a um atraso superior a 30 dias, seu limite foi reduzido para R$ 20,00.', ?, ?, 0)
                    `).bind(crypto.randomUUID(), order.client_id, new Date().toISOString(), penaltyId).run();
                }
            }
            // -----------------------------------------------------------

            try {
                const existing = await env.DB.prepare("SELECT id FROM notifications WHERE reference_id = ?").bind(refId).first();
                
                if (!existing) {
                  const createdAt = new Date().toISOString();
                  const vars = {
                      customerName: order.client_name,
                      orderNumber: formattedOrder,
                      dueDate: dateStr
                  };
                  
                  // A. Admin (Resend + Template)
                  const notifId = crypto.randomUUID();
                  await env.DB.prepare(
                    "INSERT INTO notifications (id, target_role, type, title, message, created_at, reference_id) VALUES (?, 'admin', 'warning', 'Pedido em Atraso', ?, ?, ?)"
                  ).bind(notifId, `Pedido #${formattedOrder} venceu em ${dateStr}.`, createdAt, refId).run();

                  const emailAdmin = await getRenderedTemplate(env, 'overdueAdmin', vars);
                  await sendEmail(env, {
                    to: getAdminEmail(env),
                    subject: emailAdmin.subject,
                    html: emailAdmin.html
                  });

                  // B. Cliente (Resend + Template)
                  const notifIdClient = crypto.randomUUID();
                  await env.DB.prepare(
                    "INSERT INTO notifications (id, target_role, user_id, type, title, message, created_at, reference_id) VALUES (?, 'client', ?, 'warning', 'Fatura em Atraso', ?, ?, ?)"
                  ).bind(notifIdClient, order.client_id, `Seu pedido #${formattedOrder} está vencido.`, createdAt, refId + '_client').run();

                  if (order.client_email) {
                    const emailClient = await getRenderedTemplate(env, 'overdueClient', vars);
                    await sendEmail(env, {
                      to: order.client_email,
                      subject: emailClient.subject,
                      html: emailClient.html
                    });
                  }
                }
            } catch (innerError) {
                console.error('[Notification Check] Erro ao processar pedido ' + order.id, innerError);
            }
          }
        }

        // 2. VERIFICAÇÃO DE ASSINATURAS EXPIRANDO
        if (user.role === 'client' && user.clientId) {
            const client: any = await env.DB.prepare(
                "SELECT id, name, email, subscription_expires_at FROM clients WHERE id = ? AND is_subscriber = 1"
            ).bind(user.clientId).first();

            if (client && client.subscription_expires_at) {
                const expiresAt = new Date(client.subscription_expires_at);
                const now = new Date();
                const diffTime = expiresAt.getTime() - now.getTime();
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                // Se faltar 2 dias ou menos (28 dias se passaram)
                if (diffDays <= 2 && diffDays > -5) {
                    const refId = `sub_expiring_${client.id}_${client.subscription_expires_at.substring(0, 10)}`;
                    const existing = await env.DB.prepare("SELECT id FROM notifications WHERE reference_id = ?").bind(refId).first();

                    if (!existing) {
                        const message = `Sua assinatura Crazy Art expira em ${diffDays <= 0 ? 'hoje' : diffDays + ' dias'}. Renove agora para manter seus benefícios!`;
                        
                        await env.DB.prepare(`
                            INSERT INTO notifications (id, target_role, user_id, type, title, message, created_at, reference_id, is_read)
                            VALUES (?, 'client', ?, 'warning', 'Assinatura Expirando', ?, ?, ?, 0)
                        `).bind(crypto.randomUUID(), client.id, message, now.toISOString(), refId).run();

                        if (client.email) {
                            const emailData = await getRenderedTemplate(env, 'subscriptionExpiring', {
                                customerName: client.name,
                                daysLeft: diffDays <= 0 ? 'hoje' : diffDays
                            });
                            await sendEmail(env, {
                                to: client.email,
                                subject: emailData.subject,
                                html: emailData.html
                            });
                        }
                    }
                }

                // Se já expirou há mais de 1 dia, desativa
                if (diffDays < 0) {
                    await env.DB.prepare("UPDATE clients SET is_subscriber = 0 WHERE id = ?").bind(client.id).run();
                }
            }
        }

        // 3. BUSCAR NOTIFICAÇÕES REAIS
        let query = "SELECT * FROM notifications WHERE ";
        let params: any[] = [];

        if (user.role === 'admin') {
          query += "target_role = 'admin'";
        } else {
          query += "target_role = 'client' AND user_id = ?";
          params.push(user.clientId || user.userId);
        }

        query += " ORDER BY created_at DESC LIMIT 50";

        const { results } = await env.DB.prepare(query).bind(...params).all();
        return Response.json(results || []);

      } catch (dbError: any) {
        if (dbError.message && dbError.message.includes('no such table')) {
            return Response.json([]);
        }
        throw dbError;
      }
    }

    // --- PUT: Marcar como Lida ---
    if (request.method === 'PUT') {
      if (!id) return new Response(JSON.stringify({ error: 'ID obrigatório' }), { status: 400 });
      
      try {
          if (id === 'all') {
             let updateQuery = "UPDATE notifications SET is_read = 1 WHERE is_read = 0 AND ";
             let updateParams: any[] = [];
             
             if (user.role === 'admin') {
                updateQuery += "target_role = 'admin'";
             } else {
                updateQuery += "target_role = 'client' AND user_id = ?";
                updateParams.push(user.clientId || user.userId);
             }
             await env.DB.prepare(updateQuery).bind(...updateParams).run();
          } else {
             await env.DB.prepare("UPDATE notifications SET is_read = 1 WHERE id = ?").bind(id).run();
          }
          return Response.json({ success: true });
      } catch (dbError: any) {
          throw dbError;
      }
    }

    return new Response(JSON.stringify({ error: 'Método não permitido' }), { status: 405 });

  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
};
