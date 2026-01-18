
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
      
      // Sanitização para evitar NaN no D1
      const price = parseFloat(String(p.price || '0').replace(',', '.')) || 0;
      const costPrice = (p.costPrice !== undefined && p.costPrice !== null && p.costPrice !== "") 
        ? parseFloat(String(p.costPrice).replace(',', '.')) || 0 
        : null;

      const params = [
          newId,
          String(p.name || '').trim(),
          price,
          costPrice,
          p.description || null,
          p.type || 'product',
          p.imageUrl || null
      ];

      await env.DB.prepare('INSERT INTO products (id, name, price, costPrice, description, type, imageUrl) VALUES (?, ?, ?, ?, ?, ?, ?)')
        .bind(...params)
        .run();
        
      return Response.json({ id: newId, name: p.name, price, type: p.type });
    }

    if (request.method === 'DELETE' && id) {
      if (user.role !== 'admin') return new Response(JSON.stringify({ error: 'Acesso restrito' }), { status: 403 });
      await env.DB.prepare('DELETE FROM products WHERE id = ?').bind(id).run();
      return Response.json({ success: true });
    }

    return new Response(JSON.stringify({ error: 'Método não permitido' }), { status: 405 });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
};
