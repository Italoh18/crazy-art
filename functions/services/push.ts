
// Implementação de Web Push compatível com o ambiente Cloudflare Workers
// Evita o módulo 'crypto' do Node.js que causa o erro "crypto.createECDH is not implemented yet"

async function signVapid(env: any, endpoint: string) {
  const publicKey = env.VAPID_PUBLIC_KEY;
  const privateKey = env.VAPID_PRIVATE_KEY;
  const email = 'johnmedeirosh18@gmail.com';

  const url = new URL(endpoint);
  const audience = `${url.protocol}//${url.hostname}`;
  
  const header = { alg: 'ES256', typ: 'JWT' };
  const payload = {
    aud: audience,
    exp: Math.floor(Date.now() / 1000) + 12 * 60 * 60, // 12 horas
    sub: `mailto:${email}`
  };

  const encode = (obj: any) => btoa(JSON.stringify(obj)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const tokenInput = `${encode(header)}.${encode(payload)}`;

  try {
    // Importar a chave privada VAPID (formato PKCS8 base64-url)
    const pemContents = privateKey.replace(/---.*---|\s/g, '');
    const binaryDerString = atob(pemContents.replace(/-/g, '+').replace(/_/g, '/'));
    const binaryDer = new Uint8Array(binaryDerString.length);
    for (let i = 0; i < binaryDerString.length; i++) binaryDer[i] = binaryDerString.charCodeAt(i);

    const key = await crypto.subtle.importKey(
      'pkcs8',
      binaryDer,
      { name: 'ECDSA', namedCurve: 'P-256' },
      false,
      ['sign']
    );

    const signature = await crypto.subtle.sign(
      { name: 'ECDSA', hash: { name: 'SHA-256' } },
      key,
      new TextEncoder().encode(tokenInput)
    );

    const signatureBase64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
      .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

    return `${tokenInput}.${signatureBase64}`;
  } catch (e) {
    console.error('[VAPID] Erro ao assinar:', e);
    return null;
  }
}

export async function sendPushNotification(env: any, userId: string, payload: { title: string, body: string, url?: string }) {
  try {
    const { results } = await env.DB.prepare(
      "SELECT id, subscription_json FROM push_subscriptions WHERE user_id = ?"
    ).bind(userId).all();

    const count = results?.length || 0;
    if (count === 0) return { count: 0, success: 0, failure: 0 };

    let successCount = 0;
    let failureCount = 0;
    let lastError = '';

    for (const row of results) {
      try {
        const subscription = JSON.parse(row.subscription_json);
        const vapidToken = await signVapid(env, subscription.endpoint);

        if (!vapidToken) {
          throw new Error('Falha ao gerar token VAPID');
        }

        const response = await fetch(subscription.endpoint, {
          method: 'POST',
          headers: {
            'TTL': '60',
            'Urgency': 'high',
            'Authorization': `WebPush ${vapidToken}`,
            'Crypto-Key': `p256ecdsa=${env.VAPID_PUBLIC_KEY}`
          },
          body: JSON.stringify(payload)
        });

        if (response.ok || response.status === 201) {
          successCount++;
        } else {
          failureCount++;
          const body = await response.text();
          lastError = `Status ${response.status}: ${body}`;
          if (response.status === 404 || response.status === 410) {
            await env.DB.prepare("DELETE FROM push_subscriptions WHERE id = ?").bind(row.id).run();
          }
        }
      } catch (err: any) {
        failureCount++;
        lastError = err.message;
      }
    }

    return { count, success: successCount, failure: failureCount, error: lastError };
  } catch (e: any) {
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
