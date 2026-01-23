
import { Env, getAuth } from './_auth';

export const onRequest: any = async ({ request, env }: { request: Request, env: Env }) => {
  try {
    const user = await getAuth(request, env);
    if (!user) return new Response(JSON.stringify({ error: 'Não autorizado' }), { status: 401 });

    const url = new URL(request.url);
    const id = url.searchParams.get('id');

    // --- GET: Listar Notificações ---
    if (request.method === 'GET') {
      
      try {
        // 1. VERIFICAÇÃO AUTOMÁTICA DE ATRASOS (Lazy Check)
        const now = new Date().toISOString().split('T')[0];
        
        // Busca pedidos em aberto e vencidos
        const { results: overdueOrders } = await env.DB.prepare(
          "SELECT id, order_number, client_id, description, due_date FROM orders WHERE status = 'open' AND due_date < ?"
        ).bind(now).all();

        if (overdueOrders && overdueOrders.length > 0) {
          for (const order of overdueOrders) {
            const refId = `overdue_${order.id}`;
            
            // Verifica se já existe notificação para este atraso
            // Try/Catch interno para caso a tabela notifications não exista
            try {
                const existing = await env.DB.prepare("SELECT id FROM notifications WHERE reference_id = ?").bind(refId).first();
                
                if (!existing) {
                  const notifId = crypto.randomUUID();
                  const createdAt = new Date().toISOString();
                  
                  // Notificação para ADMIN
                  await env.DB.prepare(
                    "INSERT INTO notifications (id, target_role, type, title, message, created_at, reference_id) VALUES (?, 'admin', 'warning', 'Pedido em Atraso', ?, ?, ?)"
                  ).bind(notifId, `Pedido #${order.order_number} venceu em ${order.due_date}.`, createdAt, refId).run();

                  // Notificação para CLIENTE
                  const notifIdClient = crypto.randomUUID();
                  await env.DB.prepare(
                    "INSERT INTO notifications (id, target_role, user_id, type, title, message, created_at, reference_id) VALUES (?, 'client', ?, 'warning', 'Fatura em Atraso', ?, ?, ?)"
                  ).bind(notifIdClient, order.client_id, `Seu pedido #${order.order_number} está vencido.`, createdAt, refId + '_client').run();
                }
            } catch (ignore) {
                // Silencia erro se a tabela de notificações ainda não foi criada, para não travar o app
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
        // Se o erro for "no such table", retornamos array vazio para não quebrar a UI
        if (dbError.message && dbError.message.includes('no such table')) {
            console.warn("Tabela de notificações ainda não existe. Retornando vazio.");
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
          if (dbError.message && dbError.message.includes('no such table')) {
             return Response.json({ success: false, error: 'Table not ready' });
          }
          throw dbError;
      }
    }

    return new Response(JSON.stringify({ error: 'Método não permitido' }), { status: 405 });

  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
};
