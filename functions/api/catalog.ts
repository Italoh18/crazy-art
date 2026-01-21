
import { Env, getAuth } from './_auth';

export const onRequest: any = async ({ request, env }: { request: Request, env: Env }) => {
  try {
    const user = await getAuth(request, env);
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    const type = url.searchParams.get('type');
    const search = url.searchParams.get('search');

    // --- GET: Listagem (Agora lendo de catalog_v2) ---
    if (request.method === 'GET') {
      let query = 'SELECT * FROM catalog_v2 WHERE active = 1';
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

    // --- Verificação de Permissão ---
    if (!user || user.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Acesso negado' }), { status: 403 });
    }

    // --- Helpers de Sanitização (Tipagem Estrita) ---
    const toText = (val: any): string | null => {
      if (val === undefined || val === null || val === 'null') return null;
      const s = String(val).trim();
      return s === '' ? null : s;
    };

    const toNum = (val: any): number => {
      if (val === undefined || val === null) return 0;
      // Trata vírgulas e converte para float
      const s = String(val).replace(',', '.').replace(/[^0-9.-]/g, '').trim();
      const n = parseFloat(s);
      return isFinite(n) ? n : 0;
    };

    const toInt = (val: any): number => {
      // Converte boolean ou string para 0 ou 1
      if (val === true || val === 'true' || val === 1 || val === '1') return 1;
      return 0;
    };

    // --- POST: Criação em catalog_v2 ---
    if (request.method === 'POST') {
      const body = await request.json() as any;
      const newId = crypto.randomUUID();

      // Preparação dos dados com tipos garantidos
      const val_id = String(newId);
      const val_type = String(body.type || 'product');
      const val_name = String(body.name || '').trim();
      const val_price = toNum(body.price);
      const val_cost = toNum(body.cost_price || body.costPrice);
      const val_image = toText(body.imageUrl || body.image_url);
      const val_desc = toText(body.description);
      const val_active = 1; // Sempre ativo na criação (INTEGER)

      if (!val_name) {
        return new Response(JSON.stringify({ error: 'O nome é obrigatório' }), { status: 400 });
      }

      // DIAGNÓSTICO: Log dos tipos exatos antes do bind
      const bindValues = [val_id, val_type, val_name, val_price, val_cost, val_image, val_desc, val_active];
      console.log('INSERT catalog_v2 TYPES:', bindValues.map(v => typeof v));
      console.log('INSERT catalog_v2 VALUES:', JSON.stringify(bindValues));

      await env.DB.prepare(
        'INSERT INTO catalog_v2 (id, type, name, price, cost_price, image_url, description, active) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
      ).bind(...bindValues).run();

      return Response.json({ 
        id: val_id, 
        name: val_name, 
        price: val_price, 
        type: val_type,
        success: true
      });
    }

    // --- PUT: Atualização em catalog_v2 ---
    if (request.method === 'PUT') {
      if (!id) return new Response(JSON.stringify({ error: 'ID obrigatório' }), { status: 400 });

      const body = await request.json() as any;

      const val_name = String(body.name || '').trim();
      const val_price = toNum(body.price);
      const val_cost = toNum(body.cost_price || body.costPrice);
      const val_image = toText(body.imageUrl || body.image_url);
      const val_desc = toText(body.description);
      
      let query = 'UPDATE catalog_v2 SET name=?, price=?, cost_price=?, image_url=?, description=?';
      const args = [val_name, val_price, val_cost, val_image, val_desc];

      if (body.active !== undefined) {
        query += ', active=?';
        args.push(toInt(body.active));
      }

      query += ' WHERE id=?';
      args.push(String(id));

      console.log('UPDATE catalog_v2 TYPES:', args.map(v => typeof v));
      
      await env.DB.prepare(query).bind(...args).run();

      return Response.json({ success: true });
    }

    // --- DELETE: Soft Delete em catalog_v2 ---
    if (request.method === 'DELETE') {
      if (!id) return new Response(JSON.stringify({ error: 'ID obrigatório' }), { status: 400 });

      // Soft delete: active = 0 (INTEGER)
      await env.DB.prepare('UPDATE catalog_v2 SET active = 0 WHERE id = ?')
        .bind(String(id))
        .run();
      
      return Response.json({ success: true });
    }

    return new Response(JSON.stringify({ error: 'Método não permitido' }), { status: 405 });

  } catch (e: any) {
    console.error('API Error:', e.message);
    return new Response(JSON.stringify({ 
      error: e.message, 
      stack: e.stack,
      hint: "Verifique se a tabela catalog_v2 foi criada (execute migrations_v2.sql)"
    }), { status: 500 });
  }
};
