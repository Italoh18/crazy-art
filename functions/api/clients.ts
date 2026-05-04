
import { Env, getAuth, hashPassword } from './_auth';

export const onRequest: any = async ({ request, env }: { request: Request, env: Env }) => {
  try {
    const user = await getAuth(request, env);
    const url = new URL(request.url);
    const id = url.searchParams.get('id');

    const mapClient = (c: any) => {
      if (!c) return null;
      const { password_hash, password_version, ...clientData } = c;
      return {
        ...clientData,
        cloudLink: c.cloudLink || c.cloud_link,
        isSubscriber: c.isSubscriber !== undefined ? c.isSubscriber : (c.is_subscriber === 1),
        subscriptionExpiresAt: c.subscriptionExpiresAt || c.subscription_expires_at
      };
    };

    if (request.method === 'GET') {
      if (!user) return new Response(JSON.stringify({ error: 'Não autorizado' }), { status: 401 });
      
      const page = Math.max(1, parseInt(url.searchParams.get('page') || '0'));
      const limit = Math.max(1, Math.min(100, parseInt(url.searchParams.get('limit') || '1000')));
      const offset = (page - 1) * limit;
      const isPaged = url.searchParams.has('page') || url.searchParams.has('limit');

      // Se for admin, pode ver qualquer um ou listar todos
      if (user.role === 'admin') {
        if (id) {
          const client: any = await env.DB.prepare('SELECT * FROM clients WHERE id = ?').bind(String(id)).first();
          return Response.json(mapClient(client));
        }
        
        let totalCount = 0;
        if (isPaged) {
            const countResult: any = await env.DB.prepare('SELECT COUNT(*) as total FROM clients').first();
            totalCount = countResult?.total || 0;
        }

        let query = 'SELECT * FROM clients ORDER BY created_at DESC';
        let params: any[] = [];
        
        if (isPaged) {
            query += ' LIMIT ? OFFSET ?';
            params.push(limit, offset);
        } else {
            query += ' LIMIT 1000';
        }

        const { results } = params.length > 0 ? await env.DB.prepare(query).bind(...params).all() : await env.DB.prepare(query).all();
        const mappedResults = (results || []).map(mapClient);

        if (isPaged) {
            return Response.json({
                data: mappedResults,
                total: totalCount,
                page,
                limit
            });
        }
        return Response.json(mappedResults);
      } 
      
      // Se for cliente comum, só pode ver a SI MESMO
      if (user.role === 'client') {
        const targetId = id || user.clientId; // Se não passar ID, assume o próprio
        
        // Se tentar ver um ID diferente do seu, bloqueia
        if (id && id !== user.clientId) {
          return new Response(JSON.stringify({ error: 'Acesso negado' }), { status: 403 });
        }

        const client: any = await env.DB.prepare('SELECT * FROM clients WHERE id = ?').bind(String(targetId)).first();
        return Response.json(mapClient(client));
      }

      return new Response(JSON.stringify({ error: 'Acesso negado' }), { status: 403 });
    }

    if (request.method === 'POST') {
      const body = await request.json() as any;
      
      const cpf = String(body.cpf || '').trim();
      const existing = await env.DB.prepare('SELECT id FROM clients WHERE cpf = ?').bind(cpf).first();
      if (existing) return new Response(JSON.stringify({ error: 'CPF já cadastrado.' }), { status: 400 });

      const newId = crypto.randomUUID();
      const now = new Date().toISOString();
      
      const passwordHash = body.password ? await hashPassword(body.password) : null;
      const passwordVersion = passwordHash ? 2 : 1;
      
      // Se não for admin, creditLimit e isSubscriber são forçados a 0
      const creditLimitVal = body.creditLimit !== undefined ? body.creditLimit : body.credit_limit;
      const creditLimit = user?.role === 'admin' ? (parseFloat(creditLimitVal) || 0) : 0;
      
      const isSubscriberVal = body.isSubscriber !== undefined ? body.isSubscriber : body.is_subscriber;
      const isSubscriber = user?.role === 'admin' ? (isSubscriberVal ? 1 : 0) : 0;

      await env.DB.prepare(
        'INSERT INTO clients (id, name, email, phone, cpf, street, number, zipCode, creditLimit, created_at, cloud_link, is_subscriber, password_hash, password_version) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
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
        body.cloudLink || body.cloud_link ? String(body.cloudLink || body.cloud_link).trim() : null,
        isSubscriber,
        passwordHash,
        passwordVersion
      ).run();

      return Response.json({ success: true, id: newId });
    }

    if (request.method === 'PUT' && id) {
      if (!user) return new Response(JSON.stringify({ error: 'Não autorizado' }), { status: 401 });
      const body = await request.json() as any;
      
      // Apenas admin pode mudar creditLimit e isSubscriber
      if (user.role === 'admin') {
        const passwordHash = body.password ? await hashPassword(body.password) : undefined;
        
        const creditLimitVal = body.creditLimit !== undefined ? body.creditLimit : body.credit_limit;
        const creditLimit = parseFloat(creditLimitVal) || 0;
        
        const isSubscriberVal = body.isSubscriber !== undefined ? body.isSubscriber : body.is_subscriber;
        const isSubscriber = isSubscriberVal ? 1 : 0;

        const cloudLink = body.cloudLink || body.cloud_link;
        const subscriptionExpiresAt = body.subscriptionExpiresAt || body.subscription_expires_at;

        if (passwordHash) {
          await env.DB.prepare(
            'UPDATE clients SET name=?, email=?, phone=?, cpf=?, street=?, number=?, zipCode=?, creditLimit=?, cloud_link=?, is_subscriber=?, subscription_expires_at=?, password_hash=?, password_version=2 WHERE id=?'
          ).bind(
            String(body.name || '').trim(),
            body.email ? String(body.email).trim() : null,
            body.phone ? String(body.phone).trim() : null,
            body.cpf ? String(body.cpf).trim() : null,
            body.address?.street ? String(body.address.street).trim() : null,
            body.address?.number ? String(body.address.number).trim() : null,
            body.address?.zipCode ? String(body.address.zipCode).trim() : null,
            creditLimit,
            cloudLink ? String(cloudLink).trim() : null,
            isSubscriber,
            subscriptionExpiresAt ? String(subscriptionExpiresAt).trim() : null,
            passwordHash,
            String(id)
          ).run();
        } else {
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
            creditLimit,
            cloudLink ? String(cloudLink).trim() : null,
            isSubscriber,
            subscriptionExpiresAt ? String(subscriptionExpiresAt).trim() : null,
            String(id)
          ).run();
        }
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
      
      const updatedClient = await env.DB.prepare('SELECT * FROM clients WHERE id = ?').bind(String(id)).first();
      return Response.json({ success: true, client: mapClient(updatedClient) });
    }

    if (request.method === 'DELETE' && id) {
      if (!user || user.role !== 'admin') return new Response(JSON.stringify({ error: 'Acesso negado' }), { status: 403 });
      await env.DB.prepare('DELETE FROM clients WHERE id = ?').bind(String(id)).run();
      return Response.json({ success: true });
    }

    return new Response(JSON.stringify({ error: 'Método não permitido' }), { status: 405 });
  } catch (e: any) {
    console.error("Erro na API de Clientes:", e.message);
    return new Response(JSON.stringify({ error: 'Erro interno ao processar dados de clientes.' }), { status: 500 });
  }
};
