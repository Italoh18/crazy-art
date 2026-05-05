
import webpush from 'web-push';

export async function sendPushNotification(env: any, target: { userId?: string | null, role?: 'admin' | 'client' }, payload: { title: string, message: string, url?: string }) {
  const publicKey = env.VAPID_PUBLIC_KEY;
  const privateKey = env.VAPID_PRIVATE_KEY;

  if (!publicKey || !privateKey) {
    console.error('VAPID keys not configured');
    return;
  }

  webpush.setVapidDetails(
    'mailto:admin@crazyart.com.br',
    publicKey,
    privateKey
  );

  let query = 'SELECT subscription_json FROM push_subscriptions';
  let params: any[] = [];

  if (target.userId) {
    query += ' WHERE user_id = ?';
    params.push(target.userId);
  } else if (target.role === 'admin') {
    // Para admin, buscamos usuários com role admin ou sem user_id (se salvamos assim)
    // No nosso caso, o login de admin tem um ID.
    // Vamos buscar inscricoes de usuarios que sao admins
    query = `
      SELECT ps.subscription_json 
      FROM push_subscriptions ps
      JOIN users u ON ps.user_id = u.id
      WHERE u.role = 'admin'
    `;
  }

  try {
    const { results } = await env.DB.prepare(query).bind(...params).all();

    if (!results || results.length === 0) return;

    const pushPayload = JSON.stringify({
      title: payload.title,
      message: payload.message,
      url: payload.url || '/',
      icon: '/icons/icon-192.svg'
    });

    const promises = results.map(async (row: any) => {
      try {
        const sub = JSON.parse(row.subscription_json);
        await webpush.sendNotification(sub, pushPayload);
      } catch (error: any) {
        if (error.statusCode === 404 || error.statusCode === 410) {
          // Inscrição expirada ou inválida - remover do banco
          const sub = JSON.parse(row.subscription_json);
          await env.DB.prepare('DELETE FROM push_subscriptions WHERE json_extract(subscription_json, "$.endpoint") = ?')
            .bind(sub.endpoint)
            .run();
        }
        console.error('Error sending push notification:', error);
      }
    });

    await Promise.all(promises);
  } catch (e) {
    console.error('Push Service Error:', e);
  }
}
