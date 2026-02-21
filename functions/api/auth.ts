import { Env, createJWT, hashPassword } from './_auth';

export const onRequestPost: any = async ({ request, env }: { request: Request, env: Env }) => {
  const body = await request.json() as any;
  const { code, cpf, email, password } = body;

  if (code === '79913061') {
    const token = await createJWT({ role: 'admin' }, env.JWT_SECRET);
    return Response.json({ token, role: 'admin' });
  }

  if (email && password) {
    const hashedPassword = await hashPassword(password);
    const client: any = await env.DB.prepare('SELECT * FROM clients WHERE email = ? AND password_hash = ?')
      .bind(email, hashedPassword)
      .first();
    
    if (client) {
      const token = await createJWT({ role: 'client', clientId: client.id }, env.JWT_SECRET);
      return Response.json({ token, role: 'client', customer: client });
    }
  }

  if (cpf) {
    const client: any = await env.DB.prepare('SELECT * FROM clients WHERE cpf = ?').bind(cpf).first();
    if (client) {
      const token = await createJWT({ role: 'client', clientId: client.id }, env.JWT_SECRET);
      return Response.json({ token, role: 'client', customer: client });
    }
  }

  return new Response(JSON.stringify({ error: 'Credenciais inválidas' }), { status: 401 });
};