
import { Env, getAuth } from './_auth';

export const onRequest: any = async ({ request, env }: { request: Request, env: Env }) => {
  try {
    const user = await getAuth(request, env);
    const url = new URL(request.url);
    const idParam = url.searchParams.get('id');
    const typeParam = url.searchParams.get('type');
    const searchParam = url.searchParams.get('search');

    const toText = (val: any): string | null => {
      if (val === undefined || val === null || val === 'null' || val === '') return null;
      return String(val).trim();
    };

    const toNum = (val: any): number => {
      if (val === undefined || val === null || val === '') return 0;
      const s = String(val).replace(',', '.').replace(/[^0-9.-]/g, '');
      const n = parseFloat(s);
      return isFinite(n) ? n : 0;
    };

    const toIntBool = (val: any): number => {
      if (val === true || val === 'true' || val === 1 || val === '1') return 1;
      return 0;
    };

    if (request.method === 'GET') {
      // Tentativa de buscar da tabela 'catalog' primeiro
      let query = 'SELECT * FROM catalog WHERE active = 1';
      const params: any[] = [];

      if (typeParam && typeParam !== 'undefined') {
        query += ' AND type = ?';
        params.push(String(typeParam));
      }
      if (searchParam && searchParam !== 'undefined') {
        query += ' AND name LIKE ?';
        params.push(`%${String(searchParam)}%`);
      }

      query += ' ORDER BY created_at DESC';

      try {
        const stmt = env.DB.prepare(query);
        const { results } = params.length > 0 ? await stmt.bind(...params).all() : await stmt.all();
        
        let isSubscriber = false;
        if (user && user.role === 'client' && user.clientId) {
          const client: any = await env.DB.prepare('SELECT is_subscriber FROM clients WHERE id = ?').bind(user.clientId).first();
          isSubscriber = client?.is_subscriber === 1;
        }

        const mappedResults = (results || []).map((row: any) => {
          const isArt = row.type === 'art';
          const base = {
            id: String(row.id),
            type: row.type || 'product',
            name: row.name,
            price: Number(row.price),
            imageUrl: row.image_url || row.imageUrl || null,
            subcategory: row.subcategory || null,
            primaryColor: row.primary_color || null,
            description: row.description || null,
            priceVariations: row.price_variations ? JSON.parse(row.price_variations) : [],
            active: row.active === 1,
            created_at: row.created_at
          };
          
          if (user?.role === 'admin') {
            return {
              ...base,
              costPrice: Number(row.cost_price || row.cost || 0),
              downloadLink: row.download_link || null,
              supplierLink: row.supplier_link || null
            };
          }

          if (isSubscriber && isArt) {
            return {
              ...base,
              downloadLink: row.download_link || null
            };
          }

          return base;
        });
        
        return Response.json(mappedResults);
      } catch (sqlError: any) {
          // Se a tabela 'catalog' não existir, tenta 'products' como fallback
          if (sqlError.message.includes('no such table')) {
              const fallback = await env.DB.prepare('SELECT * FROM products').all();
              return Response.json(fallback.results || []);
          }
          throw sqlError;
      }
    }

    if (!user || user.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Acesso negado' }), { status: 403 });
    }

    if (request.method === 'POST') {
      const body = await request.json() as any;
      const val_type = String(body.type || 'product');
      const val_name = String(body.name || '').trim();
      const val_price = toNum(body.price);
      const val_cost_base = toNum(body.costPrice || body.cost_price || body.cost);
      const val_image = toText(body.imageUrl || body.image_url);
      const val_download = toText(body.downloadLink || body.download_link);
      const val_sub = toText(body.subcategory);
      const val_color = toText(body.primaryColor);
      const val_desc = toText(body.description);
      const val_variations = body.priceVariations ? JSON.stringify(body.priceVariations) : null;
      const val_supplier = toText(body.supplierLink || body.supplier_link);
      const val_active = 1;

      if (!val_name) return new Response(JSON.stringify({ error: 'O nome é obrigatório' }), { status: 400 });

      const query = `INSERT INTO catalog (type, name, price, cost, cost_price, image_url, download_link, subcategory, primary_color, description, price_variations, supplier_link, active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
      const bindValues = [val_type, val_name, val_price, val_cost_base, val_cost_base, val_image, val_download, val_sub, val_color, val_desc, val_variations, val_supplier, val_active];

      const result = await env.DB.prepare(query).bind(...bindValues).run();
      return Response.json({ success: true, id: String(result.meta.last_row_id) });
    }

    if (request.method === 'PUT') {
      if (!idParam) return new Response(JSON.stringify({ error: 'ID obrigatório' }), { status: 400 });
      const body = await request.json() as any;

      const val_name = String(body.name || '').trim();
      const val_price = toNum(body.price);
      const val_cost_base = toNum(body.costPrice || body.cost_price || body.cost);
      const val_image = toText(body.imageUrl || body.image_url);
      const val_download = toText(body.downloadLink || body.download_link);
      const val_sub = toText(body.subcategory);
      const val_color = toText(body.primaryColor);
      const val_desc = toText(body.description);
      const val_variations = body.priceVariations ? JSON.stringify(body.priceVariations) : null;
      const val_supplier = toText(body.supplierLink || body.supplier_link);
      
      let query = 'UPDATE catalog SET name=?, price=?, cost=?, cost_price=?, image_url=?, download_link=?, subcategory=?, primary_color=?, description=?, price_variations=?, supplier_link=?';
      const args = [val_name, val_price, val_cost_base, val_cost_base, val_image, val_download, val_sub, val_color, val_desc, val_variations, val_supplier];

      if (body.active !== undefined) {
        query += ', active=?';
        args.push(toIntBool(body.active));
      }

      query += ' WHERE id=?';
      args.push(Number(idParam));

      await env.DB.prepare(query).bind(...args).run();
      return Response.json({ success: true });
    }

    if (request.method === 'DELETE') {
      if (!idParam) return new Response(JSON.stringify({ error: 'ID obrigatório' }), { status: 400 });
      await env.DB.prepare('UPDATE catalog SET active = 0 WHERE id = ?').bind(Number(idParam)).run();
      return Response.json({ success: true });
    }

    return new Response(JSON.stringify({ error: 'Método não permitido' }), { status: 405 });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
};
