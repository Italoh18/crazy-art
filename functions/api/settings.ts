
import { Env, getAuth } from './_auth';

export const onRequest: any = async ({ request, env }: { request: Request, env: Env }) => {
  try {
    const url = new URL(request.url);
    
    // GET: Buscar Configurações (Público, pois o favicon precisa carregar para todos)
    if (request.method === 'GET') {
      const { results } = await env.DB.prepare('SELECT * FROM site_settings').all();
      
      const settings: any = {};
      if (results) {
          results.forEach((row: any) => {
              settings[row.key] = row.value;
          });
      }
      return Response.json(settings);
    }

    // POST: Atualizar Configurações (Apenas Admin)
    if (request.method === 'POST') {
      const user = await getAuth(request, env);
      if (!user || user.role !== 'admin') {
        return new Response(JSON.stringify({ error: 'Não autorizado' }), { status: 401 });
      }

      const body = await request.json() as any;
      const { key, value } = body;

      if (!key) return new Response(JSON.stringify({ error: 'Chave obrigatória' }), { status: 400 });

      const now = new Date().toISOString();

      await env.DB.prepare(`
        INSERT INTO site_settings (key, value, updated_at) 
        VALUES (?, ?, ?) 
        ON CONFLICT(key) DO UPDATE SET 
            value = excluded.value,
            updated_at = excluded.updated_at
      `).bind(key, value, now).run();

      return Response.json({ success: true });
    }

    return new Response(JSON.stringify({ error: 'Método não permitido' }), { status: 405 });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
};
