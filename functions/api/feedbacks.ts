
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

      // Sanitização básica contra XSS
      const sanitize = (str: string) => str.replace(/<[^>]*>/g, '').trim();

      const newId = crypto.randomUUID();
      const now = new Date().toISOString();

      await env.DB.prepare(
        'INSERT INTO feedbacks (id, type, content, user_name, created_at, is_read) VALUES (?, ?, ?, ?, ?, 0)'
      ).bind(
        newId,
        sanitize(String(body.type)),
        sanitize(String(body.content)),
        sanitize(String(body.userName || 'Anônimo')),
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
      const page = Math.max(1, parseInt(url.searchParams.get('page') || '0'));
      const limit = Math.max(1, Math.min(100, parseInt(url.searchParams.get('limit') || '50')));
      const offset = (page - 1) * limit;
      const isPaged = url.searchParams.has('page') || url.searchParams.has('limit');

      let totalCount = 0;
      if (isPaged) {
        const countResult: any = await env.DB.prepare('SELECT COUNT(*) as total FROM feedbacks').first();
        totalCount = countResult?.total || 0;
      }

      let query = 'SELECT * FROM feedbacks ORDER BY created_at DESC';
      let params: any[] = [];
      
      if (isPaged) {
        query += ' LIMIT ? OFFSET ?';
        params.push(limit, offset);
      } else {
        query += ' LIMIT 1000';
      }

      const { results } = params.length > 0 ? await env.DB.prepare(query).bind(...params).all() : await env.DB.prepare(query).all();
      
      if (isPaged) {
        return Response.json({
          data: results || [],
          total: totalCount,
          page,
          limit
        });
      }
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
    console.error("Erro na API de Feedbacks:", e.message);
    return new Response(JSON.stringify({ error: 'Erro ao processar feedbacks.' }), { status: 500 });
  }
};
