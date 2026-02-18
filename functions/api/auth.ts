
import { Env, createJWT, hashPassword } from './_auth';

export const onRequestPost: any = async ({ request, env }: { request: Request, env: Env }) => {
  try {
    const body = await request.json() as any;
    const { code, email, password } = body;

    // Login Admin (Código)
    if (code) {
      if (code === '79913061') {
        const token = await createJWT({ role: 'admin' }, env.JWT_SECRET);
        return Response.json({ token, role: 'admin' });
      }
      return new Response(JSON.stringify({ error: 'Código inválido' }), { status: 401 });
    }

    // Login Cliente (Email + Senha)
    if (email && password) {
      const hashedPassword = await hashPassword(password);
      
      const client: any = await env.DB.prepare('SELECT * FROM clients WHERE email = ? AND password_hash = ?')
        .bind(email, hashedPassword)
        .first();
      
      if (client) {
        const token = await createJWT({ role: 'client', clientId: client.id }, env.JWT_SECRET);
        return Response.json({ token, role: 'client', customer: client });
      } else {
        return new Response(JSON.stringify({ error: 'E-mail ou senha incorretos' }), { status: 401 });
      }
    }

    return new Response(JSON.stringify({ error: 'Dados de login incompletos' }), { status: 400 });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
};
