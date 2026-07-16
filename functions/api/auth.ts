import { Env, createJWT, verifyPassword, hashPassword } from './_auth';

export const onRequestPost: any = async ({ request, env }: { request: Request, env: Env }) => {
  const ip = request.headers.get('cf-connecting-ip') || 'unknown';
  const body = await request.json() as any;
  const { code, email, password, twoFactorCode } = body;

  // Rate limiting: Verifica tentativas falhas nos últimos 15 minutos
  const now = Math.floor(Date.now() / 1000);
  const fifteenMinutesAgo = now - (15 * 60);

  // Garantir que a tabela existe (operacao leve se ja existir)
  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS login_attempts (
      ip TEXT PRIMARY KEY, 
      attempts INTEGER, 
      last_attempt INTEGER
    )
  `).run();

  // Garante que as colunas de dois fatores existem na tabela clients
  try {
    await env.DB.prepare('ALTER TABLE clients ADD COLUMN two_factor_enabled INTEGER DEFAULT 0').run();
  } catch (err) {}
  try {
    await env.DB.prepare('ALTER TABLE clients ADD COLUMN two_factor_code TEXT').run();
  } catch (err) {}

  const attemptRecord: any = await env.DB.prepare('SELECT * FROM login_attempts WHERE ip = ?')
    .bind(ip)
    .first();

  if (attemptRecord && attemptRecord.attempts >= 5 && attemptRecord.last_attempt > fifteenMinutesAgo) {
    return new Response(JSON.stringify({ 
      error: 'Muitas tentativas. Tente novamente em alguns minutos.' 
    }), { status: 429 });
  }

  const recordAttempt = async (success: boolean) => {
    if (success) {
      await env.DB.prepare('DELETE FROM login_attempts WHERE ip = ?').bind(ip).run();
    } else {
      const newAttempts = (attemptRecord?.attempts || 0) + 1;
      await env.DB.prepare('INSERT OR REPLACE INTO login_attempts (ip, attempts, last_attempt) VALUES (?, ?, ?)')
        .bind(ip, newAttempts, now)
        .run();
    }
  };

  // Verifica acesso administrativo via código secreto no banco de dados
  if (code) {
    const adminSetting: any = await env.DB.prepare('SELECT value FROM site_settings WHERE key = ?')
      .bind('admin_access_code')
      .first();
    
    if (adminSetting && code === adminSetting.value) {
      await recordAttempt(true);
      const token = await createJWT({ role: 'admin', userId: 'admin' }, env.JWT_SECRET);
      return Response.json({ token, role: 'admin' });
    }
    
    await recordAttempt(false);
    return new Response(JSON.stringify({ error: 'Código inválido' }), { status: 401 });
  }

  const mapClient = (c: any) => {
    if (!c) return null;
    const { password_hash, password_version, ...clientData } = c;
    return {
      ...clientData,
      cloudLink: c.cloudLink || c.cloud_link,
      isSubscriber: c.isSubscriber !== undefined ? c.isSubscriber : (c.is_subscriber === 1),
      subscriptionExpiresAt: c.subscriptionExpiresAt || c.subscription_expires_at,
      twoFactorEnabled: c.twoFactorEnabled !== undefined ? c.twoFactorEnabled : (c.two_factor_enabled === 1)
    };
  };

  if (email && password) {
    // Busca o usuário apenas pelo email
    const client: any = await env.DB.prepare('SELECT * FROM clients WHERE email = ?')
      .bind(email)
      .first();
    
    if (client && client.password_hash) {
      // Verifica a senha usando o helper que suporta ambas as versões
      const isValid = await verifyPassword(password, client.password_hash, client.password_version || 1);
      
      if (isValid) {
        // Verifica se a autenticação de dois fatores está ativa
        if (client.two_factor_enabled === 1) {
          if (!twoFactorCode) {
            // Gera código de 6 dígitos
            const code2FA = Math.floor(100000 + Math.random() * 900000).toString();
            await env.DB.prepare('UPDATE clients SET two_factor_code = ? WHERE id = ?')
              .bind(code2FA, client.id)
              .run();

            // Envia e-mail via Resend
            try {
              if (env.RESEND_API_KEY && env.SENDER_EMAIL) {
                await fetch("https://api.resend.com/emails", {
                  method: "POST",
                  headers: {
                    "Authorization": `Bearer ${env.RESEND_API_KEY}`,
                    "Content-Type": "application/json"
                  },
                  body: JSON.stringify({
                    from: env.SENDER_EMAIL,
                    to: client.email,
                    subject: `Código de Segurança (2FA): ${code2FA}`,
                    html: `
                      <div style="font-family: sans-serif; padding: 20px; color: #333;">
                        <h2 style="color: #4f46e5;">Crazy Art | Autenticação em Duas Etapas</h2>
                        <p>Olá, <strong>${client.name}</strong>!</p>
                        <p>Sua conta possui a autenticação de duas etapas ativa. Para concluir o seu login, utilize o código abaixo:</p>
                        <h1 style="font-size: 32px; letter-spacing: 5px; background: #f4f4f5; padding: 15px; display: inline-block; border-radius: 8px; color: #4f46e5; font-family: monospace; border: 1px solid #e4e4e7;">${code2FA}</h1>
                        <p>Se você não tentou realizar este login, ignore este e-mail ou altere sua senha por segurança.</p>
                        <p>Atenciosamente,<br><strong>Equipe Crazy Art</strong></p>
                      </div>
                    `
                  })
                });
              }
            } catch (errEmail) {
              console.error("Erro ao enviar email 2FA:", errEmail);
            }

            return Response.json({ twoFactorRequired: true, email: client.email });
          } else {
            // Verificar código 2FA enviado
            if (client.two_factor_code !== twoFactorCode) {
              await recordAttempt(false);
              return new Response(JSON.stringify({ error: 'Código de autenticação (2FA) inválido' }), { status: 401 });
            }
            
            // Limpa o código de 2 fatores após uso com sucesso
            await env.DB.prepare('UPDATE clients SET two_factor_code = NULL WHERE id = ?')
              .bind(client.id)
              .run();
          }
        }

        await recordAttempt(true);
        // Se o login for válido mas a versão for antiga (ou nula), migra para bcrypt
        if (!client.password_version || client.password_version < 2) {
          const newHash = await hashPassword(password);
          await env.DB.prepare('UPDATE clients SET password_hash = ?, password_version = 2 WHERE id = ?')
            .bind(newHash, client.id)
            .run();
          console.log(`Senha do usuário ${email} migrada para bcrypt (version 2)`);
        }

        const token = await createJWT({ role: 'client', clientId: client.id }, env.JWT_SECRET);
        return Response.json({ token, role: 'client', customer: mapClient(client) });
      }
    }
    
    await recordAttempt(false);
  }

  return new Response(JSON.stringify({ error: 'Credenciais inválidas' }), { status: 401 });
};
