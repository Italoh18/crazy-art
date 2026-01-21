
import { Env, getAuth } from './_auth';

export const onRequest: any = async ({ request, env }: { request: Request, env: Env }) => {
  try {
    const user = await getAuth(request, env);
    const url = new URL(request.url);
    const idParam = url.searchParams.get('id');
    const typeParam = url.searchParams.get('type');
    const searchParam = url.searchParams.get('search');

    // --- Helpers de Normalização (Tipagem Estrita) ---
    // Garante retorno String ou null (nunca undefined)
    const toText = (val: any): string | null => {
      if (val === undefined || val === null || val === 'null' || val === '') return null;
      return String(val).trim();
    };

    // Garante retorno Number (nunca string, nunca NaN)
    const toNum = (val: any): number => {
      if (val === undefined || val === null || val === '') return 0;
      // Trata inputs como "10,50" ou "R$ 10.00"
      const s = String(val).replace(',', '.').replace(/[^0-9.-]/g, '');
      const n = parseFloat(s);
      return isFinite(n) ? n : 0;
    };

    // Garante INTEGER 0 ou 1
    const toIntBool = (val: any): number => {
      if (val === true || val === 'true' || val === 1 || val === '1') return 1;
      return 0;
    };

    // --- GET: Listagem ---
    if (request.method === 'GET') {
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

      const stmt = env.DB.prepare(query);
      const { results } = params.length > 0 ? await stmt.bind(...params).all() : await stmt.all();
      
      const mappedResults = (results || []).map((row: any) => ({
        id: String(row.id), // Converte ID numérico do banco para string pro React
        type: row.type || 'product',
        name: row.name,
        price: Number(row.price),
        costPrice: Number(row.cost_price || row.cost || 0),
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

    // --- POST: Criação ---
    if (request.method === 'POST') {
      const body = await request.json() as any;

      // Normalização dos dados
      const val_type = String(body.type || 'product');
      const val_name = String(body.name || '').trim();
      const val_price = toNum(body.price);
      // Pega o custo de qualquer um dos campos possíveis
      const val_cost_base = toNum(body.costPrice || body.cost_price || body.cost);
      const val_image = toText(body.imageUrl || body.image_url);
      const val_desc = toText(body.description);
      const val_active = 1; // Sempre 1 (INTEGER) ao criar

      if (!val_name) {
        return new Response(JSON.stringify({ error: 'O nome é obrigatório' }), { status: 400 });
      }

      // Query exata solicitada: 8 placeholders
      // Colunas: type, name, price, cost, cost_price, image_url, description, active
      const query = `INSERT INTO catalog (type, name, price, cost, cost_price, image_url, description, active) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;

      const bindValues = [
        val_type,      // TEXT
        val_name,      // TEXT
        val_price,     // REAL
        val_cost_base, // REAL (coluna cost)
        val_cost_base, // REAL (coluna cost_price) - duplicado intencionalmente
        val_image,     // TEXT (ou null)
        val_desc,      // TEXT (ou null)
        val_active     // INTEGER
      ];

      // LOG DIAGNÓSTICO
      console.log('POST /catalog TYPES:', bindValues.map(v => v === null ? 'null' : typeof v));
      console.log('POST /catalog VALUES:', JSON.stringify(bindValues));

      const result = await env.DB.prepare(query).bind(...bindValues).run();

      return Response.json({ 
        success: true,
        id: String(result.meta.last_row_id), // Retorna o ID gerado pelo AutoIncrement
        name: val_name,
        type: val_type
      });
    }

    // --- PUT: Atualização ---
    if (request.method === 'PUT') {
      if (!idParam) return new Response(JSON.stringify({ error: 'ID obrigatório' }), { status: 400 });

      const body = await request.json() as any;

      const val_name = String(body.name || '').trim();
      const val_price = toNum(body.price);
      const val_cost_base = toNum(body.costPrice || body.cost_price || body.cost);
      const val_image = toText(body.imageUrl || body.image_url);
      const val_desc = toText(body.description);
      
      // Atualiza ambos os campos de custo para manter consistência
      let query = 'UPDATE catalog SET name=?, price=?, cost=?, cost_price=?, image_url=?, description=?';
      const args = [val_name, val_price, val_cost_base, val_cost_base, val_image, val_desc];

      if (body.active !== undefined) {
        query += ', active=?';
        args.push(toIntBool(body.active));
      }

      query += ' WHERE id=?';
      args.push(Number(idParam)); // ID é INTEGER no DB

      console.log('PUT /catalog ARGS:', JSON.stringify(args));

      await env.DB.prepare(query).bind(...args).run();

      return Response.json({ success: true });
    }

    // --- DELETE: Soft Delete ---
    if (request.method === 'DELETE') {
      if (!idParam) return new Response(JSON.stringify({ error: 'ID obrigatório' }), { status: 400 });

      console.log('DELETE /catalog ID:', idParam);
      
      await env.DB.prepare('UPDATE catalog SET active = 0 WHERE id = ?')
        .bind(Number(idParam)) // ID é INTEGER
        .run();
      
      return Response.json({ success: true });
    }

    return new Response(JSON.stringify({ error: 'Método não permitido' }), { status: 405 });

  } catch (e: any) {
    console.error('API Error:', e.message);
    return new Response(JSON.stringify({ 
      error: e.message, 
      stack: e.stack,
      hint: "Erro SQLITE_MISMATCH? Verifique se os tipos REAL e INTEGER estão corretos."
    }), { status: 500 });
  }
};
