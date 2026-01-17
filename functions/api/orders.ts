
import { Env, getAuth } from './_auth';

export const onRequest: any = async ({ request, env }: { request: Request, env: Env }) => {
  const user = await getAuth(request, env);
  if (!user) return new Response('Unauthorized', { status: 401 });

  const url = new URL(request.url);
  const id = url.searchParams.get('id');
  const customerId = url.searchParams.get('customerId');

  if (request.method === 'GET') {
    let query = 'SELECT * FROM orders';
    let params: any[] = [];
    if (customerId) {
        query += ' WHERE customerId = ?';
        params.push(customerId);
    }
    const { results } = await env.DB.prepare(query).bind(...params).all();
    // Parse items back to array
    const orders = results.map((o: any) => ({ ...o, items: JSON.parse(o.items) }));
    return Response.json(orders);
  }

  if (request.method === 'POST') {
    const o = await request.json() as any;
    const newId = crypto.randomUUID();
    const { results } = await env.DB.prepare('SELECT MAX(orderNumber) as maxNum FROM orders').all();
    const orderNumber = (results[0]?.maxNum || 0) + 1;
    
    await env.DB.prepare('INSERT INTO orders (id, orderNumber, customerId, description, totalValue, requestDate, dueDate, status, items) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .bind(newId, orderNumber, o.customerId, o.description, o.totalValue, o.requestDate, o.dueDate, o.status, JSON.stringify(o.items))
      .run();
    
    return Response.json({ id: newId, orderNumber });
  }

  if (request.method === 'PUT' && id) {
    const body = await request.json() as any;
    if (body.status) {
        await env.DB.prepare('UPDATE orders SET status = ? WHERE id = ?').bind(body.status, id).run();
    } else {
        await env.DB.prepare('UPDATE orders SET description=?, totalValue=?, requestDate=?, dueDate=?, items=? WHERE id=?')
          .bind(body.description, body.totalValue, body.requestDate, body.dueDate, JSON.stringify(body.items), id)
          .run();
    }
    return Response.json({ success: true });
  }

  return new Response('Method not allowed', { status: 405 });
};
