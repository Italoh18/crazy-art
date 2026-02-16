
import { Env, getAuth } from './_auth';

export const onRequest: any = async ({ request, env }: { request: Request, env: Env }) => {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');

    // POST: Criar Feedback (Público/Cliente)
    if (request.method === 'POST') {
      const body = await request.json() as any;
      
      if (!body.type || !body.content) {
        return new Response(JSON.stringify({ error: 'Dados incompletos.' }), { status: 400 });
      }

      const newId = crypto.randomUUID();
      const now = new Date().toISOString();

      await env.DB.prepare(
        'INSERT INTO feedbacks (id, type, content, user_name, created_at, is_read) VALUES (?, ?, ?, ?, ?, 0)'
      ).bind(
        newId,
        String(body.type),
        String(body.content),
        String(body.userName || 'Anônimo'),
        now
      ).run();

      return Response.json({ success: true, id: newId });
    }

    // Auth Check para leitura/deleção (Admin Only)
    const user = await getAuth(request, env);
    if (!user || user.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), { status: 401 });
    }

    // GET: Listar Feedbacks
    if (request.method === 'GET') {
      const { results } = await env.DB.prepare('SELECT * FROM feedbacks ORDER BY created_at DESC').all();
      return Response.json(results || []);
    }

    // PUT: Marcar como lido
    if (request.method === 'PUT' && id) {
        await env.DB.prepare('UPDATE feedbacks SET is_read = 1 WHERE id = ?').bind(id).run();
        return Response.json({ success: true });
    }

    // DELETE: Remover
    if (request.method === 'DELETE' && id) {
      await env.DB.prepare('DELETE FROM feedbacks WHERE id = ?').bind(id).run();
      return Response.json({ success: true });
    }

    return new Response(JSON.stringify({ error: 'Método não permitido' }), { status: 405 });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
};
