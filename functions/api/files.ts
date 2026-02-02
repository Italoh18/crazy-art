
import { Env, getAuth } from './_auth';

export const onRequest: any = async ({ request, env }: { request: Request, env: Env }) => {
  try {
    const user = await getAuth(request, env);
    // Permite leitura para clientes e admins, escrita apenas admins
    if (!user) return new Response(JSON.stringify({ error: 'Não autorizado' }), { status: 401 });

    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    const folder = url.searchParams.get('folder');

    // GET: Listar Arquivos
    if (request.method === 'GET') {
      let query = 'SELECT * FROM drive_files';
      const params: any[] = [];

      if (folder && folder !== 'all') {
        query += ' WHERE folder = ?';
        params.push(folder);
      }

      query += ' ORDER BY created_at DESC';

      const stmt = env.DB.prepare(query);
      const { results } = params.length > 0 ? await stmt.bind(...params).all() : await stmt.all();
      return Response.json(results || []);
    }

    // POST: Adicionar Arquivo (Apenas Admin)
    if (request.method === 'POST') {
      if (user.role !== 'admin') return new Response(JSON.stringify({ error: 'Acesso negado' }), { status: 403 });
      
      const body = await request.json() as any;
      if (!body.name || !body.url) return new Response(JSON.stringify({ error: 'Dados incompletos' }), { status: 400 });

      const newId = crypto.randomUUID();
      const now = new Date().toISOString();

      await env.DB.prepare(
        'INSERT INTO drive_files (id, name, folder, url, type, size, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
      ).bind(
        newId,
        String(body.name).trim(),
        String(body.folder || 'geral'),
        String(body.url).trim(),
        String(body.type || 'other'),
        String(body.size || 'Unknown'),
        now
      ).run();

      return Response.json({ success: true, id: newId });
    }

    // DELETE: Remover Arquivo
    if (request.method === 'DELETE' && id) {
      if (user.role !== 'admin') return new Response(JSON.stringify({ error: 'Acesso negado' }), { status: 403 });
      await env.DB.prepare('DELETE FROM drive_files WHERE id = ?').bind(id).run();
      return Response.json({ success: true });
    }

    return new Response(JSON.stringify({ error: 'Método não permitido' }), { status: 405 });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
};
