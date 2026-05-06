
import { Env, getAuth } from './_auth';
import { sendEmail, getAdminEmail, getRenderedTemplate } from '../services/email';
import { sendPushNotification } from '../services/push';

export const onRequest: any = async ({ request, env }: { request: Request, env: Env }) => {
  try {
    // Limpeza automática: Remove notificações com mais de 7 dias para manter o D1 otimizado
    try {
      await env.DB.prepare(
        "DELETE FROM notifications WHERE created_at < datetime('now', '-7 days')"
      ).run();
    } catch (e) {
      console.error('Erro na limpeza de notificações:', e);
    }

    const user = await getAuth(request, env);
    if (!user) return new Response(JSON.stringify({ error: 'Não autorizado' }), { status: 401 });

    const url = new URL(request.url);
    const id = url.searchParams.get('id');

    // --- GET: Retornar Chave Pública VAPID ---
    if (request.method === 'GET' && url.searchParams.get('vapidKey') === 'true') {
      if (!env.VAPID_PUBLIC_KEY) {
        console.error('[Push] Erro: VAPID_PUBLIC_KEY não definida nas variáveis de ambiente do Cloudflare.');
      }
      return Response.json({ publicKey: env.VAPID_PUBLIC_KEY });
    }

    // --- GET: Listar Notificações ---
    if (request.method === 'GET') {
      
      try {
        const now = new Date();
        const nowStr = now.toISOString().split('T')[0];
        
        // 1. VERIFICAÇÃO AUTOMÁTICA DE ATRASOS
        const { results: overdueOrders } = await env.DB.prepare(
          `SELECT 
             o.id, o.order_number, o.client_id, o.description, o.due_date, o.total,
             o.credit_penalty_applied,
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
            
            const diffTime = now.getTime() - dueDate.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            // --- NOVA LÓGICA: Penalidade Automática (> 15 dias) ---
            if (diffDays > 15 && !order.credit_penalty_applied) {
                const penaltyValue = (Number(order.total || 0) / 2);
                const newLimit = Math.max(0, Number(order.creditLimit || 0) - penaltyValue);
                
                console.log(`[Auto-Penalty] Cliente ${order.client_name} tem atraso de ${diffDays} dias no pedido #${formattedOrder}. Reduzindo limite.`);
                
                // 1. Atualiza limite do cliente
                await env.DB.prepare("UPDATE clients SET creditLimit = ? WHERE id = ?").bind(newLimit, order.client_id).run();
                
                // 2. Marca pedido como penalizado
                await env.DB.prepare("UPDATE orders SET credit_penalty_applied = 1 WHERE id = ?").bind(order.id).run();
                
                // 3. Notifica o cliente
                const penaltyNotifId = `penalty_15d_${order.id}`;
                const existingPenalty = await env.DB.prepare("SELECT id FROM notifications WHERE reference_id = ?").bind(penaltyNotifId).first();
                
                if (!existingPenalty) {
                    await env.DB.prepare(`
                        INSERT INTO notifications (id, target_role, user_id, type, title, message, created_at, reference_id, is_read) 
                        VALUES (?, 'client', ?, 'error', 'Limite Reduzido por Atraso', ?, ?, ?, 0)
                    `).bind(
                        crypto.randomUUID(), 
                        order.client_id, 
                        `Seu limite de crédito foi reduzido em R$ ${penaltyValue.toFixed(2)} devido ao atraso superior a 15 dias no pedido #${formattedOrder}.`, 
                        new Date().toISOString(), 
                        penaltyNotifId
                    ).run();
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
                  const adminMessage = `Pedido #${formattedOrder} venceu em ${dateStr}.`;
                  await env.DB.prepare(
                    "INSERT INTO notifications (id, target_role, type, title, message, created_at, reference_id) VALUES (?, 'admin', 'warning', 'Pedido em Atraso', ?, ?, ?)"
                  ).bind(notifId, adminMessage, createdAt, refId).run();

                  // PUSH ADMIN
                  try {
                      const { results: admins } = await env.DB.prepare("SELECT id FROM users WHERE role = 'admin'").all();
                      if (admins) {
                          for (const admin of admins) {
                              await sendPushNotification(env, admin.id, { 
                                  title: 'Pedido em Atraso', 
                                  body: adminMessage, 
                                  url: '/orders' 
                              });
                          }
                      }
                  } catch (pushErr) {
                      console.error('[Push Admin] Erro:', pushErr);
                  }

                  const emailAdmin = await getRenderedTemplate(env, 'overdueAdmin', vars);
                  await sendEmail(env, {
                    to: getAdminEmail(env),
                    subject: emailAdmin.subject,
                    html: emailAdmin.html
                  });

                  // B. Cliente (Resend + Template)
                  const notifIdClient = crypto.randomUUID();
                  const clientMessage = `Seu pedido #${formattedOrder} está vencido.`;
                  await env.DB.prepare(
                    "INSERT INTO notifications (id, target_role, user_id, type, title, message, created_at, reference_id) VALUES (?, 'client', ?, 'warning', 'Fatura em Atraso', ?, ?, ?)"
                  ).bind(notifIdClient, order.client_id, clientMessage, createdAt, refId + '_client').run();

                  // PUSH CLIENTE
                  await sendPushNotification(env, order.client_id, { 
                      title: 'Fatura em Atraso', 
                      body: clientMessage, 
                      url: '/minha-area' 
                  });

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
                "SELECT * FROM clients WHERE id = ? AND is_subscriber = 1"
            ).bind(user.clientId).first();

            const subscriptionExpiresAt = client?.subscription_expires_at || client?.subscriptionExpiresAt;

            if (client && subscriptionExpiresAt) {
                const expiresAt = new Date(subscriptionExpiresAt);
                const now = new Date();
                const diffTime = expiresAt.getTime() - now.getTime();
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                // Se faltar 2 dias ou menos (28 dias se passaram)
                if (diffDays <= 2 && diffDays > -5) {
                    const refId = `sub_expiring_${client.id}_${subscriptionExpiresAt.substring(0, 10)}`;
                    const existing = await env.DB.prepare("SELECT id FROM notifications WHERE reference_id = ?").bind(refId).first();

                    if (!existing) {
                        const message = `Sua assinatura Crazy Art expira em ${diffDays <= 0 ? 'hoje' : diffDays + ' dias'}. Renove agora para manter seus benefícios!`;
                        
                        await env.DB.prepare(`
                            INSERT INTO notifications (id, target_role, user_id, type, title, message, created_at, reference_id, is_read)
                            VALUES (?, 'client', ?, 'warning', 'Assinatura Expirando', ?, ?, ?, 0)
                        `).bind(crypto.randomUUID(), client.id, message, now.toISOString(), refId).run();

                        // PUSH CLIENTE (Assinatura)
                        await sendPushNotification(env, client.id, { 
                            title: 'Assinatura Expirando', 
                            body: message, 
                            url: '/minha-area' 
                        });

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
             // Verificação de Segurança: Garante que só altera se for dono da notificação
             if (user.role === 'admin') {
                await env.DB.prepare("UPDATE notifications SET is_read = 1 WHERE id = ? AND target_role = 'admin'").bind(id).run();
             } else {
                await env.DB.prepare("UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?").bind(id, user.clientId || user.userId).run();
             }
          }
          return Response.json({ success: true });
      } catch (dbError: any) {
          throw dbError;
      }
    }

    // --- POST: Salvar Inscrição Push ---
    if (request.method === 'POST') {
      try {
        const body: any = await request.json();
        const { subscription } = body;

        if (!subscription || !subscription.endpoint) {
          return new Response(JSON.stringify({ error: 'Inscrição ou Endpoint inválido' }), { status: 400 });
        }

        const userId = user.clientId || user.userId || (user.role === 'admin' ? 'admin' : null);
        if (!userId) {
          return new Response(JSON.stringify({ error: 'Usuário sem ID válido para vinculação' }), { status: 400 });
        }

        // Usamos o endpoint como ID (limlimited para 128 caracteres para segurança) para evitar duplicatas por dispositivo
        // Se já existir esse endpoint para esse usuário, o INSERT OR REPLACE atualizará o JSON (útil se as chaves mudarem)
        await env.DB.prepare(`
          INSERT OR REPLACE INTO push_subscriptions (id, user_id, subscription_json, created_at)
          VALUES (?, ?, ?, datetime('now'))
        `).bind(
          subscription.endpoint.slice(-100), // Usar o final do endpoint como ID é seguro e único o suficiente
          userId,
          JSON.stringify(subscription)
        ).run();

        return Response.json({ success: true });
      } catch (postError: any) {
        console.error('[Push Save Error]:', postError.message);
        return new Response(JSON.stringify({ error: `Erro ao salvar no banco: ${postError.message}` }), { status: 500 });
      }
    }

    return new Response(JSON.stringify({ error: 'Método não permitido' }), { status: 405 });

  } catch (e: any) {
    console.error("Erro crítico na API de Notificações:", e.message);
    return new Response(JSON.stringify({ error: `Erro interno: ${e.message}` }), { status: 500 });
  }
};
