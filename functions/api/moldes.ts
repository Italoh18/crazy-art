import { Env, getAuth } from './_auth';

export async function onRequest(context: { request: Request; env: Env }) {
  const { request, env } = context;
  const url = new URL(request.url);
  const id = url.searchParams.get('id');

  // Helper para verificar auth
  const user = await getAuth(request, env);

  // GET /api/moldes
  if (request.method === 'GET') {
    if (id) {
      const molde = await env.DB.prepare('SELECT * FROM moldes WHERE id = ?').bind(id).first();
      return Response.json(molde);
    }
    const { results } = await env.DB.prepare('SELECT * FROM moldes ORDER BY category, subcategory').all();
    return Response.json(results || []);
  }

  // A partir daqui requer admin
  if (!user || user.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), { status: 401 });
  }

  // POST /api/moldes
  if (request.method === 'POST') {
    const data = await request.json();
    const newId = crypto.randomUUID();
    await env.DB.prepare(
      'INSERT INTO moldes (id, category, subcategory, image_url, measurements) VALUES (?, ?, ?, ?, ?)'
    ).bind(
      newId,
      data.category,
      data.subcategory || null,
      data.image_url || null,
      JSON.stringify(data.measurements || {})
    ).run();
    
    return Response.json({ id: newId, ...data });
  }

  // PUT /api/moldes
  if (request.method === 'PUT') {
    if (!id) return new Response('ID requerido', { status: 400 });
    const data = await request.json();
    await env.DB.prepare(
      'UPDATE moldes SET category = ?, subcategory = ?, image_url = ?, measurements = ? WHERE id = ?'
    ).bind(
      data.category,
      data.subcategory || null,
      data.image_url || null,
      JSON.stringify(data.measurements || {}),
      id
    ).run();
    
    return Response.json({ success: true });
  }

  // DELETE /api/moldes
  if (request.method === 'DELETE') {
    if (!id) return new Response('ID requerido', { status: 400 });
    await env.DB.prepare('DELETE FROM moldes WHERE id = ?').bind(id).run();
    return Response.json({ success: true });
  }

  return new Response('Método não permitido', { status: 405 });
}
