
import { Env, getAuth } from './_auth';
import { sendEmail, getAdminEmail, templates } from '../services/email';

export const onRequest: any = async ({ request, env }: { request: Request, env: Env }) => {
  try {
    const user = await getAuth(request, env);
    if (!user) return new Response(JSON.stringify({ error: 'Não autorizado' }), { status: 401 });

    const url = new URL(request.url);
    const id = url.searchParams.get('id');

    // --- GET: Listar Notificações ---
    if (request.method === 'GET') {
      
      try {
        // 1. VERIFICAÇÃO AUTOMÁTICA DE ATRASOS
        const now = new Date().toISOString().split('T')[0];
        
        const { results: overdueOrders } = await env.DB.prepare(
          `SELECT 
             o.id, o.order_number, o.client_id, o.description, o.due_date, 
             c.email as client_email, c.name as client_name 
           FROM orders o 
           JOIN clients c ON o.client_id = c.id
           WHERE o.status = 'open' AND o.due_date < ?`
        ).bind(now).all();

        if (overdueOrders && overdueOrders.length > 0) {
          for (const order of overdueOrders) {
            const refId = `overdue_${order.id}`;
            const formattedOrder = String(order.order_number).padStart(5, '0');
            
            try {
                const existing = await env.DB.prepare("SELECT id FROM notifications WHERE reference_id = ?").bind(refId).first();
                
                if (!existing) {
                  const createdAt = new Date().toISOString();
                  
                  // A. Admin (Resend)
                  const notifId = crypto.randomUUID();
                  await env.DB.prepare(
                    "INSERT INTO notifications (id, target_role, type, title, message, created_at, reference_id) VALUES (?, 'admin', 'warning', 'Pedido em Atraso', ?, ?, ?)"
                  ).bind(notifId, `Pedido #${formattedOrder} venceu em ${order.due_date}.`, createdAt, refId).run();

                  await sendEmail(env, {
                    to: getAdminEmail(env),
                    subject: `ATRASO: Pedido #${formattedOrder}`,
                    html: templates.overdueAdmin(order.client_name, formattedOrder, order.due_date)
                  });

                  // B. Cliente (Resend)
                  const notifIdClient = crypto.randomUUID();
                  await env.DB.prepare(
                    "INSERT INTO notifications (id, target_role, user_id, type, title, message, created_at, reference_id) VALUES (?, 'client', ?, 'warning', 'Fatura em Atraso', ?, ?, ?)"
                  ).bind(notifIdClient, order.client_id, `Seu pedido #${formattedOrder} está vencido.`, createdAt, refId + '_client').run();

                  if (order.client_email) {
                    await sendEmail(env, {
                      to: order.client_email,
                      subject: `Pendência: Pedido #${formattedOrder}`,
                      html: templates.overdueClient(order.client_name, formattedOrder, order.due_date)
                    });
                  }
                }
            } catch (innerError) {
                console.error('[Notification Check] Erro ao processar pedido ' + order.id, innerError);
            }
          }
        }

        // 2. BUSCAR NOTIFICAÇÕES REAIS
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
