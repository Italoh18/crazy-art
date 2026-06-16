
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

      // 1. Busca os feedbacks normais
      let feedbacks: any[] = [];
      try {
        const fResults = await env.DB.prepare('SELECT id, type, content, user_name, created_at, is_read FROM feedbacks').all();
        feedbacks = fResults.results || [];
      } catch (e: any) {
        console.error("Erro ao buscar feedbacks:", e.message);
      }

      // 2. Busca os comentários de item se a tabela existir
      let comments: any[] = [];
      try {
        const cResults = await env.DB.prepare(
          'SELECT id, "comentario" as type, ("Comentou no item [" || product_name || "]: " || comment) as content, user_name, created_at, is_read FROM item_comments'
        ).all();
        comments = cResults.results || [];
      } catch (e: any) {
        console.warn("Tabela item_comments pode não existir ainda em feedbacks GET:", e.message);
      }

      // 3. Combina e ordena por data de criação de forma decrescente
      const merged = [...feedbacks, ...comments].sort((a, b) => {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });

      if (isPaged) {
        const paginated = merged.slice(offset, offset + limit);
        return Response.json({
          data: paginated,
          total: merged.length,
          page,
          limit
        });
      }
      
      return Response.json(merged);
    }

    // PUT: Marcar como lido
    if (request.method === 'PUT' && id) {
        await env.DB.prepare('UPDATE feedbacks SET is_read = 1 WHERE id = ?').bind(id).run();
        try {
          await env.DB.prepare('UPDATE item_comments SET is_read = 1 WHERE id = ?').bind(id).run();
        } catch (e: any) {
          console.warn("Ignorado erro ao atualizar comentário como lido:", e.message);
        }
        return Response.json({ success: true });
    }

    // DELETE: Remover
    if (request.method === 'DELETE' && id) {
      await env.DB.prepare('DELETE FROM feedbacks WHERE id = ?').bind(id).run();
      try {
        await env.DB.prepare('DELETE FROM item_comments WHERE id = ?').bind(id).run();
      } catch (e: any) {
        console.warn("Ignorado erro ao deletar comentário:", e.message);
      }
      return Response.json({ success: true });
    }

    return new Response(JSON.stringify({ error: 'Método não permitido' }), { status: 405 });
  } catch (e: any) {
    console.error("Erro na API de Feedbacks:", e.message);
    return new Response(JSON.stringify({ error: 'Erro ao processar feedbacks.' }), { status: 500 });
  }
};
