
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
      
      if (clientIdParam) {
        query += ' WHERE client_id = ?';
        params.push(clientIdParam);
      }
      
      query += ' ORDER BY created_at DESC';
      
      const { results } = await env.DB.prepare(query).bind(...params).all();
      
      // Adiciona o número formatado para a UI
      const orders = (results || []).map((o: any) => ({
        ...o,
        formattedOrderNumber: String(o.order_number || 0).padStart(5, '0')
      }));
      
      return Response.json(orders);
    }

    // POST /api/orders
    if (request.method === 'POST') {
      const body = await request.json() as any;
      
      // 1. Gerar número do pedido sequencial
      const { results: maxResults } = await env.DB.prepare('SELECT MAX(order_number) as last FROM orders').all();
      const lastNum = (maxResults as any)[0]?.last;
      const nextOrderNumber = (Number(lastNum) || 0) + 1;

      // 2. Extração e Normalização (Garantindo no-undefined para o bind)
      const newId = crypto.randomUUID();
      const client_id = String(body.client_id || '').trim();
      const description = String(body.description || '').trim();
      const order_date = String(body.order_date || new Date().toISOString().split('T')[0]);
      const due_date = String(body.due_date || order_date);
      const total = parseFloat(String(body.total || '0')) || 0;
      const status = String(body.status || 'open');

      if (!client_id) {
        return new Response(JSON.stringify({ error: 'client_id é obrigatório' }), { status: 400 });
      }

      // 3. Inserção usando o schema real
      await env.DB.prepare(
        'INSERT INTO orders (id, order_number, client_id, description, order_date, due_date, total, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
      ).bind(
        newId,
        nextOrderNumber,
        client_id,
        description,
        order_date,
        due_date,
        total,
        status
      ).run();

      return Response.json({ 
        success: true, 
        id: newId, 
        order_number: nextOrderNumber,
        formattedOrderNumber: nextOrderNumber.toString().padStart(5, '0')
      });
    }

    // PUT /api/orders?id=... (Atualização de Status)
    if (request.method === 'PUT' && id) {
      const body = await request.json() as any;
      if (body.status) {
        await env.DB.prepare('UPDATE orders SET status = ? WHERE id = ?')
          .bind(body.status, id)
          .run();
        return Response.json({ success: true });
      }
    }

    return new Response(JSON.stringify({ error: 'Método não permitido' }), { status: 405 });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
};
