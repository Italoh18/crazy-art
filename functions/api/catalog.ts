
import { Env, getAuth } from './_auth';

export const onRequest: any = async ({ request, env }: { request: Request, env: Env }) => {
  try {
    const user = await getAuth(request, env);
    if (!user) return new Response(JSON.stringify({ error: 'Não autorizado' }), { status: 401 });

    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    const type = url.searchParams.get('type');
    const search = url.searchParams.get('search');

    if (request.method === 'GET') {
      let query = 'SELECT * FROM catalog';
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
      return Response.json(results || []);
    }

    if (request.method === 'POST') {
      if (user.role !== 'admin') return new Response(JSON.stringify({ error: 'Acesso negado' }), { status: 403 });

      const body = await request.json() as any;
      const newId = crypto.randomUUID();
      const now = new Date().toISOString();

      const name = String(body.name || '').trim();
      const price = parseFloat(String(body.price || '0').replace(',', '.')) || 0;
      const cost_price = body.cost_price || body.costPrice ? parseFloat(String(body.cost_price || body.costPrice).replace(',', '.')) || 0 : 0;
      const description = body.description ? String(body.description).trim() : null;
      const itemType = (body.type === 'service' ? 'service' : 'product');
      const imageUrl = body.imageUrl ? String(body.imageUrl).trim() : null;

      if (!name) return new Response(JSON.stringify({ error: 'O nome é obrigatório' }), { status: 400 });

      // 8 campos -> 8 placeholders (Uso de cost_price conforme solicitado)
      await env.DB.prepare(
        'INSERT INTO catalog (id, name, price, cost_price, description, type, imageUrl, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
      ).bind(newId, name, price, cost_price, description, itemType, imageUrl, now).run();

      return Response.json({ success: true, id: newId });
    }

    if (request.method === 'DELETE' && id) {
      if (user.role !== 'admin') return new Response(JSON.stringify({ error: 'Acesso negado' }), { status: 403 });
      await env.DB.prepare('DELETE FROM catalog WHERE id = ?').bind(String(id)).run();
      return Response.json({ success: true });
    }

    return new Response(JSON.stringify({ error: 'Método não permitido' }), { status: 405 });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
};
