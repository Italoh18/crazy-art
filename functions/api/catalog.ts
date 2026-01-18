
import { Env, getAuth } from './_auth';

export const onRequest: any = async ({ request, env }: { request: Request, env: Env }) => {
  try {
    const user = await getAuth(request, env);
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    const type = url.searchParams.get('type');
    const search = url.searchParams.get('search');

    // GET - Listagem com mapeamento para camelCase
    if (request.method === 'GET') {
      let query = 'SELECT id, type, name, price, cost_price as costPrice, image_url as imageUrl, description, created_at FROM catalog';
      let params: any[] = [];
      let conditions: string[] = [];

      if (type && type !== 'undefined') {
        conditions.push('type = ?');
        params.push(String(type));
      }
      if (search && search !== 'undefined') {
        conditions.push('name LIKE ?');
        params.push(`%${String(search)}%`);
      }

      if (conditions.length > 0) query += ' WHERE ' + conditions.join(' AND ');
      query += ' ORDER BY created_at DESC';

      const stmt = env.DB.prepare(query);
      const { results } = params.length > 0 ? await stmt.bind(...params).all() : await stmt.all();
      
      // Retornamos com headers que PROÍBEM o cache
      return new Response(JSON.stringify(results || []), {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
    }

    // POST - Cadastro
    if (request.method === 'POST') {
      if (!user || user.role !== 'admin') return new Response(JSON.stringify({ error: 'Acesso negado' }), { status: 403 });

      const body = await request.json() as any;
      const newId = crypto.randomUUID();

      const itemType = String(body.type || 'product');
      const name = String(body.name || '').trim();
      const price = Number(parseFloat(String(body.price || '0').replace(',', '.')) || 0);
      const cost_price = Number(parseFloat(String(body.cost_price || body.costPrice || '0').replace(',', '.')) || 0);
      const image_url = body.imageUrl || body.image_url ? String(body.imageUrl || body.image_url).trim() : null;
      const description = body.description ? String(body.description).trim() : null;

      if (!name) return new Response(JSON.stringify({ error: 'O nome é obrigatório' }), { status: 400 });

      await env.DB.prepare(
        'INSERT INTO catalog (id, type, name, price, cost_price, image_url, description) VALUES (?, ?, ?, ?, ?, ?, ?)'
      ).bind(
        newId,
        itemType,
        name,
        price,
        cost_price,
        image_url,
        description
      ).run();

      return Response.json({ success: true, id: newId });
    }

    // DELETE - Exclusão por ID
    if (request.method === 'DELETE') {
      if (!user || user.role !== 'admin') return new Response(JSON.stringify({ error: 'Acesso negado' }), { status: 403 });
      
      if (!id) return new Response(JSON.stringify({ error: 'ID é obrigatório para exclusão' }), { status: 400 });

      const result = await env.DB.prepare('DELETE FROM catalog WHERE id = ?').bind(String(id)).run();
      
      return Response.json({ success: result.success });
    }

    return new Response(JSON.stringify({ error: 'Método não permitido' }), { status: 405 });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
};
