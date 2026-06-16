import { Env, getAuth } from './_auth';

export const onRequest: any = async ({ request, env }: { request: Request, env: Env }) => {
  try {
    const url = new URL(request.url);
    const user = await getAuth(request, env);
    
    // GET: Listar comentários de um produto
    if (request.method === 'GET') {
      const productId = url.searchParams.get('product_id');
      if (!productId) {
        return new Response(JSON.stringify({ error: 'product_id é obrigatório.' }), { status: 400 });
      }
      
      let results: any[] = [];
      try {
        const queryRes = await env.DB.prepare(
          'SELECT * FROM item_comments WHERE product_id = ? ORDER BY created_at DESC'
        ).bind(productId).all();
        results = queryRes.results || [];
      } catch (e: any) {
        console.warn("Tabela item_comments pode não existir ainda em GET:", e.message);
        results = []; // Retorna lista vazia caso a tabela ainda não tenha sido criada pelo usuário
      }
      
      return Response.json(results);
    }

    // POST: Inserir novo comentário (qualquer usuário logado)
    if (request.method === 'POST') {
      if (!user) {
        return new Response(JSON.stringify({ error: 'Não autorizado. Faça login para comentar.' }), { status: 401 });
      }

      const body = await request.json() as any;
      if (!body.productId || !body.productName || !body.comment) {
        return new Response(JSON.stringify({ error: 'Dados incompletos.' }), { status: 400 });
      }

      // Sanitização básica contra XSS
      const sanitize = (str: string) => str.replace(/<[^>]*>/g, '').trim();

      // Buscar o nome do usuário a partir da tabela correspondente
      let userName = 'Usuário';
      let userId = '';
      if (user.role === 'admin') {
        userName = 'Administrador';
        userId = 'admin';
      } else if (user.role === 'client' && user.clientId) {
        userId = user.clientId;
        try {
          const client: any = await env.DB.prepare('SELECT name FROM clients WHERE id = ?').bind(user.clientId).first();
          if (client && client.name) {
            userName = client.name;
          }
        } catch (e: any) {
          console.error("Erro ao buscar nome do cliente:", e.message);
        }
      }

      const newId = crypto.randomUUID();
      const now = new Date().toISOString();

      try {
        await env.DB.prepare(
          'INSERT INTO item_comments (id, product_id, product_name, user_id, user_name, comment, created_at, is_read) VALUES (?, ?, ?, ?, ?, ?, ?, 0)'
        ).bind(
          newId,
          String(body.productId),
          String(body.productName),
          userId,
          userName,
          sanitize(String(body.comment)),
          now
        ).run();
      } catch (e: any) {
        console.error("Erro D1 ao inserir comentário:", e.message);
        return new Response(JSON.stringify({ 
          error: 'Tabela de comentários ainda não existe. Por favor, execute o comando SQL fornecido nas configurações da Cloudflare primeiro.' 
        }), { status: 500 });
      }

      return Response.json({ 
        success: true, 
        comment: { 
          id: newId, 
          product_id: body.productId, 
          product_name: body.productName, 
          user_id: userId, 
          user_name: userName, 
          comment: sanitize(String(body.comment)), 
          created_at: now, 
          is_read: 0 
        } 
      });
    }

    return new Response(JSON.stringify({ error: 'Método não permitido' }), { status: 405 });
  } catch (e: any) {
    console.error("Erro na API de Comentários:", e.message);
    return new Response(JSON.stringify({ error: 'Erro ao processar comentários.' }), { status: 500 });
  }
};
