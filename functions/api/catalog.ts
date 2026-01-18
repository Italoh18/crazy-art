
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
      // Mapeamos as colunas do banco para os nomes que o frontend espera
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
      return Response.json(results || []);
    }

    if (request.method === 'POST') {
      if (user.role !== 'admin') return new Response(JSON.stringify({ error: 'Acesso negado' }), { status: 403 });

      const body = await request.json() as any;

      // Extração e cast seguro dos 6 campos solicitados
      const itemType = String(body.type || 'product');
      const name = String(body.name || '').trim();
      const price = Number(parseFloat(String(body.price || '0').replace(',', '.')) || 0);
      const cost_price = Number(parseFloat(String(body.cost_price || body.costPrice || '0').replace(',', '.')) || 0);
      const image_url = body.imageUrl || body.image_url ? String(body.imageUrl || body.image_url).trim() : null;
      const description = body.description ? String(body.description).trim() : null;

      if (!name) return new Response(JSON.stringify({ error: 'O nome é obrigatório' }), { status: 400 });

      // INSERT com exatamente 6 placeholders conforme a especificação do prompt
      // Nota: Assume-se que 'id' e 'created_at' possuem valores padrão no banco (ex: UUID() e CURRENT_TIMESTAMP)
      // Caso contrário, adicione-os ao SQL e ao bind.
      await env.DB.prepare(
        'INSERT INTO catalog (type, name, price, cost_price, image_url, description) VALUES (?, ?, ?, ?, ?, ?)'
      ).bind(
        itemType,
        name,
        price,
        cost_price,
        image_url,
        description
      ).run();

      return Response.json({ success: true });
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
