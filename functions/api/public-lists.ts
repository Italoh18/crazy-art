import { getAuth } from './_auth';

export const onRequest: any = async ({ request, env }: { request: any, env: any }) => {
  try {
    const url = new URL(request.url);
    const method = request.method;

    // Garantir que a tabela existe
    await env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS public_lists (
        id TEXT PRIMARY KEY,
        client_id TEXT NOT NULL,
        title TEXT NOT NULL,
        items TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `).run();

    const listId = url.searchParams.get('id');
    const my_list = url.searchParams.get('my_list') === 'true';
    const clientIdParam = url.searchParams.get('client_id');

    // GET handler
    if (method === 'GET') {
      if (clientIdParam) {
        let list: any = await env.DB.prepare('SELECT * FROM public_lists WHERE client_id = ?').bind(clientIdParam).first();

        if (!list) {
          const newId = crypto.randomUUID();
          const now = new Date().toISOString();
          await env.DB.prepare(`
            INSERT INTO public_lists (id, client_id, title, items, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?)
          `).bind(
            newId,
            clientIdParam,
            'Lista Pública de Pedido',
            '[]',
            now,
            now
          ).run();

          list = await env.DB.prepare('SELECT * FROM public_lists WHERE client_id = ?').bind(clientIdParam).first();
        }

        return new Response(JSON.stringify(list), {
          headers: { 'Content-Type': 'application/json' }
        });
      }

      if (listId) {
        // Obter uma lista específica (Pública, sem autenticação!)
        const list: any = await env.DB.prepare(`
          SELECT pl.*, c.name as client_name
          FROM public_lists pl
          JOIN clients c ON pl.client_id = c.id
          WHERE pl.id = ?
        `).bind(listId).first();

        if (!list) {
          return new Response(JSON.stringify({ error: 'Lista não encontrada' }), { status: 404 });
        }

        return new Response(JSON.stringify(list), {
          headers: { 'Content-Type': 'application/json' }
        });
      }

      if (my_list) {
        // Obter ou criar a lista correspondente ao usuário logado
        const user = await getAuth(request, env);
        if (!user || !user.clientId) {
          return new Response(JSON.stringify({ error: 'Não autorizado' }), { status: 401 });
        }

        const clientId = user.clientId;
        let list: any = await env.DB.prepare('SELECT * FROM public_lists WHERE client_id = ?').bind(clientId).first();

        if (!list) {
          // Criar uma lista automática
          const newId = crypto.randomUUID();
          const now = new Date().toISOString();
          await env.DB.prepare(`
            INSERT INTO public_lists (id, client_id, title, items, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?)
          `).bind(
            newId,
            clientId,
            'Lista Pública de Pedido',
            '[]',
            now,
            now
          ).run();

          list = await env.DB.prepare('SELECT * FROM public_lists WHERE client_id = ?').bind(clientId).first();
        }

        return new Response(JSON.stringify(list), {
          headers: { 'Content-Type': 'application/json' }
        });
      }

      return new Response(JSON.stringify({ error: 'Parâmetros inválidos' }), { status: 400 });
    }

    // PUT handler
    if (method === 'PUT') {
      // Para atualizar a lista:
      // Pode ser atualizada publicamente (para adicionar registros) OU pelo dono (com controle de sessão)
      // Para ser 100% livre e permitir "preenchida publicamente" e "salvar em baixo", o PUT na URL com id da lista permite atualizar items.
      if (!listId) {
        return new Response(JSON.stringify({ error: 'ID da lista é obrigatório' }), { status: 400 });
      }

      const body = await request.json() as any;
      if (!body.items) {
        return new Response(JSON.stringify({ error: 'Dados da lista ausentes' }), { status: 400 });
      }

      const itemsStr = typeof body.items === 'string' ? body.items : JSON.stringify(body.items);
      const title = body.title || 'Lista Pública de Pedido';
      const now = new Date().toISOString();

      // Verificar existência
      const existing: any = await env.DB.prepare('SELECT client_id FROM public_lists WHERE id = ?').bind(listId).first();
      if (!existing) {
        return new Response(JSON.stringify({ error: 'Lista não encontrada' }), { status: 404 });
      }

      // Se for passado um token ou o usuário estiver logado, opcionalmente validar se é o dono se desejado.
      // No entanto, para ser pública, qualquer pessoa na página de compartilhamento deve poder preencher e clicar em Salvar.
      // Portanto, permitimos PUT de qualquer origem na lista pública.
      await env.DB.prepare(`
        UPDATE public_lists
        SET title = ?, items = ?, updated_at = ?
        WHERE id = ?
      `).bind(title, itemsStr, now, listId).run();

      return new Response(JSON.stringify({ success: true, message: 'Lista atualizada com sucesso' }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ error: 'Método não suportado' }), { status: 405 });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
};
