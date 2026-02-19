
import { Env, getAuth } from './_auth';
import { sendEmail, getAdminEmail, getRenderedTemplate } from '../services/email';

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
        
        // Agora busca o download_link dos itens
        const { results: items } = await env.DB.prepare(`
            SELECT id, order_id, catalog_id, name, type, unit_price, quantity, total, download_link as downloadLink 
            FROM order_items WHERE order_id = ?
        `).bind(id).all();
        
        return Response.json({
          ...order,
          items: items || [],
          formattedOrderNumber: String(order.order_number || 0).padStart(5, '0')
        });
      }

      let query = `
        SELECT o.*, c.name as client_name, c.creditLimit as client_credit_limit
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
      const source = String(body.source || 'admin');
      const size_list = body.size_list ? String(body.size_list) : null;

      if (!client_id) return new Response(JSON.stringify({ error: 'client_id é obrigatório' }), { status: 400 });

      await env.DB.prepare(
        'INSERT INTO orders (id, order_number, client_id, description, order_date, due_date, total, total_cost, status, created_at, size_list, is_confirmed, source) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)'
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
        now,
        size_list,
        source
      ).run();

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
          const dl = item.downloadLink || (item.product ? item.product.downloadLink : null); // Tenta pegar do payload ou objeto produto
          
          calculatedTotal += subtotal;
          calculatedCost += (c * q);

          // Se o download link não veio no payload mas temos o ID do produto, poderíamos buscar no DB,
          // mas para performance assumimos que o frontend enviou ou que será null.
          // Se for uma "arte", é crucial que o frontend envie o downloadLink no objeto item.

          await env.DB.prepare(
            'INSERT INTO order_items (id, order_id, catalog_id, name, type, unit_price, cost_price, quantity, total, download_link) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
          ).bind(
            itemId,
            newId,
            String(item.productId || item.item_id || item.catalog_id || 'manual'),
            String(item.productName || item.name || item.description || 'Item'),
            String(item.type || 'product'),
            p,
            c,
            q,
            subtotal,
            dl ? String(dl) : null
          ).run();
        }

        await env.DB.prepare('UPDATE orders SET total = ?, total_cost = ? WHERE id = ?')
            .bind(calculatedTotal, calculatedCost, newId).run();
      }

      return Response.json({ 
        success: true,
        id: newId,
        total: calculatedTotal,
        order_number: nextOrderNumber,
        formattedOrderNumber: formattedOrder
      });
    }

    // PUT
    if (request.method === 'PUT' && id) {
      const body = await request.json() as any;

      if (body.hasOwnProperty('is_confirmed')) {
          await env.DB.prepare('UPDATE orders SET is_confirmed = ? WHERE id = ?')
            .bind(Number(body.is_confirmed), String(id))
            .run();
          return Response.json({ success: true });
      }

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
      const size_list = body.size_list ? String(body.size_list) : null;

      await env.DB.prepare(
        'UPDATE orders SET description = ?, order_date = ?, due_date = ?, status = ?, size_list = ? WHERE id = ?'
      ).bind(description, order_date, due_date, status, size_list, id).run();

      return Response.json({ success: true });
    }

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
