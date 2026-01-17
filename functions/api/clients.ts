import { Env, getAuth } from './_auth';

export const onRequest: any = async ({ request, env }: { request: Request, env: Env }) => {
  try {
    const user = await getAuth(request, env);
    if (!user) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), { 
        status: 401, 
        headers: { 'Content-Type': 'application/json' } 
      });
    }

    const url = new URL(request.url);
    const id = url.searchParams.get('id');

    // GET - Listar ou buscar único
    if (request.method === 'GET') {
      if (id) {
        const client = await env.DB.prepare('SELECT * FROM clients WHERE id = ?').bind(id).first();
        return Response.json(client || null);
      }
      
      const { results } = await env.DB.prepare('SELECT * FROM clients ORDER BY created_at DESC').all();
      return Response.json(results || []);
    }

    // POST - Criar
    if (request.method === 'POST') {
      if (user.role !== 'admin') return new Response(JSON.stringify({ error: 'Acesso negado' }), { status: 403 });
      
      const body = await request.json() as any;
      
      // Verificação manual de duplicidade para CPF
      const existing = await env.DB.prepare('SELECT id FROM clients WHERE cpf = ?').bind(String(body.cpf)).first();
      if (existing) {
        return new Response(JSON.stringify({ error: 'Este CPF já está cadastrado no sistema.' }), { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const newId = crypto.randomUUID();
      const now = new Date().toISOString();
      
      // Apenas colunas que REALMENTE existem no D1 (id, name, email, phone, cpf, created_at)
      const params = [
        newId,
        String(body.name || '').trim(),
        String(body.email || '').trim() || null,
        String(body.phone || '').trim() || null,
        String(body.cpf || '').trim(),
        now
      ];

      const result = await env.DB.prepare(
        'INSERT INTO clients (id, name, email, phone, cpf, created_at) VALUES (?, ?, ?, ?, ?, ?)'
      ).bind(...params).run();

      if (!result.success) throw new Error('Falha técnica ao salvar o cliente no banco.');
      
      return Response.json({ success: true, id: newId });
    }

    // DELETE
    if (request.method === 'DELETE' && id) {
      if (user.role !== 'admin') return new Response(JSON.stringify({ error: 'Acesso negado' }), { status: 403 });
      await env.DB.prepare('DELETE FROM clients WHERE id = ?').bind(id).run();
      return Response.json({ success: true });
    }

    return new Response(JSON.stringify({ error: 'Método não permitido' }), { status: 405 });
  } catch (e: any) {
    console.error("Erro na API de Clientes:", e.message);
    return new Response(JSON.stringify({ error: e.message }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};