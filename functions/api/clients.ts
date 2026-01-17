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
        return new Response(JSON.stringify(client || null), {
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      const { results } = await env.DB.prepare('SELECT * FROM clients ORDER BY created_at DESC').all();
      return new Response(JSON.stringify(results || []), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // POST - Criar
    if (request.method === 'POST') {
      if (user.role !== 'admin') return new Response(JSON.stringify({ error: 'Acesso negado' }), { status: 403 });
      
      const body = await request.json() as any;
      
      // Verificação de duplicidade para CPF
      const existing = await env.DB.prepare('SELECT id FROM clients WHERE cpf = ?').bind(String(body.cpf)).first();
      if (existing) {
        return new Response(JSON.stringify({ error: 'Este CPF já está cadastrado no sistema.' }), { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const newId = crypto.randomUUID();
      const now = new Date().toISOString();
      
      // Mapeamento flat para o banco (Frontend envia address: { street... })
      const params = [
        newId,
        String(body.name || '').trim(),
        String(body.email || '').trim() || null,
        String(body.phone || '').trim() || null,
        String(body.cpf || '').trim(),
        String(body.address?.street || '').trim() || null,
        String(body.address?.number || '').trim() || null,
        String(body.address?.zipCode || '').trim() || null,
        parseFloat(body.creditLimit) || 50.0,
        now
      ];

      const result = await env.DB.prepare(
        'INSERT INTO clients (id, name, email, phone, cpf, street, number, zipCode, creditLimit, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
      ).bind(...params).run();

      if (!result.success) throw new Error('Falha ao salvar no banco.');
      
      return new Response(JSON.stringify({ success: true, id: newId }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // PUT - Atualizar
    if (request.method === 'PUT' && id) {
      if (user.role !== 'admin' && user.clientId !== id) {
        return new Response(JSON.stringify({ error: 'Acesso negado' }), { status: 403 });
      }

      const body = await request.json() as any;
      
      const params = [
        String(body.name || '').trim(),
        String(body.email || '').trim() || null,
        String(body.phone || '').trim() || null,
        String(body.address?.street || '').trim() || null,
        String(body.address?.number || '').trim() || null,
        String(body.address?.zipCode || '').trim() || null,
        parseFloat(body.creditLimit) || 0,
        id
      ];

      const result = await env.DB.prepare(
        'UPDATE clients SET name=?, email=?, phone=?, street=?, number=?, zipCode=?, creditLimit=? WHERE id=?'
      ).bind(...params).run();

      if (!result.success) throw new Error('Falha ao atualizar no banco.');
      
      return new Response(JSON.stringify({ success: true }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // DELETE
    if (request.method === 'DELETE' && id) {
      if (user.role !== 'admin') return new Response(JSON.stringify({ error: 'Acesso negado' }), { status: 403 });
      await env.DB.prepare('DELETE FROM clients WHERE id = ?').bind(id).run();
      return new Response(JSON.stringify({ success: true }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ error: 'Método não permitido' }), { status: 405 });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};