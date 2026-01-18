
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

      // 1. Gerar número do pedido sequencial
      const { results: maxResults } = await env.DB.prepare('SELECT MAX(order_number) as last FROM orders').all();
      const lastNum = (maxResults as any)[0]?.last;
      const nextOrderNumber = (Number(lastNum) || 0) + 1;

      // 2. Normalização dos dados do cabeçalho
      const client_id = String(body.client_id || '').trim();
      const description = String(body.description || '').trim();
      const order_date = String(body.order_date || now.split('T')[0]);
      const due_date = String(body.due_date || order_date);
      const status = String(body.status || 'open');

      if (!client_id) return new Response(JSON.stringify({ error: 'client_id é obrigatório' }), { status: 400 });

      // 3. Inserir Cabeçalho (9 campos -> 9 placeholders)
      await env.DB.prepare(
        'INSERT INTO orders (id, order_number, client_id, description, order_date, due_date, total, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
      ).bind(
        newId,
        nextOrderNumber,
        client_id,
        description,
        order_date,
        due_date,
        0, // Total inicial
        status,
        now
      ).run();

      // 4. Inserir Itens na tabela order_items
      const items = Array.isArray(body.items) ? body.items : [];
      if (items.length > 0) {
        for (const item of items) {
          const itemId = crypto.randomUUID();
          // Colunas: id, order_id, item_type, item_id, description, unit_price, cost_price, quantity, total
          await env.DB.prepare(
            'INSERT INTO order_items (id, order_id, item_type, item_id, description, unit_price, cost_price, quantity, total) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
          ).bind(
            itemId,
            newId,
            String(item.type || 'product'),
            String(item.productId || 'manual'),
            String(item.productName || item.description || 'Item'),
            Number(item.unitPrice || 0),
            Number(item.cost_price || item.costPrice || 0),
            Number(item.quantity || 1),
            Number(item.total || (Number(item.unitPrice || 0) * Number(item.quantity || 1)))
          ).run();
        }

        // 5. Atualizar Total do Pedido via Subquery (2 placeholders)
        await env.DB.prepare(
          'UPDATE orders SET total = (SELECT COALESCE(SUM(total), 0) FROM order_items WHERE order_id = ?) WHERE id = ?'
        ).bind(newId, newId).run();
      }

      // 6. Retornar pedido completo
      const fullOrder: any = await env.DB.prepare('SELECT * FROM orders WHERE id = ?').bind(newId).first();
      return Response.json({ 
        ...fullOrder,
        success: true,
        formattedOrderNumber: String(fullOrder.order_number).padStart(5, '0')
      });
    }

    // PUT /api/orders (Status)
    if (request.method === 'PUT' && id) {
      const body = await request.json() as any;
      if (body.status) {
        await env.DB.prepare('UPDATE orders SET status = ? WHERE id = ?')
          .bind(String(body.status), String(id))
          .run();
        return Response.json({ success: true });
      }
    }

    return new Response(JSON.stringify({ error: 'Método não permitido' }), { status: 405 });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
};
