import { Env, createJWT, verifyPassword, hashPassword } from './_auth';

export const onRequestPost: any = async ({ request, env }: { request: Request, env: Env }) => {
  const ip = request.headers.get('cf-connecting-ip') || 'unknown';
  const body = await request.json() as any;
  const { code, email, password } = body;

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
      const token = await createJWT({ role: 'admin' }, env.JWT_SECRET);
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
      subscriptionExpiresAt: c.subscriptionExpiresAt || c.subscription_expires_at
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
