
import { Env, hashPassword, createJWT } from './_auth';

// Fix: Use any to resolve "Cannot find name 'PagesFunction'" error
export const onRequestPost: any = async ({ request, env }: { request: Request, env: Env }) => {
  try {
    const { email, password } = await request.json() as any;
    const hashedPassword = await hashPassword(password);

    const user: any = await env.DB.prepare('SELECT * FROM users WHERE email = ? AND password = ?')
      .bind(email, hashedPassword)
      .first();

    if (!user) {
      return new Response(JSON.stringify({ error: 'Credenciais inválidas' }), { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const token = await createJWT({ userId: user.id, email: user.email }, env.JWT_SECRET);

    return new Response(JSON.stringify({ token, user: { email: user.email } }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (e: any) {
    return new Response(e.message, { status: 500 });
  }
};
