
import { Env, getAuth } from './_auth';

export const onRequestPost: any = async ({ request, env }: { request: Request, env: Env }) => {
  try {
    const body = await request.json() as any;
    
    if (!body.rating) {
      return new Response(JSON.stringify({ error: 'Nota obrigatória.' }), { status: 400 });
    }

    const newId = crypto.randomUUID();
    const now = new Date().toISOString();

    await env.DB.prepare(
      'INSERT INTO ratings (id, user_name, rating, created_at) VALUES (?, ?, ?, ?)'
    ).bind(
      newId,
      String(body.userName || 'Anônimo'),
      Number(body.rating),
      now
    ).run();

    return Response.json({ success: true });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
};
