
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
    const type = url.searchParams.get('type');
    const search = url.searchParams.get('search');

    // GET - Listar itens do catálogo
    if (request.method === 'GET') {
      let query = 'SELECT * FROM catalog';
      let params: any[] = [];
      let conditions: string[] = [];

      if (type) {
        conditions.push('type = ?');
        params.push(type);
      }

      if (search) {
        conditions.push('name LIKE ?');
        params.push(`%${search}%`);
      }

      if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
      }

      query += ' ORDER BY created_at DESC';

      const { results } = await env.DB.prepare(query).bind(...params).all();
      return new Response(JSON.stringify(results || []), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // POST - Criar item no catálogo (Produto ou Serviço)
    if (request.method === 'POST') {
      if (user.role !== 'admin') {
        return new Response(JSON.stringify({ error: 'Acesso negado' }), { status: 403 });
      }

      const body = await request.json() as any;
      const newId = crypto.randomUUID();
      const now = new Date().toISOString();

      // Sanitização e normalização rigorosa para D1
      const name = String(body.name || '').trim();
      const price = parseFloat(String(body.price || '0').replace(',', '.')) || 0;
      const costPrice = body.costPrice ? parseFloat(String(body.costPrice).replace(',', '.')) || 0 : 0;
      const description = String(body.description || '').trim() || null;
      const itemType = (body.type === 'service' ? 'service' : 'product');
      const imageUrl = String(body.imageUrl || '').trim() || null;

      if (!name) {
        return new Response(JSON.stringify({ error: 'O nome é obrigatório' }), { status: 400 });
      }

      const params = [
        newId,
        name,
        price,
        costPrice,
        description,
        itemType,
        imageUrl,
        now
      ];

      await env.DB.prepare(
        'INSERT INTO catalog (id, name, price, costPrice, description, type, imageUrl, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
      ).bind(...params).run();

      return new Response(JSON.stringify({ 
        success: true, 
        id: newId, 
        name, 
        price, 
        type: itemType 
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // DELETE - Remover item
    if (request.method === 'DELETE' && id) {
      if (user.role !== 'admin') {
        return new Response(JSON.stringify({ error: 'Acesso negado' }), { status: 403 });
      }

      await env.DB.prepare('DELETE FROM catalog WHERE id = ?').bind(id).run();
      
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
