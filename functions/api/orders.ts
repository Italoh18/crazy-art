
import { Env, getAuth } from './_auth';
import { sendEmail, getAdminEmail, templates } from '../services/email';

export const onRequest: any = async ({ request, env }: { request: Request, env: Env }) => {
  try {
    const user = await getAuth(request, env);
    if (!user) return new Response(JSON.stringify({ error: 'Não autorizado' }), { status: 401 });

    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    const clientIdParam = url.searchParams.get('clientId');

    // GET /api/orders
    if (request.method === 'GET') {
      if (id) {
        const order: any = await env.DB.prepare('SELECT * FROM orders WHERE id = ?').bind(id).first();
        if (!order) return new Response(JSON.stringify({ error: 'Pedido não encontrado' }), { status: 404 });
        
        const { results: items } = await env.DB.prepare('SELECT * FROM order_items WHERE order_id = ?').bind(id).all();
        
        return Response.json({
          ...order,
          items: items || [],
          formattedOrderNumber: String(order.order_number || 0).padStart(5, '0')
        });
      }

      let query = `
        SELECT o.*, c.name as client_name 
        FROM orders o 
        LEFT JOIN clients c ON o.client_id = c.id
      `;
      let params: any[] = [];
      
      if (clientIdParam && clientIdParam !== 'undefined') {
        query += ' WHERE o.client_id = ?';
        params.push(String(clientIdParam));
      }
      
      query += ' ORDER BY o.created_at DESC';
      
      const stmt = env.DB.prepare(query);
      const { results } = params.length > 0 ? await stmt.bind(...params).all() : await stmt.all();
      
      const orders = (results || []).map((o: any) => ({
        ...o,
        formattedOrderNumber: String(o.order_number || 0).padStart(5, '0')
      }));
      
      return Response.json(orders);
    }

    // POST /api/orders
    if (request.method === 'POST') {
      const body = await request.json() as any;
      const now = new Date().toISOString();
      const newId = crypto.randomUUID();

      const { results: maxResults } = await env.DB.prepare('SELECT MAX(order_number) as last FROM orders').all();
      const lastNum = (maxResults as any)[0]?.last;
      const nextOrderNumber = (Number(lastNum) || 0) + 1;
      const formattedOrder = String(nextOrderNumber).padStart(5, '0');

      const client_id = String(body.client_id || '').trim();
      const description = String(body.description || '').trim();
      const order_date = String(body.order_date || now.split('T')[0]);
      const due_date = String(body.due_date || order_date);
      const status = String(body.status || 'open');

      if (!client_id) return new Response(JSON.stringify({ error: 'client_id é obrigatório' }), { status: 400 });

      // Inserir Cabeçalho
      await env.DB.prepare(
        'INSERT INTO orders (id, order_number, client_id, description, order_date, due_date, total, total_cost, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
      ).bind(
        newId,
        nextOrderNumber,
        client_id,
        description,
        order_date,
        due_date,
        0, 
        0, 
        status,
        now
      ).run();

      // Inserir Itens
      const items = Array.isArray(body.items) ? body.items : [];
      let calculatedTotal = 0;
      let calculatedCost = 0;
      
      if (items.length > 0) {
        for (const item of items) {
          const itemId = crypto.randomUUID();
          const q = Number(item.quantity || 1);
          const p = Number(item.unitPrice || item.unit_price || item.price || 0);
          const c = Number(item.cost_price || item.costPrice || item.cost || 0);
          const subtotal = Number(item.total || (p * q));
          
          calculatedTotal += subtotal;
          calculatedCost += (c * q);

          await env.DB.prepare(
            'INSERT INTO order_items (id, order_id, catalog_id, name, type, unit_price, cost_price, quantity, total) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
          ).bind(
            itemId,
            newId,
            String(item.productId || item.item_id || item.catalog_id || 'manual'),
            String(item.productName || item.name || item.description || 'Item'),
            String(item.type || 'product'),
            p,
            c,
            q,
            subtotal
          ).run();
        }

        await env.DB.prepare('UPDATE orders SET total = ?, total_cost = ? WHERE id = ?')
            .bind(calculatedTotal, calculatedCost, newId).run();
      }

      // --- E-MAILS (RESEND) ---
      const notifId = crypto.randomUUID();
      const clientData: any = await env.DB.prepare('SELECT name, email FROM clients WHERE id = ?').bind(client_id).first();
      const clientName = clientData?.name || 'Cliente';
      const clientEmail = clientData?.email;

      if (user.role === 'admin') {
        // Admin criou: Notifica cliente
        await env.DB.prepare(
          "INSERT INTO notifications (id, target_role, user_id, type, title, message, created_at) VALUES (?, 'client', ?, 'info', 'Novo Pedido', ?, ?)"
        ).bind(notifId, client_id, `Um novo pedido (#${formattedOrder}) foi gerado para você.`, now).run();

        if (clientEmail) {
          await sendEmail(env, {
            to: clientEmail,
            subject: `Novo Pedido #${formattedOrder} - Crazy Art`,
            html: templates.newOrderClient(clientName, formattedOrder, calculatedTotal)
          });
        }

      } else if (user.role === 'client') {
        // Cliente criou: Notifica admin
        await env.DB.prepare(
          "INSERT INTO notifications (id, target_role, type, title, message, created_at) VALUES (?, 'admin', 'info', 'Pedido da Loja', ?, ?)"
        ).bind(notifId, `O cliente ${clientName} criou o pedido #${formattedOrder} via loja.`, now).run();

        await sendEmail(env, {
          to: getAdminEmail(env),
          subject: `Novo Pedido Loja #${formattedOrder}`,
          html: templates.newOrderAdmin(clientName, formattedOrder, calculatedTotal)
        });
      }

      return Response.json({ 
        success: true,
        id: newId,
        total: calculatedTotal,
        formattedOrderNumber: String(nextOrderNumber).padStart(5, '0')
      });
    }

    // PUT
    if (request.method === 'PUT' && id) {
      if (user.role !== 'admin') return new Response(JSON.stringify({ error: 'Acesso restrito' }), { status: 403 });
      
      const body = await request.json() as any;

      if (Object.keys(body).length === 1 && body.status) {
        await env.DB.prepare('UPDATE orders SET status = ? WHERE id = ?')
          .bind(String(body.status), String(id))
          .run();
        return Response.json({ success: true });
      }

      const description = String(body.description || '').trim();
      const order_date = String(body.order_date || '');
      const due_date = String(body.due_date || '');
      const status = String(body.status || 'open');

      await env.DB.prepare(
        'UPDATE orders SET description = ?, order_date = ?, due_date = ?, status = ? WHERE id = ?'
      ).bind(description, order_date, due_date, status, id).run();

      if (Array.isArray(body.items)) {
        await env.DB.prepare('DELETE FROM order_items WHERE order_id = ?').bind(id).run();
        
        let calculatedTotal = 0;
        let calculatedCost = 0;
        
        for (const item of body.items) {
          const itemId = crypto.randomUUID();
          const q = Number(item.quantity || 1);
          const p = Number(item.unitPrice || item.unit_price || item.price || 0);
          const c = Number(item.cost_price || item.costPrice || item.cost || 0);
          const subtotal = Number(item.total || (p * q));
          
          calculatedTotal += subtotal;
          calculatedCost += (c * q);

          await env.DB.prepare(
            'INSERT INTO order_items (id, order_id, catalog_id, name, type, unit_price, cost_price, quantity, total) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
          ).bind(
            itemId,
            id,
            String(item.productId || item.item_id || item.catalog_id || 'manual'),
            String(item.productName || item.name || item.description || 'Item'),
            String(item.type || 'product'),
            p,
            c,
            q,
            subtotal
          ).run();
        }
        
        await env.DB.prepare('UPDATE orders SET total = ?, total_cost = ? WHERE id = ?')
            .bind(calculatedTotal, calculatedCost, id).run();
      }

      return Response.json({ success: true });
    }

    // DELETE
    if (request.method === 'DELETE' && id) {
      if (user.role !== 'admin') return new Response(JSON.stringify({ error: 'Acesso restrito' }), { status: 403 });
      await env.DB.prepare('DELETE FROM orders WHERE id = ?').bind(id).run();
      return Response.json({ success: true });
    }

    return new Response(JSON.stringify({ error: 'Método não permitido' }), { status: 405 });
  } catch (e: any) {
    console.error("Erro na API de Pedidos:", e.message);
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
};
