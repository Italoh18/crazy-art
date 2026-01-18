
import { Env, getAuth } from './_auth';

export const onRequest: any = async ({ request, env }: { request: Request, env: Env }) => {
  try {
    const user = await getAuth(request, env);
    if (!user) return new Response(JSON.stringify({ error: 'Não autorizado' }), { status: 401 });

    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    const clientIdParam = url.searchParams.get('clientId');

    // GET /api/orders?clientId=...
    if (request.method === 'GET') {
      let query = 'SELECT * FROM orders';
      let params: any[] = [];
      
      if (clientIdParam) {
        query += ' WHERE customerId = ?';
        params.push(clientIdParam);
      }
      
      query += ' ORDER BY created_at DESC';
      
      const { results } = await env.DB.prepare(query).bind(...params).all();
      const orders = (results || []).map((o: any) => ({
        ...o,
        items: JSON.parse(o.items || '[]')
      }));
      
      return Response.json(orders);
    }

    // POST /api/orders
    if (request.method === 'POST') {
      const body = await request.json() as any;
      
      // Normalização e extração segura de dados conforme requisitos
      const client_id = String(body.client_id || body.customerId || '').trim();
      const description = String(body.description || '').trim();
      const order_date = body.order_date || body.requestDate || new Date().toISOString();
      const due_date = body.due_date || body.dueDate || order_date;
      const total = parseFloat(String(body.total || body.totalValue || '0')) || 0;
      const status = String(body.status || 'open').trim();
      const items = body.items || [];
      
      if (!client_id) {
        return new Response(JSON.stringify({ error: 'client_id é obrigatório' }), { status: 400 });
      }

      const newId = crypto.randomUUID();
      const created_at = new Date().toISOString();
      
      // Obter próximo número do pedido
      const { results: maxResults } = await env.DB.prepare('SELECT MAX(orderNumber) as maxNum FROM orders').all();
      const orderNumber = (Number((maxResults as any)[0]?.maxNum) || 0) + 1;

      // Bind normalizado: string, number ou null
      const params = [
        newId,
        orderNumber,
        client_id,
        description,
        total,
        order_date,
        due_date,
        status,
        JSON.stringify(items),
        created_at
      ];

      await env.DB.prepare(
        'INSERT INTO orders (id, orderNumber, customerId, description, totalValue, requestDate, dueDate, status, items, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
      ).bind(...params).run();

      return Response.json({ success: true, id: newId, orderNumber });
    }

    // PUT para atualização (Status ou Dados)
    if (request.method === 'PUT' && id) {
      const body = await request.json() as any;
      if (body.status) {
        await env.DB.prepare('UPDATE orders SET status = ? WHERE id = ?').bind(body.status, id).run();
      } else {
        const total = parseFloat(String(body.total || body.totalValue || '0')) || 0;
        await env.DB.prepare(
          'UPDATE orders SET description=?, totalValue=?, requestDate=?, dueDate=?, items=? WHERE id=?'
        ).bind(
          String(body.description || '').trim(),
          total,
          body.order_date || body.requestDate,
          body.due_date || body.dueDate,
          JSON.stringify(body.items || []),
          id
        ).run();
      }
      return Response.json({ success: true });
    }

    return new Response(JSON.stringify({ error: 'Método não permitido' }), { status: 405 });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
};
