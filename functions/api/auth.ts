import { Env, createJWT, verifyPassword, hashPassword } from './_auth';

export const onRequestPost: any = async ({ request, env }: { request: Request, env: Env }) => {
  const body = await request.json() as any;
  const { code, email, password } = body;

  // Verifica acesso administrativo via código secreto no banco de dados
  if (code) {
    const adminSetting: any = await env.DB.prepare('SELECT value FROM site_settings WHERE key = ?')
      .bind('admin_access_code')
      .first();
    
    if (adminSetting && code === adminSetting.value) {
      const token = await createJWT({ role: 'admin' }, env.JWT_SECRET);
      return Response.json({ token, role: 'admin' });
    }
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
  }

  return new Response(JSON.stringify({ error: 'Credenciais inválidas' }), { status: 401 });
};
