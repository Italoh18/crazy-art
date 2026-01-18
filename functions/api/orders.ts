
import { Env, getAuth } from './_auth';

export const onRequest: any = async ({ request, env }: { request: Request, env: Env }) => {
  try {
    const user = await getAuth(request, env);
    if (!user) return new Response(JSON.stringify({ error: 'Não autorizado' }), { status: 401 });

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
      const orders = (results || []).map((o: any) => ({ ...o, items: JSON.parse(o.items || '[]') }));
      return Response.json(orders);
    }

    if (request.method === 'POST') {
      const o = await request.json() as any;
      const newId = crypto.randomUUID();
      
      // Busca segura do próximo número do pedido
      const { results } = await env.DB.prepare('SELECT MAX(orderNumber) as maxNum FROM orders').all();
      const orderNumber = (Number(results[0]?.maxNum) || 0) + 1;
      
      const totalValue = parseFloat(String(o.totalValue || '0').replace(',', '.')) || 0;
      const requestDate = o.requestDate || new Date().toISOString();
      const dueDate = o.dueDate || requestDate;

      await env.DB.prepare('INSERT INTO orders (id, orderNumber, customerId, description, totalValue, requestDate, dueDate, status, items) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
        .bind(
          newId, 
          orderNumber, 
          o.customerId || '', 
          String(o.description || '').trim(), 
          totalValue, 
          requestDate, 
          dueDate, 
          o.status || 'open', 
          JSON.stringify(o.items || [])
        )
        .run();
      
      return Response.json({ id: newId, orderNumber, totalValue, description: o.description, items: o.items });
    }

    if (request.method === 'PUT' && id) {
      const body = await request.json() as any;
      if (body.status) {
          await env.DB.prepare('UPDATE orders SET status = ? WHERE id = ?').bind(body.status, id).run();
      } else {
          const totalValue = parseFloat(String(body.totalValue || '0').replace(',', '.')) || 0;
          await env.DB.prepare('UPDATE orders SET description=?, totalValue=?, requestDate=?, dueDate=?, items=? WHERE id=?')
            .bind(
              String(body.description || '').trim(), 
              totalValue, 
              body.requestDate, 
              body.dueDate, 
              JSON.stringify(body.items || []), 
              id
            )
            .run();
      }
      return Response.json({ success: true });
    }

    return new Response(JSON.stringify({ error: 'Método não permitido' }), { status: 405 });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
};
