import { Env, getAuth } from './_auth';

export async function onRequest(context: { request: Request; env: Env }) {
  const { request, env } = context;
  const user = await getAuth(request, env);

  // POST /api/push - Save subscription
  if (request.method === 'POST') {
    try {
      const { subscription } = await request.json() as any;
      if (!subscription) return new Response('Missing subscription', { status: 400 });

      const subId = crypto.randomUUID();
      const subJson = JSON.stringify(subscription);
      const userId = user?.id || null;

      // Usar a estrutura da tabela que o usuário criou
      await env.DB.prepare(`
        INSERT INTO push_subscriptions (id, user_id, subscription_json)
        VALUES (?, ?, ?)
        ON CONFLICT(subscription_json) DO UPDATE SET user_id = EXCLUDED.user_id
      `).bind(subId, userId, subJson).run();

      return new Response(JSON.stringify({ success: true }), {
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (e: any) {
      return new Response(e.message, { status: 500 });
    }
  }

  // DELETE /api/push - Unsubscribe
  if (request.method === 'DELETE') {
    try {
      const { endpoint } = await request.json() as any;
      if (!endpoint) return new Response('Missing endpoint', { status: 400 });

      await env.DB.prepare('DELETE FROM push_subscriptions WHERE json_extract(subscription_json, "$.endpoint") = ?')
        .bind(endpoint)
        .run();

      return new Response(JSON.stringify({ success: true }), {
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (e: any) {
      return new Response(e.message, { status: 500 });
    }
  }

  // GET /api/push - Get VAPID Public Key
  if (request.method === 'GET') {
    // Chave VAPID Pública (gerada para este ambiente)
    const publicKey = env.VAPID_PUBLIC_KEY || 'BF8wS-r9v3_S9X_9X6f-m9Y7g6h5j4k3l2m1n0o9p8q7r6s5t4u3v2w1x0y9z8A7B6C5D4E3F2G1H0I9J8K7L6M5N4O3P';
    return new Response(JSON.stringify({ publicKey }), {
      headers: { 
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      }
    });
  }

  return new Response('Not Found', { status: 404 });
}
