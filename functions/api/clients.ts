
import { Env, getAuth, hashPassword } from './_auth';

export const onRequest: any = async ({ request, env }: { request: Request, env: Env }) => {
  try {
    const user = await getAuth(request, env);
    const url = new URL(request.url);
    const id = url.searchParams.get('id');

    if (request.method === 'GET') {
      if (id) {
        // Mapeia cloud_link snake_case para cloudLink camelCase no objeto único
        const client: any = await env.DB.prepare('SELECT *, cloud_link as cloudLink FROM clients WHERE id = ?').bind(String(id)).first();
        return Response.json(client);
      }
      
      // Protege listagem geral
      if (!user || user.role !== 'admin') return new Response(JSON.stringify({ error: 'Não autorizado' }), { status: 401 });

      // Mapeia cloud_link snake_case para cloudLink camelCase na lista
      const { results } = await env.DB.prepare(`
        SELECT 
          id, name, email, phone, cpf, street, number, zipCode, creditLimit, created_at, cloud_link as cloudLink 
        FROM clients ORDER BY created_at DESC
      `).all();
      
      return Response.json(results || []);
    }

    if (request.method === 'POST') {
      // POST agora pode ser público (Cadastro) ou Admin (Adicionar Cliente)
      // Se for admin logado, ok. Se não, verifica se é self-registration (implementado no front geralmente chamando essa rota)
      
      const body = await request.json() as any;
      
      const cpf = String(body.cpf || '').trim();
      
      // Validação de duplicidade
      const existing = await env.DB.prepare('SELECT id FROM clients WHERE cpf = ? OR (email IS NOT NULL AND email = ?)').bind(cpf, body.email).first();
      if (existing) return new Response(JSON.stringify({ error: 'CPF ou E-mail já cadastrado.' }), { status: 400 });

      const newId = crypto.randomUUID();
      const now = new Date().toISOString();
      
      let passwordHash = null;
      if (body.password) {
          passwordHash = await hashPassword(body.password);
      }
      
      await env.DB.prepare(
        'INSERT INTO clients (id, name, email, phone, cpf, street, number, zipCode, creditLimit, created_at, cloud_link, password_hash) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
      ).bind(
        newId,
        String(body.name || '').trim(),
        body.email ? String(body.email).trim() : null,
        body.phone ? String(body.phone).trim() : null,
        cpf,
        body.address?.street ? String(body.address.street).trim() : null,
        body.address?.number ? String(body.address.number).trim() : null,
        body.address?.zipCode ? String(body.address.zipCode).trim() : null,
        parseFloat(body.creditLimit) || 0,
        now,
        body.cloudLink ? String(body.cloudLink).trim() : null,
        passwordHash
      ).run();

      return Response.json({ success: true, id: newId });
    }

    if (request.method === 'PUT' && id) {
      if (!user) return new Response(JSON.stringify({ error: 'Não autorizado' }), { status: 401 });
      
      const body = await request.json() as any;
      
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
      if (!user || user.role !== 'admin') return new Response(JSON.stringify({ error: 'Acesso negado' }), { status: 403 });
      await env.DB.prepare('DELETE FROM clients WHERE id = ?').bind(String(id)).run();
      return Response.json({ success: true });
    }

    return new Response(JSON.stringify({ error: 'Método não permitido' }), { status: 405 });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
};
