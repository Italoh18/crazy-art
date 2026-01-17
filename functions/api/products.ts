
import { Env, getAuth } from './_auth';

export const onRequest: any = async ({ request, env }: { request: Request, env: Env }) => {
  const user = await getAuth(request, env);
  if (!user) return new Response('Unauthorized', { status: 401 });

  const url = new URL(request.url);
  const id = url.searchParams.get('id');

  if (request.method === 'GET') {
    const { results } = await env.DB.prepare('SELECT * FROM products').all();
    return Response.json(results);
  }

  if (request.method === 'POST' && user.role === 'admin') {
    const p = await request.json() as any;
    const newId = crypto.randomUUID();
    await env.DB.prepare('INSERT INTO products (id, name, price, costPrice, description, type, imageUrl) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .bind(newId, p.name, p.price, p.costPrice, p.description, p.type, p.imageUrl)
      .run();
    return Response.json({ id: newId });
  }

  if (request.method === 'DELETE' && user.role === 'admin' && id) {
    await env.DB.prepare('DELETE FROM products WHERE id = ?').bind(id).run();
    return Response.json({ success: true });
  }

  return new Response('Method not allowed', { status: 405 });
};
