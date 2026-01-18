
import { Env, getAuth } from './_auth';

export const onRequest: any = async ({ request, env }: { request: Request, env: Env }) => {
  try {
    const user = await getAuth(request, env);
    if (!user) return new Response(JSON.stringify({ error: 'Não autorizado' }), { status: 401 });

    const url = new URL(request.url);
    const id = url.searchParams.get('id');

    if (request.method === 'GET') {
      if (id) {
        const client = await env.DB.prepare('SELECT * FROM clients WHERE id = ?').bind(String(id)).first();
        return Response.json(client);
      }
      const { results } = await env.DB.prepare('SELECT * FROM clients ORDER BY created_at DESC').all();
      return Response.json(results || []);
    }

    if (request.method === 'POST') {
      if (user.role !== 'admin') return new Response(JSON.stringify({ error: 'Acesso negado' }), { status: 403 });
      const body = await request.json() as any;
      
      const existing = await env.DB.prepare('SELECT id FROM clients WHERE cpf = ?').bind(String(body.cpf)).first();
      if (existing) return new Response(JSON.stringify({ error: 'CPF já cadastrado.' }), { status: 400 });

      const newId = crypto.randomUUID();
      const now = new Date().toISOString();
      
      // 10 campos -> 10 placeholders
      await env.DB.prepare(
        'INSERT INTO clients (id, name, email, phone, cpf, street, number, zipCode, creditLimit, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
      ).bind(
        newId,
        String(body.name || '').trim(),
        body.email ? String(body.email).trim() : null,
        body.phone ? String(body.phone).trim() : null,
        String(body.cpf || '').trim(),
        body.address?.street ? String(body.address.street).trim() : null,
        body.address?.number ? String(body.address.number).trim() : null,
        body.address?.zipCode ? String(body.address.zipCode).trim() : null,
        parseFloat(body.creditLimit) || 50.0,
        now
      ).run();

      return Response.json({ success: true, id: newId });
    }

    if (request.method === 'PUT' && id) {
      const body = await request.json() as any;
      // 8 placeholders (7 SET + 1 WHERE)
      await env.DB.prepare(
        'UPDATE clients SET name=?, email=?, phone=?, street=?, number=?, zipCode=?, creditLimit=? WHERE id=?'
      ).bind(
        String(body.name || '').trim(),
        body.email ? String(body.email).trim() : null,
        body.phone ? String(body.phone).trim() : null,
        body.address?.street ? String(body.address.street).trim() : null,
        body.address?.number ? String(body.address.number).trim() : null,
        body.address?.zipCode ? String(body.address.zipCode).trim() : null,
        parseFloat(body.creditLimit) || 0,
        String(id)
      ).run();
      return Response.json({ success: true });
    }

    if (request.method === 'DELETE' && id) {
      if (user.role !== 'admin') return new Response(JSON.stringify({ error: 'Acesso negado' }), { status: 403 });
      await env.DB.prepare('DELETE FROM clients WHERE id = ?').bind(String(id)).run();
      return Response.json({ success: true });
    }

    return new Response(JSON.stringify({ error: 'Método não permitido' }), { status: 405 });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
};
