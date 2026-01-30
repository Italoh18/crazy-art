
import { Env, getAuth } from './_auth';

export const onRequest: any = async ({ request, env }: { request: Request, env: Env }) => {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');

    // GET: Listagem Pública
    if (request.method === 'GET') {
      const { results } = await env.DB.prepare('SELECT * FROM trusted_companies ORDER BY created_at DESC').all();
      return Response.json(results || []);
    }

    // Auth Check para modificações
    const user = await getAuth(request, env);
    if (!user || user.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), { status: 401 });
    }

    // POST: Adicionar
    if (request.method === 'POST') {
      const body = await request.json() as any;
      if (!body.imageUrl) return new Response(JSON.stringify({ error: 'URL da imagem obrigatória' }), { status: 400 });

      const newId = crypto.randomUUID();
      const now = new Date().toISOString();

      await env.DB.prepare('INSERT INTO trusted_companies (id, name, image_url, created_at) VALUES (?, ?, ?, ?)')
        .bind(newId, body.name || 'Empresa Parceira', body.imageUrl, now)
        .run();

      return Response.json({ success: true, id: newId });
    }

    // DELETE: Remover
    if (request.method === 'DELETE' && id) {
      await env.DB.prepare('DELETE FROM trusted_companies WHERE id = ?').bind(id).run();
      return Response.json({ success: true });
    }

    return new Response(JSON.stringify({ error: 'Método não permitido' }), { status: 405 });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
};
