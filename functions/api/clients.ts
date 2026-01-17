import { Env, getAuth } from './_auth';

// Helper para converter o formato flat do SQLite para o objeto aninhado do frontend
const mapClient = (c: any) => {
  if (!c) return null;
  return {
    ...c,
    address: {
      street: c.street || '',
      number: c.number || '',
      zipCode: c.zipCode || ''
    }
  };
};

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

    // GET - Listar
    if (request.method === 'GET') {
      if (id) {
        const client = await env.DB.prepare('SELECT * FROM clients WHERE id = ?').bind(id).first();
        return Response.json({ 
          success: true, 
          data: mapClient(client)
        });
      }
      // Ordenação por create_at para garantir que os novos apareçam primeiro ou por nome
      const { results } = await env.DB.prepare('SELECT * FROM clients ORDER BY name ASC').all();
      const mappedResults = (results || []).map(mapClient);
      
      return Response.json({ 
        success: true, 
        data: mappedResults 
      });
    }

    // POST - Criar
    if (request.method === 'POST') {
      if (user.role !== 'admin') return new Response(JSON.stringify({ error: 'Acesso negado' }), { status: 403 });
      
      const body = await request.json() as any;
      
      // Validação de duplicidade manual para evitar erro de banco genérico
      const existing = await env.DB.prepare('SELECT id FROM clients WHERE cpf = ?').bind(String(body.cpf)).first();
      if (existing) {
        return new Response(JSON.stringify({ error: 'Já existe um cliente cadastrado com este CPF.' }), { 
            status: 400,
            headers: { 'Content-Type': 'application/json' }
        });
      }

      const newId = crypto.randomUUID();
      const now = new Date().toISOString();
      
      const params = [
        newId,
        String(body.name || '').trim(),
        String(body.email || '').trim() || null,
        String(body.phone || '').trim() || null,
        String(body.cpf || '').trim(),
        String(body.address?.street || body.street || '').trim() || null,
        String(body.address?.number || body.number || '').trim() || null,
        String(body.address?.zipCode || body.zipCode || '').trim() || null,
        Number(body.creditLimit || 0),
        now // USANDO create_at (Snake Case)
      ];

      const result = await env.DB.prepare(
        'INSERT INTO clients (id, name, email, phone, cpf, street, number, zipCode, creditLimit, create_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
      ).bind(...params).run();

      if (!result.success) throw new Error(result.error || 'Falha ao salvar no banco de dados.');
      
      return Response.json({ success: true, id: newId });
    }

    // PUT - Atualizar
    if (request.method === 'PUT' && id) {
      if (user.role !== 'admin') return new Response(JSON.stringify({ error: 'Acesso negado' }), { status: 403 });
      
      const body = await request.json() as any;
      const params = [
        String(body.name || '').trim(),
        String(body.email || '').trim() || null,
        String(body.phone || '').trim() || null,
        String(body.cpf || '').trim(),
        String(body.address?.street || body.street || '').trim() || null,
        String(body.address?.number || body.number || '').trim() || null,
        String(body.address?.zipCode || body.zipCode || '').trim() || null,
        Number(body.creditLimit || 0),
        id
      ];

      const result = await env.DB.prepare(
        'UPDATE clients SET name=?, email=?, phone=?, cpf=?, street=?, number=?, zipCode=?, creditLimit=? WHERE id=?'
      ).bind(...params).run();

      if (!result.success) throw new Error(result.error || 'Falha ao atualizar dados.');
      
      return Response.json({ success: true });
    }

    // DELETE - Remover
    if (request.method === 'DELETE' && id) {
      if (user.role !== 'admin') return new Response(JSON.stringify({ error: 'Acesso negado' }), { status: 403 });
      const result = await env.DB.prepare('DELETE FROM clients WHERE id = ?').bind(id).run();
      return Response.json({ success: result.success });
    }

    return new Response(JSON.stringify({ error: 'Método não permitido' }), { status: 405 });
  } catch (e: any) {
    console.error('API Clients Error:', e.message);
    return new Response(JSON.stringify({ error: e.message }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
    });
  }
};