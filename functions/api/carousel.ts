
import { Env, getAuth } from './_auth';

export const onRequest: any = async ({ request, env }: { request: Request, env: Env }) => {
  try {
    const url = new URL(request.url);
    
    // GET: Listar imagens do carrossel (Público)
    if (request.method === 'GET') {
      const { results } = await env.DB.prepare('SELECT * FROM carousel ORDER BY created_at DESC').all();
      return Response.json(results || []);
    }

    // POST: Adicionar imagem (Apenas Admin)
    if (request.method === 'POST') {
      const user = await getAuth(request, env);
      if (!user || user.role !== 'admin') {
        return new Response(JSON.stringify({ error: 'Não autorizado' }), { status: 401 });
      }

      const { url: imageUrl } = await request.json() as any;
      if (!imageUrl) {
        return new Response(JSON.stringify({ error: 'URL da imagem é obrigatória' }), { status: 400 });
      }

      const id = crypto.randomUUID();
      const now = new Date().toISOString();

      await env.DB.prepare('INSERT INTO carousel (id, url, created_at) VALUES (?, ?, ?)')
        .bind(id, imageUrl, now)
        .run();

      return Response.json({ id, url: imageUrl, created_at: now });
    }

    // DELETE: Remover imagem (Apenas Admin)
    if (request.method === 'DELETE') {
      const user = await getAuth(request, env);
      if (!user || user.role !== 'admin') {
        return new Response(JSON.stringify({ error: 'Não autorizado' }), { status: 401 });
      }

      const id = url.searchParams.get('id');
      if (!id) {
        return new Response(JSON.stringify({ error: 'ID é obrigatório' }), { status: 400 });
      }

      await env.DB.prepare('DELETE FROM carousel WHERE id = ?').bind(id).run();
      return Response.json({ success: true });
    }

    return new Response(JSON.stringify({ error: 'Método não permitido' }), { status: 405 });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
};
