
import { Env, getAuth } from './_auth';

export const onRequestPost: any = async ({ request, env }: { request: Request, env: Env }) => {
  try {
    const body = await request.json() as any;
    
    if (!body.rating) {
      return new Response(JSON.stringify({ error: 'Nota obrigatória.' }), { status: 400 });
    }

    // Sanitização básica contra XSS
    const sanitize = (str: string) => str.replace(/<[^>]*>/g, '').trim();

    const newId = crypto.randomUUID();
    const now = new Date().toISOString();

    await env.DB.prepare(
      'INSERT INTO ratings (id, user_name, rating, created_at) VALUES (?, ?, ?, ?)'
    ).bind(
      newId,
      sanitize(String(body.userName || 'Anônimo')),
      Number(body.rating),
      now
    ).run();

    return Response.json({ success: true });
  } catch (e: any) {
    console.error("Erro na API de Avaliações:", e.message);
    return new Response(JSON.stringify({ error: 'Erro ao processar avaliação.' }), { status: 500 });
  }
};
