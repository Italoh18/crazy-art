
import * as jose from 'jose';

// Helper para converter base64url para Uint8Array
function base64urlToUint8Array(base64url: string) {
    const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
    const binary = atob(base64 + '==='.slice((base64.length + 3) % 4));
    return new Uint8Array(binary.length).map((_, i) => binary.charCodeAt(i));
}

// Criptografia Web Push (Simulação simplificada ou envio raw)
// A implementação real completa exigiria @web-push/encryption
async function encryptPayload(payload: any, subscription: any) {
    // Retornamos o JSON stringeado. Alguns gateways (como FCM se configurado para legacy/raw) aceitam.
    // Navegadores modernos podem exigir a criptografia AES-GCM.
    // Se o teste falhar com 400 'invalid payload', precisaremos da implementação completa.
    return new TextEncoder().encode(JSON.stringify(payload));
}

async function getVapidAuthHeader(env: any, endpoint: string) {
    const publicKey = env.VAPID_PUBLIC_KEY;
    const privateKey = env.VAPID_PRIVATE_KEY;
    const email = 'johnmedeirosh18@gmail.com';

    if (!publicKey || !privateKey) return null;

    try {
        const url = new URL(endpoint);
        const audience = `${url.protocol}//${url.hostname}`;

        let key;
        try {
            if (privateKey.includes('-----BEGIN')) {
                key = await jose.importPKCS8(privateKey, 'ES256');
            } else {
                const binary = base64urlToUint8Array(privateKey);
                if (binary.length === 32) {
                   const pubBinary = base64urlToUint8Array(publicKey);
                   const x = pubBinary.slice(1, 33);
                   const y = pubBinary.slice(33, 65);
                   
                   const jwk = {
                       kty: 'EC' as const,
                       crv: 'P-256' as const,
                       x: btoa(String.fromCharCode(...x)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_'),
                       y: btoa(String.fromCharCode(...y)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_'),
                       d: privateKey.replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_'),
                       ext: true
                   };
                   key = await jose.importJWK(jwk, 'ES256');
                } else {
                    key = await jose.importPKCS8(privateKey, 'ES256');
                }
            }
        } catch (e: any) {
            console.error('[JOSE Import] Erro:', e.message);
            throw new Error(`Chave privada inválida: ${e.message}`);
        }

        const jwt = await new jose.SignJWT({ sub: `mailto:${email}` })
            .setProtectedHeader({ alg: 'ES256' })
            .setAudience(audience)
            .setExpirationTime('12h')
            .sign(key);

        return `WebPush ${jwt}`;
    } catch (e: any) {
        console.error('[VAPID Signing] Erro:', e.message);
        throw e;
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
        const authHeader = await getVapidAuthHeader(env, subscription.endpoint);

        if (!authHeader) throw new Error('VAPID não configurado');

        const response = await fetch(subscription.endpoint, {
          method: 'POST',
          headers: {
            'Authorization': authHeader,
            'Crypto-Key': `p256ecdsa=${env.VAPID_PUBLIC_KEY}`,
            'TTL': '60',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload)
        });

        if (response.ok || response.status === 201) {
          successCount++;
        } else {
          failureCount++;
          const errorBody = await response.text();
          lastError = `Status ${response.status}: ${errorBody}`;
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

export async function notifyAdminsPush(env: any, payload: { title: string, body: string, url?: string }) {
    try {
        const { results: admins } = await env.DB.prepare(
            "SELECT id FROM users WHERE role = 'admin'"
        ).all();
        
        const adminIds = new Set<string>();
        if (admins) {
            admins.forEach((a: any) => adminIds.add(a.id));
        }
        adminIds.add('admin');

        for (const adminId of adminIds) {
            await sendPushNotification(env, adminId, payload);
        }
    } catch (e) {
        console.error('[Push] Erro ao notificar admins:', e);
    }
}
