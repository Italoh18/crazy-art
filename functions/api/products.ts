
import { Env, getAuth } from './_auth';

export const onRequest: any = async ({ request, env }: { request: Request, env: Env }) => {
  try {
    const user = await getAuth(request, env);
    if (!user) return new Response(JSON.stringify({ error: 'Não autorizado' }), { status: 401 });

    const url = new URL(request.url);
    const id = url.searchParams.get('id');

    if (request.method === 'GET') {
      const { results } = await env.DB.prepare('SELECT * FROM products').all();
      return Response.json(results || []);
    }

    if (request.method === 'POST') {
      if (user.role !== 'admin') return new Response(JSON.stringify({ error: 'Acesso restrito' }), { status: 403 });
      
      const p = await request.json() as any;
      const newId = crypto.randomUUID();
      
      const price = parseFloat(String(p.price || '0').replace(',', '.')) || 0;
      const cost_price = (p.cost_price || p.costPrice) 
        ? parseFloat(String(p.cost_price || p.costPrice).replace(',', '.')) || 0 
        : 0;

      // 7 campos -> 7 placeholders
      await env.DB.prepare('INSERT INTO products (id, name, price, cost_price, description, type, imageUrl) VALUES (?, ?, ?, ?, ?, ?, ?)')
        .bind(
          newId,
          String(p.name || '').trim(),
          price,
          cost_price,
          p.description ? String(p.description).trim() : null,
          String(p.type || 'product'),
          p.imageUrl ? String(p.imageUrl).trim() : null
        )
        .run();
        
      return Response.json({ id: newId, name: p.name, price, type: p.type });
    }

    if (request.method === 'DELETE' && id) {
      if (user.role !== 'admin') return new Response(JSON.stringify({ error: 'Acesso restrito' }), { status: 403 });
      await env.DB.prepare('DELETE FROM products WHERE id = ?').bind(String(id)).run();
      return Response.json({ success: true });
    }

    return new Response(JSON.stringify({ error: 'Método não permitido' }), { status: 405 });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
};
