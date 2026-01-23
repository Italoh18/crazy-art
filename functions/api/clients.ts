
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
      // Mapeamento para camelCase se necessário, mas o SELECT * geralmente retorna as colunas como estão no banco (snake_case ou camelCase dependendo de como foi criado)
      // Como criamos cloud_link (snake_case) no migration, vamos garantir que o frontend receba cloudLink (camelCase) se fizermos map, 
      // mas o DataContext.tsx atual usa normalizeCustomer que espera as propriedades.
      // O DB retorna cloud_link. O frontend espera cloudLink? Vamos ajustar na query ou no normalize.
      // Ajuste: Vamos retornar cloud_link como cloudLink na query SQL para facilitar.
      const { results: mappedResults } = await env.DB.prepare(`
        SELECT 
          id, name, email, phone, cpf, street, number, zipCode, creditLimit, created_at, cloud_link as cloudLink 
        FROM clients ORDER BY created_at DESC
      `).all();
      
      return Response.json(mappedResults || []);
    }

    if (request.method === 'POST') {
      if (user.role !== 'admin') return new Response(JSON.stringify({ error: 'Acesso negado' }), { status: 403 });
      const body = await request.json() as any;
      
      const cpf = String(body.cpf || '').trim();
      const existing = await env.DB.prepare('SELECT id FROM clients WHERE cpf = ?').bind(cpf).first();
      if (existing) return new Response(JSON.stringify({ error: 'CPF já cadastrado.' }), { status: 400 });

      const newId = crypto.randomUUID();
      const now = new Date().toISOString();
      
      // 11 campos -> 11 placeholders (cloud_link adicionado)
      await env.DB.prepare(
        'INSERT INTO clients (id, name, email, phone, cpf, street, number, zipCode, creditLimit, created_at, cloud_link) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
      ).bind(
        newId,
        String(body.name || '').trim(),
        body.email ? String(body.email).trim() : null,
        body.phone ? String(body.phone).trim() : null,
        cpf,
        body.address?.street ? String(body.address.street).trim() : null,
        body.address?.number ? String(body.address.number).trim() : null,
        body.address?.zipCode ? String(body.address.zipCode).trim() : null,
        parseFloat(body.creditLimit) || 50.0,
        now,
        body.cloudLink ? String(body.cloudLink).trim() : null
      ).run();

      return Response.json({ success: true, id: newId });
    }

    if (request.method === 'PUT' && id) {
      const body = await request.json() as any;
      // 9 placeholders (8 SET + 1 WHERE)
      // Atualizando cloud_link
      await env.DB.prepare(
        'UPDATE clients SET name=?, email=?, phone=?, street=?, number=?, zipCode=?, creditLimit=?, cloud_link=? WHERE id=?'
      ).bind(
        String(body.name || '').trim(),
        body.email ? String(body.email).trim() : null,
        body.phone ? String(body.phone).trim() : null,
        body.address?.street ? String(body.address.street).trim() : null,
        body.address?.number ? String(body.address.number).trim() : null,
        body.address?.zipCode ? String(body.address.zipCode).trim() : null,
        parseFloat(body.creditLimit) || 0,
        body.cloudLink ? String(body.cloudLink).trim() : null,
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
