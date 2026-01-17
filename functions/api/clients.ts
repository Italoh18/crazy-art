
import { Env, getAuth } from './_auth';

export const onRequest: any = async ({ request, env }: { request: Request, env: Env }) => {
  try {
    const user = await getAuth(request, env);
    if (!user) return new Response(JSON.stringify({ error: 'Não autorizado' }), { status: 401 });

    const url = new URL(request.url);
    const id = url.searchParams.get('id');

    // GET - Listar clientes
    if (request.method === 'GET') {
      if (id) {
          const client = await env.DB.prepare('SELECT * FROM clients WHERE id = ?').bind(id).first();
          return Response.json(client);
      }
      const { results } = await env.DB.prepare('SELECT * FROM clients ORDER BY name ASC').all();
      return Response.json(results);
    }

    // POST - Criar cliente (Apenas Admin)
    if (request.method === 'POST') {
      if (user.role !== 'admin') return new Response(JSON.stringify({ error: 'Acesso negado' }), { status: 403 });
      
      const c = await request.json() as any;
      const newId = crypto.randomUUID();
      
      // Mapeamento explícito para suportar objetos aninhados ou planos
      const street = c.address?.street || c.street || '';
      const number = c.address?.number || c.number || '';
      const zipCode = c.address?.zipCode || c.zipCode || '';
      
      await env.DB.prepare(
        'INSERT INTO clients (id, name, email, phone, cpf, street, number, zipCode, creditLimit) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
      )
      .bind(newId, c.name, c.email, c.phone, c.cpf, street, number, zipCode, c.creditLimit || 0)
      .run();
      
      return Response.json({ id: newId, success: true });
    }

    // PUT - Atualizar cliente (Apenas Admin)
    if (request.method === 'PUT' && id) {
      if (user.role !== 'admin') return new Response(JSON.stringify({ error: 'Acesso negado' }), { status: 403 });
      
      const c = await request.json() as any;
      const street = c.address?.street || c.street || '';
      const number = c.address?.number || c.number || '';
      const zipCode = c.address?.zipCode || c.zipCode || '';

      await env.DB.prepare(
        'UPDATE clients SET name=?, email=?, phone=?, cpf=?, street=?, number=?, zipCode=?, creditLimit=? WHERE id=?'
      )
      .bind(c.name, c.email, c.phone, c.cpf, street, number, zipCode, c.creditLimit, id)
      .run();
      
      return Response.json({ success: true });
    }

    // DELETE - Remover cliente (Apenas Admin)
    if (request.method === 'DELETE' && id) {
      if (user.role !== 'admin') return new Response(JSON.stringify({ error: 'Acesso negado' }), { status: 403 });
      
      await env.DB.prepare('DELETE FROM clients WHERE id = ?').bind(id).run();
      return Response.json({ success: true });
    }

    return new Response(JSON.stringify({ error: 'Método não permitido' }), { status: 405 });
  } catch (e: any) {
    console.error('Erro na API de Clientes:', e.message);
    return new Response(JSON.stringify({ error: 'Erro interno no servidor: ' + e.message }), { status: 500 });
  }
};
