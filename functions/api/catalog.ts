
import { Env, getAuth } from './_auth';

export const onRequest: any = async ({ request, env }: { request: Request, env: Env }) => {
  try {
    const user = await getAuth(request, env);
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    const type = url.searchParams.get('type');
    const search = url.searchParams.get('search');

    // --- GET: Listagem ---
    if (request.method === 'GET') {
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
      
      const mappedResults = (results || []).map((row: any) => ({
        id: String(row.id),
        type: row.type || 'product',
        name: row.name,
        price: Number(row.price),
        costPrice: Number(row.cost_price || 0),
        imageUrl: row.image_url || row.imageUrl || null,
        description: row.description || null,
        active: row.active === 1,
        created_at: row.created_at
      }));
      
      return new Response(JSON.stringify(mappedResults), {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        }
      });
    }

    // --- Verificação de Permissão para Escrita ---
    if (!user || user.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Acesso negado' }), { status: 403 });
    }

    // --- Helpers de Normalização (Sanitização) ---
    // Garante TEXT ou NULL (nunca undefined)
    const toText = (val: any): string | null => {
      if (val === undefined || val === null) return null;
      const s = String(val).trim();
      return s === '' ? null : s;
    };

    // Garante REAL (nunca string ou undefined)
    const toNum = (val: any): number => {
      if (val === undefined || val === null) return 0;
      const s = String(val).replace(',', '.').trim();
      const n = parseFloat(s);
      return isNaN(n) ? 0 : n;
    };

    // Garante INTEGER (0 ou 1)
    const toIntBool = (val: any): number => {
      return val ? 1 : 0;
    };

    // --- POST: Criação ---
    if (request.method === 'POST') {
      const body = await request.json() as any;
      const newId = crypto.randomUUID();

      // Normalização Estrita dos Inputs
      const val_id = String(newId);
      const val_type = String(body.type || 'product');
      const val_name = String(body.name || '').trim(); // Obrigatório
      const val_price = toNum(body.price);
      const val_cost = toNum(body.cost_price || body.costPrice);
      const val_image = toText(body.imageUrl || body.image_url);
      const val_desc = toText(body.description);
      const val_active = 1; // Default na criação é sempre ativo (INTEGER)

      if (!val_name) {
        return new Response(JSON.stringify({ error: 'O nome é obrigatório' }), { status: 400 });
      }

      // Array de bind final (8 valores para 8 placeholders)
      const bindValues = [val_id, val_type, val_name, val_price, val_cost, val_image, val_desc, val_active];
      
      console.log('POST /catalog BIND:', JSON.stringify(bindValues));

      await env.DB.prepare(
        'INSERT INTO catalog (id, type, name, price, cost_price, image_url, description, active) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
      ).bind(...bindValues).run();

      return Response.json({ 
        id: val_id, 
        name: val_name, 
        price: val_price, 
        type: val_type,
        active: true
      });
    }

    // --- PUT: Atualização ---
    if (request.method === 'PUT') {
      if (!id) return new Response(JSON.stringify({ error: 'ID obrigatório' }), { status: 400 });

      const body = await request.json() as any;

      // Normalização Estrita
      const val_name = String(body.name || '').trim();
      const val_price = toNum(body.price);
      const val_cost = toNum(body.cost_price || body.costPrice);
      const val_image = toText(body.imageUrl || body.image_url);
      const val_desc = toText(body.description);
      
      // Construção Dinâmica da Query
      let query = 'UPDATE catalog SET name=?, price=?, cost_price=?, image_url=?, description=?';
      const args = [val_name, val_price, val_cost, val_image, val_desc];

      // Se 'active' vier no payload, atualiza também
      if (body.active !== undefined) {
        query += ', active=?';
        args.push(toIntBool(body.active));
      }

      query += ' WHERE id=?';
      args.push(String(id));

      console.log('PUT /catalog BIND:', JSON.stringify(args));

      await env.DB.prepare(query).bind(...args).run();

      return Response.json({ success: true });
    }

    // --- DELETE: Soft Delete ---
    if (request.method === 'DELETE') {
      if (!id) return new Response(JSON.stringify({ error: 'ID obrigatório' }), { status: 400 });

      console.log('DELETE /catalog ID:', id);
      
      // Soft Delete: active = 0 (INTEGER)
      await env.DB.prepare('UPDATE catalog SET active = 0 WHERE id = ?')
        .bind(String(id))
        .run();
      
      return Response.json({ success: true });
    }

    return new Response(JSON.stringify({ error: 'Método não permitido' }), { status: 405 });

  } catch (e: any) {
    console.error('API Error:', e.message);
    return new Response(JSON.stringify({ error: e.message, stack: e.stack }), { status: 500 });
  }
};
