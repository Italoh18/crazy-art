
import webpush from 'web-push';

export async function sendPushNotification(env: any, userId: string, payload: { title: string, body: string, url?: string }) {
  const publicKey = env.VAPID_PUBLIC_KEY;
  const privateKey = env.VAPID_PRIVATE_KEY;
  
  if (!publicKey || !privateKey) {
    console.warn('[Push] Chaves VAPID não configuradas no ambiente.');
    return { count: 0, success: 0, failure: 0, error: 'Chaves não configuradas' };
  }

  try {
    webpush.setVapidDetails(
      'mailto:johnmedeirosh18@gmail.com',
      publicKey,
      privateKey
    );

    const { results } = await env.DB.prepare(
      "SELECT id, subscription_json FROM push_subscriptions WHERE user_id = ?"
    ).bind(userId).all();

    const count = results?.length || 0;
    if (count === 0) return { count: 0, success: 0, failure: 0 };

    let successCount = 0;
    let failureCount = 0;

    const pushPromises = results.map(async (row: any) => {
      try {
        const subscription = JSON.parse(row.subscription_json);
        await webpush.sendNotification(subscription, JSON.stringify(payload));
        successCount++;
      } catch (error: any) {
        failureCount++;
        if (error.statusCode === 404 || error.statusCode === 410) {
          await env.DB.prepare("DELETE FROM push_subscriptions WHERE id = ?").bind(row.id).run();
        }
      }
    });

    await Promise.allSettled(pushPromises);
    return { count, success: successCount, failure: failureCount };
  } catch (e: any) {
    console.error('[Push] Erro geral:', e.message);
    return { count: 0, success: 0, failure: 0, error: e.message };
  }
}

// Helper para notificar todos os admins
export async function notifyAdminsPush(env: any, payload: { title: string, body: string, url?: string }) {
    try {
        // Busca administradores na tabela de usuários
        const { results: admins } = await env.DB.prepare(
            "SELECT id FROM users WHERE role = 'admin'"
        ).all();

        const adminIds = new Set<string>();
        if (admins) {
            admins.forEach((a: any) => adminIds.add(a.id));
        }
        
        // Sempre incluir o ID fixo 'admin' (usado pelo login de código)
        adminIds.add('admin');

        console.log(`[Push] Notificando ${adminIds.size} possíveis administradores:`, Array.from(adminIds));

        for (const adminId of adminIds) {
            await sendPushNotification(env, adminId, payload);
        }
    } catch (e) {
        console.error('[Push] Erro ao notificar admins:', e);
    }
}
