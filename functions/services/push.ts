
import * as jose from 'jose';

// Helper para converter base64url para Uint8Array
function base64urlToUint8Array(base64url: string) {
    const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
    const binary = atob(base64 + '==='.slice((base64.length + 3) % 4));
    return new Uint8Array(binary.length).map((_, i) => binary.charCodeAt(i));
}

// Criptografia Web Push (Simulação simplificada ou envio raw)
// A implementação real completa exigiria @web-push/encryption
async function hkdf(salt: Uint8Array, ikm: Uint8Array, info: Uint8Array, length: number): Promise<Uint8Array> {
    const key = await crypto.subtle.importKey(
        'raw',
        ikm as unknown as BufferSource,
        { name: 'HKDF' },
        false,
        ['deriveBits']
    );
    const bits = await crypto.subtle.deriveBits(
        {
            name: 'HKDF',
            hash: 'SHA-256',
            salt: salt as unknown as BufferSource,
            info: info as unknown as BufferSource,
        },
        key,
        length * 8
    );
    return new Uint8Array(bits);
}

async function encryptPayload(payload: any, subscription: any) {
    const uaPublic = base64urlToUint8Array(subscription.keys.p256dh);
    const authSecret = base64urlToUint8Array(subscription.keys.auth);

    const asKey = await crypto.subtle.generateKey(
        { name: 'ECDH', namedCurve: 'P-256' },
        true,
        ['deriveBits']
    );

    const asPublic = new Uint8Array(await crypto.subtle.exportKey('raw', asKey.publicKey));

    const uaKey = await crypto.subtle.importKey(
        'raw',
        uaPublic as unknown as BufferSource,
        { name: 'ECDH', namedCurve: 'P-256' },
        false,
        []
    );

    const ecdhSecretBits = await crypto.subtle.deriveBits(
        { name: 'ECDH', public: uaKey },
        asKey.privateKey,
        256
    );
    const ecdhSecret = new Uint8Array(ecdhSecretBits);

    const infoWebPush = new TextEncoder().encode("WebPush: info\0");
    const ikmInfo = new Uint8Array(infoWebPush.length + uaPublic.length + asPublic.length);
    ikmInfo.set(infoWebPush, 0);
    ikmInfo.set(uaPublic, infoWebPush.length);
    ikmInfo.set(asPublic, infoWebPush.length + uaPublic.length);

    const IKM = await hkdf(authSecret, ecdhSecret, ikmInfo, 32);

    const salt = crypto.getRandomValues(new Uint8Array(16));

    const infoCek = new TextEncoder().encode("Content-Encoding: aes128gcm\0");
    const CEK = await hkdf(salt, IKM, infoCek, 16);

    const infoNonce = new TextEncoder().encode("Content-Encoding: nonce\0");
    const NONCE = await hkdf(salt, IKM, infoNonce, 12);

    const jsonStr = JSON.stringify(payload);
    const jsonBytes = new TextEncoder().encode(jsonStr);
    const text = new Uint8Array(jsonBytes.length + 1);
    text.set(jsonBytes, 0);
    text[jsonBytes.length] = 0x02;

    const cekKey = await crypto.subtle.importKey(
        'raw',
        CEK as unknown as BufferSource,
        { name: 'AES-GCM' },
        false,
        ['encrypt']
    );

    const ciphertextBuf = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: NONCE as unknown as BufferSource },
        cekKey,
        text as unknown as BufferSource
    );
    const ciphertext = new Uint8Array(ciphertextBuf);

    const rs = new Uint8Array([0, 0, 16, 0]); // 4096
    const idlen = new Uint8Array([65]);

    const corpo = new Uint8Array(16 + 4 + 1 + asPublic.length + ciphertext.length);
    let offset = 0;
    corpo.set(salt, offset); offset += 16;
    corpo.set(rs, offset); offset += 4;
    corpo.set(idlen, offset); offset += 1;
    corpo.set(asPublic, offset); offset += asPublic.length;
    corpo.set(ciphertext, offset);

    return corpo;
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

        const encryptedBody = await encryptPayload(payload, subscription);

        const response = await fetch(subscription.endpoint, {
          method: 'POST',
          headers: {
            'Authorization': authHeader,
            'Crypto-Key': `p256ecdsa=${env.VAPID_PUBLIC_KEY}`,
            'TTL': '60',
            'Content-Type': 'application/octet-stream',
            'Content-Encoding': 'aes128gcm',
          },
          body: encryptedBody
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
        const adminIds = new Set<string>();
        
        // O administrador padrão sempre usa o ID 'admin'
        adminIds.add('admin');

        // Se houver futuramente uma tabela de usuários admins, ela poderia ser consultada aqui com try/catch
        try {
            const { results: admins } = await env.DB.prepare(
                "SELECT id FROM clients WHERE role = 'admin' OR is_verified = -1" 
            ).all().catch(() => ({ results: [] })); // Fallback seguro se não houver coluna role
            
            if (admins) {
                admins.forEach((a: any) => adminIds.add(a.id));
            }
        } catch (e) {
            // Ignora erro de tabela/coluna inexistente
        }

        // Enviar para todos os admins em paralelo
        const pushPromises = Array.from(adminIds).map(adminId => 
            sendPushNotification(env, adminId, payload)
        );
        
        const results = await Promise.allSettled(pushPromises);
        console.log('[Push] Resultado do envio para admins:', JSON.stringify(results));
    } catch (e) {
        console.error('[Push] Erro ao notificar admins:', e);
    }
}
