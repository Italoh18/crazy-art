
import { Env, getAuth, hashPassword } from './_auth';

export const onRequest: any = async ({ request, env }: { request: Request, env: Env }) => {
  try {
    const user = await getAuth(request, env);
    const url = new URL(request.url);
    const id = url.searchParams.get('id');

    if (request.method === 'GET') {
      if (!user) return new Response(JSON.stringify({ error: 'Não autorizado' }), { status: 401 });
      
      const mapClient = (c: any) => {
        if (!c) return null;
        return {
          ...c,
          cloudLink: c.cloudLink || c.cloud_link,
          isSubscriber: c.isSubscriber !== undefined ? c.isSubscriber : (c.is_subscriber === 1),
          subscriptionExpiresAt: c.subscriptionExpiresAt || c.subscription_expires_at
        };
      };

      if (id) {
        const client: any = await env.DB.prepare('SELECT * FROM clients WHERE id = ?').bind(String(id)).first();
        return Response.json(mapClient(client));
      }
      
      const { results } = await env.DB.prepare('SELECT * FROM clients ORDER BY created_at DESC').all();
      return Response.json((results || []).map(mapClient));
    }

    if (request.method === 'POST') {
      const body = await request.json() as any;
      
      const cpf = String(body.cpf || '').trim();
      const existing = await env.DB.prepare('SELECT id FROM clients WHERE cpf = ?').bind(cpf).first();
      if (existing) return new Response(JSON.stringify({ error: 'CPF já cadastrado.' }), { status: 400 });

      const newId = crypto.randomUUID();
      const now = new Date().toISOString();
      
      const passwordHash = body.password ? await hashPassword(body.password) : null;
      
      // Se não for admin, creditLimit e isSubscriber são forçados a 0
      const creditLimit = user?.role === 'admin' ? (parseFloat(body.creditLimit) || 0) : 0;
      const isSubscriber = user?.role === 'admin' ? (body.isSubscriber ? 1 : 0) : 0;

      await env.DB.prepare(
        'INSERT INTO clients (id, name, email, phone, cpf, street, number, zipCode, creditLimit, created_at, cloud_link, is_subscriber, password_hash) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
      ).bind(
        newId,
        String(body.name || '').trim(),
        body.email ? String(body.email).trim() : null,
        body.phone ? String(body.phone).trim() : null,
        cpf,
        body.address?.street ? String(body.address.street).trim() : null,
        body.address?.number ? String(body.address.number).trim() : null,
        body.address?.zipCode ? String(body.address.zipCode).trim() : null,
        creditLimit,
        now,
        body.cloudLink ? String(body.cloudLink).trim() : null,
        isSubscriber,
        passwordHash
      ).run();

      return Response.json({ success: true, id: newId });
    }

    if (request.method === 'PUT' && id) {
      if (!user) return new Response(JSON.stringify({ error: 'Não autorizado' }), { status: 401 });
      const body = await request.json() as any;
      
      // Apenas admin pode mudar creditLimit e isSubscriber
      if (user.role === 'admin') {
        await env.DB.prepare(
          'UPDATE clients SET name=?, email=?, phone=?, cpf=?, street=?, number=?, zipCode=?, creditLimit=?, cloud_link=?, is_subscriber=?, subscription_expires_at=? WHERE id=?'
        ).bind(
          String(body.name || '').trim(),
          body.email ? String(body.email).trim() : null,
          body.phone ? String(body.phone).trim() : null,
          body.cpf ? String(body.cpf).trim() : null,
          body.address?.street ? String(body.address.street).trim() : null,
          body.address?.number ? String(body.address.number).trim() : null,
          body.address?.zipCode ? String(body.address.zipCode).trim() : null,
          parseFloat(body.creditLimit) || 0,
          body.cloudLink ? String(body.cloudLink).trim() : null,
          body.isSubscriber ? 1 : 0,
          body.subscriptionExpiresAt ? String(body.subscriptionExpiresAt).trim() : null,
          String(id)
        ).run();
      } else if (user.clientId === id) {
        // Cliente pode atualizar seus próprios dados (exceto creditLimit e isSubscriber)
        await env.DB.prepare(
          'UPDATE clients SET name=?, email=?, phone=?, street=?, number=?, zipCode=? WHERE id=?'
        ).bind(
          String(body.name || '').trim(),
          body.email ? String(body.email).trim() : null,
          body.phone ? String(body.phone).trim() : null,
          body.address?.street ? String(body.address.street).trim() : null,
          body.address?.number ? String(body.address.number).trim() : null,
          body.address?.zipCode ? String(body.address.zipCode).trim() : null,
          String(id)
        ).run();
      } else {
        return new Response(JSON.stringify({ error: 'Acesso negado' }), { status: 403 });
      }
      
      return Response.json({ success: true });
    }

    if (request.method === 'DELETE' && id) {
      if (!user || user.role !== 'admin') return new Response(JSON.stringify({ error: 'Acesso negado' }), { status: 403 });
      await env.DB.prepare('DELETE FROM clients WHERE id = ?').bind(String(id)).run();
      return Response.json({ success: true });
    }

    return new Response(JSON.stringify({ error: 'Método não permitido' }), { status: 405 });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
};
