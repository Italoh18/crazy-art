
import webpush from 'web-push';

export async function sendPushNotification(env: any, userId: string, payload: { title: string, body: string, url?: string }) {
  const publicKey = env.VAPID_PUBLIC_KEY;
  const privateKey = env.VAPID_PRIVATE_KEY;
  
  // Se não houver chaves, silencia para não quebrar o fluxo principal
  if (!publicKey || !privateKey) {
    console.warn('[Push] Chaves VAPID não configuradas no ambiente.');
    return;
  }

  try {
    webpush.setVapidDetails(
      'mailto:admin@crazyart.com.br',
      publicKey,
      privateKey
    );

    // Buscar todas as inscrições do usuário (ele pode estar logado em múltiplos dispositivos)
    const { results } = await env.DB.prepare(
      "SELECT id, subscription_json FROM push_subscriptions WHERE user_id = ?"
    ).bind(userId).all();

    const count = results?.length || 0;
    console.log(`[Push] Tentando enviar para usuário ${userId}. Inscrições encontradas: ${count}`);

    if (count === 0) {
        console.warn(`[Push] Nenhuma inscrição (dispositivo) encontrada para o usuário: ${userId}. Certifique-se de que clicou em ATIVAR neste dispositivo.`);
        return;
    }

    const pushPromises = results.map(async (row: any) => {
      try {
        const subscription = JSON.parse(row.subscription_json);
        console.log(`[Push] Enviando para endpoint: ${subscription.endpoint?.slice(-30)}...`);
        const response = await webpush.sendNotification(subscription, JSON.stringify(payload));
        console.log(`[Push] Resposta do gateway de push: ${response.statusCode}`);
      } catch (error: any) {
        console.error('[Push] Erro na inscrição', row.id, ':', error.message, 'Status:', error.statusCode);
        // Se a inscrição expirou (404/410), removemos
        if (error.statusCode === 404 || error.statusCode === 410) {
          await env.DB.prepare("DELETE FROM push_subscriptions WHERE id = ?").bind(row.id).run();
        }
      }
    });

    await Promise.allSettled(pushPromises);
  } catch (e: any) {
    console.error('[Push] Erro geral no sistema de push:', e.message);
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
