
import { Env, getAuth } from './_auth';

export const onRequest: any = async ({ request, env }: { request: Request, env: Env }) => {
  try {
    const user = await getAuth(request, env);
    if (!user || user.role !== 'admin') {
        return new Response(JSON.stringify({ error: 'Não autorizado' }), { status: 401 });
    }

    const url = new URL(request.url);
    const type = url.searchParams.get('type');

    // GET: Listar todos ou um específico
    if (request.method === 'GET') {
      if (type) {
        const template = await env.DB.prepare('SELECT * FROM email_templates WHERE type = ?').bind(type).first();
        return Response.json(template || null);
      }
      const { results } = await env.DB.prepare('SELECT * FROM email_templates').all();
      return Response.json(results || []);
    }

    // POST/PUT: Salvar Template
    if (request.method === 'POST' || request.method === 'PUT') {
      const body = await request.json() as any;
      if (!body.type || !body.subject || !body.htmlBody) {
          return new Response(JSON.stringify({ error: 'Dados incompletos' }), { status: 400 });
      }

      const now = new Date().toISOString();

      // Upsert (Insert or Replace)
      await env.DB.prepare(`
        INSERT INTO email_templates (type, subject, html_body, logo_url, updated_at) 
        VALUES (?, ?, ?, ?, ?) 
        ON CONFLICT(type) DO UPDATE SET 
            subject = excluded.subject,
            html_body = excluded.html_body,
            logo_url = excluded.logo_url,
            updated_at = excluded.updated_at
      `).bind(
        body.type,
        body.subject,
        body.htmlBody,
        body.logoUrl || null,
        now
      ).run();

      return Response.json({ success: true });
    }

    // DELETE: Resetar para o padrão (apagar do banco)
    if (request.method === 'DELETE' && type) {
        await env.DB.prepare('DELETE FROM email_templates WHERE type = ?').bind(type).run();
        return Response.json({ success: true });
    }

    return new Response(JSON.stringify({ error: 'Método não permitido' }), { status: 405 });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
};
