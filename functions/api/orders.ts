
import { Env, getAuth } from './_auth';

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
        // Busca pedido específico + itens
        const order: any = await env.DB.prepare('SELECT * FROM orders WHERE id = ?').bind(id).first();
        if (!order) return new Response(JSON.stringify({ error: 'Pedido não encontrado' }), { status: 404 });
        
        const { results: items } = await env.DB.prepare('SELECT * FROM order_items WHERE order_id = ?').bind(id).all();
        
        return Response.json({
          ...order,
          items: items || [],
          formattedOrderNumber: String(order.order_number || 0).padStart(5, '0')
        });
      }

      let query = 'SELECT * FROM orders';
      let params: any[] = [];
      
      if (clientIdParam && clientIdParam !== 'undefined') {
        query += ' WHERE client_id = ?';
        params.push(String(clientIdParam));
      }
      
      query += ' ORDER BY created_at DESC';
      
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

      const client_id = String(body.client_id || '').trim();
      const description = String(body.description || '').trim();
      const order_date = String(body.order_date || now.split('T')[0]);
      const due_date = String(body.due_date || order_date);
      const status = String(body.status || 'open');

      if (!client_id) return new Response(JSON.stringify({ error: 'client_id é obrigatório' }), { status: 400 });

      // Inserir Cabeçalho do Pedido (Total começa em 0)
      await env.DB.prepare(
        'INSERT INTO orders (id, order_number, client_id, description, order_date, due_date, total, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
      ).bind(
        newId,
        nextOrderNumber,
        client_id,
        description,
        order_date,
        due_date,
        0, 
        status,
        now
      ).run();

      // Inserir Itens do Pedido com o schema real do D1
      const items = Array.isArray(body.items) ? body.items : [];
      let calculatedTotal = 0;
      
      if (items.length > 0) {
        for (const item of items) {
          const itemId = crypto.randomUUID();
          const q = Number(item.quantity || 1);
          const p = Number(item.unitPrice || item.unit_price || item.price || 0);
          const c = Number(item.cost_price || item.costPrice || item.cost || 0);
          const subtotal = Number(item.total || (p * q));
          calculatedTotal += subtotal;

          await env.DB.prepare(
            'INSERT INTO order_items (id, order_id, catalog_id, name, type, price, cost, quantity, subtotal) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
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

        // Atualizar Total Final no Cabeçalho
        await env.DB.prepare('UPDATE orders SET total = ? WHERE id = ?').bind(calculatedTotal, newId).run();
      }

      return Response.json({ 
        success: true,
        id: newId,
        total: calculatedTotal,
        formattedOrderNumber: String(nextOrderNumber).padStart(5, '0')
      });
    }

    // PUT /api/orders (Edição)
    if (request.method === 'PUT' && id) {
      if (user.role !== 'admin') return new Response(JSON.stringify({ error: 'Acesso restrito' }), { status: 403 });
      
      const body = await request.json() as any;

      // Status rápido
      if (Object.keys(body).length === 1 && body.status) {
        await env.DB.prepare('UPDATE orders SET status = ? WHERE id = ?')
          .bind(String(body.status), String(id))
          .run();
        return Response.json({ success: true });
      }

      // Edição completa
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
        for (const item of body.items) {
          const itemId = crypto.randomUUID();
          const q = Number(item.quantity || 1);
          const p = Number(item.unitPrice || item.unit_price || item.price || 0);
          const c = Number(item.cost_price || item.costPrice || item.cost || 0);
          const subtotal = Number(item.total || (p * q));
          calculatedTotal += subtotal;

          await env.DB.prepare(
            'INSERT INTO order_items (id, order_id, catalog_id, name, type, price, cost, quantity, subtotal) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
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
        
        await env.DB.prepare('UPDATE orders SET total = ? WHERE id = ?').bind(calculatedTotal, id).run();
      }

      return Response.json({ success: true });
    }

    // DELETE /api/orders
    if (request.method === 'DELETE' && id) {
      if (user.role !== 'admin') return new Response(JSON.stringify({ error: 'Acesso restrito' }), { status: 403 });
      
      // A exclusão de order_items ocorre automaticamente via ON DELETE CASCADE no DB
      await env.DB.prepare('DELETE FROM orders WHERE id = ?').bind(id).run();
      
      return Response.json({ success: true });
    }

    return new Response(JSON.stringify({ error: 'Método não permitido' }), { status: 405 });
  } catch (e: any) {
    console.error("Erro na API de Pedidos:", e.message);
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
};
