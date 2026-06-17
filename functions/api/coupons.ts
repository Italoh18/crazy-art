
import { Env, getAuth } from './_auth';

export const onRequest: any = async ({ request, env }: { request: Request, env: Env }) => {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    const code = url.searchParams.get('code');

    // GET: Listar Cupons (Admin) ou Validar (Público/Cliente)
    if (request.method === 'GET') {
      // Validação por código (Usado no checkout)
      if (code) {
        const coupon: any = await env.DB.prepare('SELECT * FROM coupons WHERE code = ?').bind(code.toUpperCase().trim()).first();
        if (!coupon) return new Response(JSON.stringify({ error: 'Cupom inválido.' }), { status: 404 });
        return Response.json(coupon);
      }

      // Listagem (Apenas Admin)
      const user = await getAuth(request, env);
      if (!user || user.role !== 'admin') {
        return new Response(JSON.stringify({ error: 'Não autorizado' }), { status: 401 });
      }

      const { results } = await env.DB.prepare('SELECT * FROM coupons ORDER BY created_at DESC').all();
      return Response.json(results || []);
    }

    // POST: Criar Cupom (Apenas Admin)
    if (request.method === 'POST') {
      const user = await getAuth(request, env);
      if (!user || user.role !== 'admin') {
        return new Response(JSON.stringify({ error: 'Não autorizado' }), { status: 401 });
      }

      const body = await request.json() as any;
      if (!body.code || !body.percentage) return new Response(JSON.stringify({ error: 'Dados incompletos' }), { status: 400 });

      const newId = crypto.randomUUID();
      const now = new Date().toISOString();
      const cleanCode = String(body.code).toUpperCase().trim().replace(/\s/g, '');
      const percentageNum = Number(body.percentage);
      const couponType = String(body.type || 'all');

      try {
        await env.DB.prepare(
            'INSERT INTO coupons (id, code, percentage, type, created_at) VALUES (?, ?, ?, ?, ?)'
        ).bind(
            newId,
            cleanCode,
            percentageNum,
            couponType,
            now
        ).run();

        // Destinar o cupom se solicitado
        const assignType = body.assignType || 'none';
        const nowObj = new Date();
        const expiresAt = new Date(nowObj.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();

        if (assignType === 'specific' && body.assignClientId) {
          const clientCouponId = crypto.randomUUID();
          await env.DB.prepare(
            'INSERT INTO client_coupons (id, client_id, coupon_id, code, percentage, type, claimed_at, expires_at, is_used) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)'
          ).bind(
            clientCouponId,
            body.assignClientId,
            newId,
            cleanCode,
            percentageNum,
            couponType,
            now,
            expiresAt
          ).run();
        } else if (assignType === 'all') {
          const { results: allClients } = await env.DB.prepare('SELECT id FROM clients').all();
          if (allClients && allClients.length > 0) {
            const statements = [];
            for (const client of allClients) {
              const clientCouponId = crypto.randomUUID();
              statements.push(
                env.DB.prepare(
                  'INSERT INTO client_coupons (id, client_id, coupon_id, code, percentage, type, claimed_at, expires_at, is_used) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)'
                ).bind(
                  clientCouponId,
                  client.id,
                  newId,
                  cleanCode,
                  percentageNum,
                  couponType,
                  now,
                  expiresAt
                )
              );
            }
            await env.DB.batch(statements);
          }
        }
      } catch (dbError: any) {
          if (dbError.message && dbError.message.includes('UNIQUE')) {
              return new Response(JSON.stringify({ error: 'Código de cupom já existe.' }), { status: 409 });
          }
          return new Response(JSON.stringify({ error: `Erro no banco de dados ao criar/distribuir cupom: ${dbError.message}` }), { status: 500 });
      }

      return Response.json({ success: true, id: newId });
    }

    // DELETE: Remover Cupom (Apenas Admin)
    if (request.method === 'DELETE' && id) {
      const user = await getAuth(request, env);
      if (!user || user.role !== 'admin') {
        return new Response(JSON.stringify({ error: 'Não autorizado' }), { status: 401 });
      }

      await env.DB.prepare('DELETE FROM coupons WHERE id = ?').bind(id).run();
      return Response.json({ success: true });
    }

    return new Response(JSON.stringify({ error: 'Método não permitido' }), { status: 405 });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
};
