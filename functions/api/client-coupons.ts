import { Env, getAuth } from './_auth';

export const onRequest: any = async ({ request, env }: { request: Request, env: Env }) => {
  try {
    const user = await getAuth(request, env);
    if (!user) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), { status: 401 });
    }

    const clientId = user.clientId;
    if (!clientId && user.role === 'client') {
      return new Response(JSON.stringify({ error: 'Perfil de cliente não identificado' }), { status: 400 });
    }

    const effectiveClientId = user.role === 'admin' 
      ? new URL(request.url).searchParams.get('clientId') 
      : clientId;

    if (!effectiveClientId) {
      return new Response(JSON.stringify({ error: 'Identificação do cliente é obrigatória' }), { status: 400 });
    }

    const url = new URL(request.url);

    // GET /api/client-coupons - List coupons belonging to the user
    if (request.method === 'GET') {
      const { results } = await env.DB.prepare(
        'SELECT * FROM client_coupons WHERE client_id = ? ORDER BY claimed_at DESC'
      ).bind(effectiveClientId).all();
      return Response.json(results || []);
    }

    // POST /api/client-coupons - Claim/Add custom coupon to user list
    if (request.method === 'POST') {
      const body = await request.json() as any;
      if (!body.code) {
        return new Response(JSON.stringify({ error: 'Código de cupom obrigatório' }), { status: 400 });
      }

      const cleanCode = String(body.code).toUpperCase().trim().replace(/\s/g, '');

      // 1. Check if the coupon exists in system database
      const coupon: any = await env.DB.prepare('SELECT * FROM coupons WHERE code = ?').bind(cleanCode).first();
      if (!coupon) {
        return new Response(JSON.stringify({ error: 'Cupom inválido ou inexistente no sistema.' }), { status: 404 });
      }

      // 2. Check if already claimed and still active or used
      const existing: any = await env.DB.prepare(
        'SELECT * FROM client_coupons WHERE client_id = ? AND coupon_id = ?'
      ).bind(effectiveClientId, coupon.id).first();

      if (existing) {
        if (existing.is_used === 1) {
          return new Response(JSON.stringify({ error: 'Você já utilizou este cupom.' }), { status: 400 });
        }
        const nowMs = Date.now();
        const expiresMs = new Date(existing.expires_at).getTime();
        if (expiresMs > nowMs) {
          return new Response(JSON.stringify({ error: 'Este cupom já está ativo na sua lista.' }), { status: 400 });
        } else {
          return new Response(JSON.stringify({ error: 'Este cupom já expirou na sua conta.' }), { status: 400 });
        }
      }

      // 3. Add to client_coupons table with 30 days expiration date
      const newId = crypto.randomUUID();
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days valid

      await env.DB.prepare(
        'INSERT INTO client_coupons (id, client_id, coupon_id, code, percentage, type, claimed_at, expires_at, is_used) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)'
      ).bind(
        newId,
        effectiveClientId,
        coupon.id,
        coupon.code,
        Number(coupon.percentage),
        coupon.type,
        now.toISOString(),
        expiresAt.toISOString()
      ).run();

      return Response.json({ success: true, message: 'Cupom adicionado com sucesso!' });
    }

    return new Response(JSON.stringify({ error: 'Método não permitido' }), { status: 405 });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
};
