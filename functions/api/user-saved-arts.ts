import { getAuth } from './_auth';

export const onRequest: any = async ({ request, env }: { request: any, env: any }) => {
  try {
    const url = new URL(request.url);
    const method = request.method;

    // Garantir que a tabela existe
    await env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS user_saved_arts (
        id TEXT PRIMARY KEY,
        client_id TEXT NOT NULL,
        name TEXT NOT NULL,
        images TEXT NOT NULL,
        local_bg_url TEXT,
        part_colors TEXT NOT NULL,
        part_textures TEXT NOT NULL,
        selected_collar_id TEXT,
        collar_color TEXT,
        system_bg_url TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `).run();

    // Custom background fields additions just in case (as defensive programming)
    try {
      await env.DB.prepare('ALTER TABLE user_saved_arts ADD COLUMN system_bg_url TEXT').run();
    } catch (e) {}

    const authUser = await getAuth(request, env);
    if (!authUser) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    }

    const clientId = authUser.clientId || authUser.userId || 'admin';

    // GET - List user saved arts
    if (method === 'GET') {
      const artId = url.searchParams.get('id');
      if (artId) {
        const art: any = await env.DB.prepare('SELECT * FROM user_saved_arts WHERE id = ? AND client_id = ?')
          .bind(artId, clientId)
          .first();
        if (!art) {
          return new Response(JSON.stringify({ error: 'Arte não encontrada' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
        }
        return new Response(JSON.stringify(art), {
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const arts: any = await env.DB.prepare('SELECT * FROM user_saved_arts WHERE client_id = ? ORDER BY created_at DESC')
        .bind(clientId)
        .all();

      return new Response(JSON.stringify(arts.results || []), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // POST - Save or Update user saved art
    if (method === 'POST') {
      const body = await request.json() as any;
      const id = body.id || crypto.randomUUID();
      const name = body.name || `Arte - ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
      const images = JSON.stringify(body.images || []);
      const local_bg_url = body.localBgUrl || null;
      const part_colors = JSON.stringify(body.partColors || {});
      const part_textures = JSON.stringify(body.partTextures || {});
      const selected_collar_id = body.selectedCollarId || null;
      const collar_color = body.collarColor || null;
      const system_bg_url = body.systemBgUrl || null;
      const now = new Date().toISOString();

      // Check if exists for update, otherwise insert
      const existing: any = await env.DB.prepare('SELECT id FROM user_saved_arts WHERE id = ? AND client_id = ?')
        .bind(id, clientId)
        .first();

      if (existing) {
        await env.DB.prepare(`
          UPDATE user_saved_arts
          SET name = ?, images = ?, local_bg_url = ?, part_colors = ?, part_textures = ?, selected_collar_id = ?, collar_color = ?, system_bg_url = ?, updated_at = ?
          WHERE id = ? AND client_id = ?
        `).bind(
          name,
          images,
          local_bg_url,
          part_colors,
          part_textures,
          selected_collar_id,
          collar_color,
          system_bg_url,
          now,
          id,
          clientId
        ).run();
      } else {
        await env.DB.prepare(`
          INSERT INTO user_saved_arts (id, client_id, name, images, local_bg_url, part_colors, part_textures, selected_collar_id, collar_color, system_bg_url, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          id,
          clientId,
          name,
          images,
          local_bg_url,
          part_colors,
          part_textures,
          selected_collar_id,
          collar_color,
          system_bg_url,
          now,
          now
        ).run();
      }

      const savedArt = await env.DB.prepare('SELECT * FROM user_saved_arts WHERE id = ?').bind(id).first();
      return new Response(JSON.stringify(savedArt), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // DELETE - Delete saved art
    if (method === 'DELETE') {
      const artId = url.searchParams.get('id');
      if (!artId) {
        return new Response(JSON.stringify({ error: 'ID ausente' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
      }

      await env.DB.prepare('DELETE FROM user_saved_arts WHERE id = ? AND client_id = ?')
        .bind(artId, clientId)
        .run();

      return new Response(JSON.stringify({ success: true }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ error: 'Método não permitido' }), { status: 405, headers: { 'Content-Type': 'application/json' } });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};
