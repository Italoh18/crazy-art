
import { Env, getAuth } from './_auth';

export const onRequest: any = async ({ request, env }: { request: Request, env: Env }) => {
  const requestId = crypto.randomUUID().slice(0, 8);
  console.log(`[${requestId}] Início da requisição: ${request.method}`);

  try {
    const user = await getAuth(request, env);
    if (!user) {
      console.warn(`[${requestId}] Tentativa de acesso não autorizado.`);
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
        return Response.json(client);
      }
      const { results } = await env.DB.prepare('SELECT * FROM clients ORDER BY name ASC').all();
      return Response.json(results || []);
    }

    // POST - Criar
    if (request.method === 'POST') {
      if (user.role !== 'admin') return new Response(JSON.stringify({ error: 'Acesso negado' }), { status: 403 });
      
      const body = await request.json() as any;
      console.log(`[${requestId}] Payload recebido para INSERT:`, JSON.stringify(body));

      const newId = crypto.randomUUID();
      
      // NORMALIZAÇÃO ESTRITA: Cloudflare D1 falha se receber 'undefined' no bind
      const params = [
        newId,                                          // id
        String(body.name || '').trim(),                 // name
        String(body.email || '').trim() || null,        // email
        String(body.phone || '').trim() || null,        // phone
        String(body.cpf || '').trim(),                  // cpf
        String(body.address?.street || body.street || '').trim() || null,
        String(body.address?.number || body.number || '').trim() || null,
        String(body.address?.zipCode || body.zipCode || '').trim() || null,
        Number(body.creditLimit || 0)                   // creditLimit
      ];

      console.log(`[${requestId}] Parâmetros normalizados para SQL:`, JSON.stringify(params));

      const stmt = env.DB.prepare(
        'INSERT INTO clients (id, name, email, phone, cpf, street, number, zipCode, creditLimit) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
      ).bind(...params);

      const result = await stmt.run();
      
      console.log(`[${requestId}] Resultado da execução D1:`, JSON.stringify(result));

      if (!result.success) {
        throw new Error(`Erro retornado pelo D1: ${result.error || 'Falha desconhecida no INSERT'}`);
      }
      
      return Response.json({ 
        id: newId, 
        success: true, 
        meta: result.meta 
      });
    }

    // PUT - Atualizar
    if (request.method === 'PUT' && id) {
      if (user.role !== 'admin') return new Response(JSON.stringify({ error: 'Acesso negado' }), { status: 403 });
      
      const body = await request.json() as any;
      console.log(`[${requestId}] Payload recebido para UPDATE (id: ${id}):`, JSON.stringify(body));

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

      console.log(`[${requestId}] Resultado Update:`, JSON.stringify(result));

      if (!result.success) {
        throw new Error(`Erro retornado pelo D1: ${result.error || 'Falha no UPDATE'}`);
      }
      
      return Response.json({ success: result.success });
    }

    // DELETE - Remover
    if (request.method === 'DELETE' && id) {
      if (user.role !== 'admin') return new Response(JSON.stringify({ error: 'Acesso negado' }), { status: 403 });
      console.log(`[${requestId}] Removendo cliente id: ${id}`);
      const result = await env.DB.prepare('DELETE FROM clients WHERE id = ?').bind(id).run();
      return Response.json({ success: result.success });
    }

    return new Response(JSON.stringify({ error: 'Método não permitido' }), { status: 405 });
  } catch (e: any) {
    console.error(`[${requestId}] ERRO CRÍTICO D1:`, e.message);
    return new Response(JSON.stringify({ 
      error: 'Erro de persistência no D1', 
      details: e.message,
      requestId
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
