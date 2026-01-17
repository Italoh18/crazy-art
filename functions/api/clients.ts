
import { Env, getAuth } from './_auth';

export const onRequest: any = async ({ request, env }: { request: Request, env: Env }) => {
  const user = await getAuth(request, env);
  if (!user) return new Response('Unauthorized', { status: 401 });

  const url = new URL(request.url);
  const id = url.searchParams.get('id');

  if (request.method === 'GET') {
    if (id) {
        const client = await env.DB.prepare('SELECT * FROM clients WHERE id = ?').bind(id).first();
        return Response.json(client);
    }
    const { results } = await env.DB.prepare('SELECT * FROM clients').all();
    return Response.json(results);
  }

  if (request.method === 'POST' && user.role === 'admin') {
    const c = await request.json() as any;
    const newId = crypto.randomUUID();
    await env.DB.prepare('INSERT INTO clients (id, name, email, phone, cpf, street, number, zipCode, creditLimit) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .bind(newId, c.name, c.email, c.phone, c.cpf, c.address?.street || c.street, c.address?.number || c.number, c.address?.zipCode || c.zipCode, c.creditLimit)
      .run();
    return Response.json({ id: newId });
  }

  if (request.method === 'PUT' && user.role === 'admin' && id) {
    const c = await request.json() as any;
    await env.DB.prepare('UPDATE clients SET name=?, email=?, phone=?, cpf=?, street=?, number=?, zipCode=?, creditLimit=? WHERE id=?')
      .bind(c.name, c.email, c.phone, c.cpf, c.address?.street || c.street, c.address?.number || c.number, c.address?.zipCode || c.zipCode, c.creditLimit, id)
      .run();
    return Response.json({ success: true });
  }

  if (request.method === 'DELETE' && user.role === 'admin' && id) {
    await env.DB.prepare('DELETE FROM clients WHERE id = ?').bind(id).run();
    return Response.json({ success: true });
  }

  return new Response('Method not allowed', { status: 405 });
};
