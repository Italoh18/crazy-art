
import { Env, getAuth } from './_auth';

export const onRequest: any = async ({ request, env }: { request: Request, env: Env }) => {
  try {
    const user = await getAuth(request, env);
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    const type = url.searchParams.get('type');
    const search = url.searchParams.get('search');

    // GET - Listagem com mapeamento robusto
    if (request.method === 'GET') {
      // Usamos SELECT * para garantir que pegamos as colunas originais do banco (snake_case)
      // e evitamos problemas com aliases SQL diretos que podem falhar em drivers específicos
      let query = 'SELECT * FROM catalog WHERE active = 1';
      let params: any[] = [];

      if (type && type !== 'undefined') {
        query += ' AND type = ?';
        params.push(String(type));
      }
      if (search && search !== 'undefined') {
        query += ' AND name LIKE ?';
        params.push(`%${String(search)}%`);
      }

      query += ' ORDER BY created_at DESC';

      const stmt = env.DB.prepare(query);
      const { results } = params.length > 0 ? await stmt.bind(...params).all() : await stmt.all();
      
      // Mapeamento Explícito: Garante que o frontend receba exatamente o que espera
      const mappedResults = (results || []).map((row: any) => ({
        id: String(row.id), // Força string para evitar problemas se o D1 retornar número ou objeto
        type: row.type || 'product',
        name: row.name,
        price: Number(row.price),
        costPrice: Number(row.cost_price || 0), // Mapeia snake_case para camelCase
        imageUrl: row.image_url || row.imageUrl || null, // Suporta ambos os casos por segurança
        description: row.description || null,
        created_at: row.created_at
      }));
      
      return new Response(JSON.stringify(mappedResults), {
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

      // Inserir novo item (active default é 1 via banco ou explícito aqui)
      await env.DB.prepare(
        'INSERT INTO catalog (id, type, name, price, cost_price, image_url, description, active) VALUES (?, ?, ?, ?, ?, ?, ?, 1)'
      ).bind(
        newId,
        itemType,
        name,
        price,
        cost_price,
        image_url,
        description
      ).run();

      return Response.json({ 
        id: newId, 
        name, 
        price, 
        type: itemType, 
        description, 
        costPrice: cost_price,
        imageUrl: image_url
      });
    }

    // PUT - Atualização
    if (request.method === 'PUT') {
      if (!user || user.role !== 'admin') return new Response(JSON.stringify({ error: 'Acesso negado' }), { status: 403 });
      
      if (!id) return new Response(JSON.stringify({ error: 'ID é obrigatório para atualização' }), { status: 400 });

      const body = await request.json() as any;
      
      const name = String(body.name || '').trim();
      const price = Number(parseFloat(String(body.price || '0').replace(',', '.')) || 0);
      const cost_price = Number(parseFloat(String(body.cost_price || body.costPrice || '0').replace(',', '.')) || 0);
      const image_url = body.imageUrl || body.image_url ? String(body.imageUrl || body.image_url).trim() : null;
      const description = body.description ? String(body.description).trim() : null;

      await env.DB.prepare(
        'UPDATE catalog SET name=?, price=?, cost_price=?, image_url=?, description=? WHERE id=?'
      ).bind(
        name,
        price,
        cost_price,
        image_url,
        description,
        String(id)
      ).run();

      return Response.json({ success: true });
    }

    // DELETE - Executa SOFT DELETE (Update active = 0)
    if (request.method === 'DELETE') {
      if (!user || user.role !== 'admin') return new Response(JSON.stringify({ error: 'Acesso negado' }), { status: 403 });
      
      if (!id) return new Response(JSON.stringify({ error: 'ID é obrigatório para exclusão' }), { status: 400 });

      // Ao invés de DELETE FROM..., usamos UPDATE para manter histórico nos pedidos
      const result = await env.DB.prepare('UPDATE catalog SET active = 0 WHERE id = ?').bind(String(id)).run();
      
      return Response.json({ success: result.success });
    }

    return new Response(JSON.stringify({ error: 'Método não permitido' }), { status: 405 });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
};
