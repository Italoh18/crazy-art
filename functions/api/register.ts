
import { Env, hashPassword } from './_auth';

// Fix: Use any to resolve "Cannot find name 'PagesFunction'" error
export const onRequestPost: any = async ({ request, env }: { request: Request, env: Env }) => {
  try {
    const { email, password } = await request.json() as any;
    if (!email || !password) return new Response('Dados inválidos', { status: 400 });

    const hashedPassword = await hashPassword(password);
    const id = crypto.randomUUID();

    await env.DB.prepare('INSERT INTO users (id, email, password) VALUES (?, ?, ?)')
      .bind(id, email, hashedPassword)
      .run();

    return new Response(JSON.stringify({ success: true }), { 
      headers: { 'Content-Type': 'application/json' } 
    });
  } catch (e: any) {
    return new Response(e.message, { status: 500 });
  }
};
