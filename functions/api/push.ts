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
    const publicKey = env.VAPID_PUBLIC_KEY || 'BEl62vp95WthAs9v5q97f-1q6p65FmY0u6GubX1Y4C-D3Fh9Y-7y5JvL-6Y8R5T8a0Xh_Z_1o6h4z-8j8y5w';
    return new Response(JSON.stringify({ publicKey }), {
      headers: { 
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      }
    });
  }

  return new Response('Not Found', { status: 404 });
}
