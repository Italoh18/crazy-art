import { Env, getAuth } from './_auth';

export const onRequest: any = async ({ request, env }: { request: Request, env: Env }) => {
  try {
    const user = await getAuth(request, env);
    if (!user) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), { status: 401 });
    }

    const url = new URL(request.url);
    const clientId = user.role === 'admin'
      ? (url.searchParams.get('clientId') || user.clientId)
      : user.clientId;

    if (!clientId) {
      return new Response(JSON.stringify({ error: 'ID do cliente inválido ou ausente.' }), { status: 400 });
    }

    // 1. Fetch arts from standard orders (always safe, tables exist)
    let ordersArts: any[] = [];
    try {
      const { results } = await env.DB.prepare(`
        SELECT DISTINCT 
          oi.catalog_id as art_id,
          oi.name as art_name,
          COALESCE(oi.download_link, c.download_link) as download_link,
          COALESCE(o.paid_at, o.created_at) as purchased_at
        FROM order_items oi
        JOIN orders o ON oi.order_id = o.id
        LEFT JOIN catalog c ON oi.catalog_id = c.id
        WHERE o.client_id = ? 
          AND oi.type = 'art'
          AND (o.status IN ('paid', 'production', 'finished') OR o.paid_at IS NOT NULL)
      `).bind(clientId).all();
      ordersArts = results || [];
    } catch (err: any) {
      console.error("[PurchasedArts] Error reading from orders join:", err.message);
    }

    // 2. Fetch from new dedicated table client_purchased_arts (wrapped in try-catch in case migration is not run yet)
    let explicitPurchasedArts: any[] = [];
    try {
      const { results } = await env.DB.prepare(`
        SELECT 
          cpa.art_id, 
          cpa.art_name, 
          COALESCE(cpa.download_link, c.download_link) as download_link, 
          cpa.purchased_at 
        FROM client_purchased_arts cpa
        LEFT JOIN catalog c ON cpa.art_id = c.id
        WHERE cpa.client_id = ?
      `).bind(clientId).all();
      explicitPurchasedArts = results || [];
    } catch (err: any) {
      console.warn("[PurchasedArts] client_purchased_arts table might not exist yet:", err.message);
    }

    // 3. Merge them to remove duplicates
    const mergedMap = new Map<string, any>();

    // Put orders arts first
    for (const art of ordersArts) {
      if (art.art_id) {
        mergedMap.set(String(art.art_id), {
          art_id: String(art.art_id),
          art_name: art.art_name,
          download_link: art.download_link,
          purchased_at: art.purchased_at
        });
      }
    }

    // Explicitly purchased arts take precedence or complement
    for (const art of explicitPurchasedArts) {
      if (art.art_id) {
        mergedMap.set(String(art.art_id), {
          art_id: String(art.art_id),
          art_name: art.art_name,
          download_link: art.download_link,
          purchased_at: art.purchased_at
        });
      }
    }

    const purchasedList = Array.from(mergedMap.values()).sort(
      (a, b) => new Date(b.purchased_at).getTime() - new Date(a.purchased_at).getTime()
    );

    return Response.json(purchasedList);
  } catch (e: any) {
    console.error("Error in purchased-arts API:", e.message);
    return new Response(JSON.stringify({ error: 'Erro ao carregar artes adquiridas.' }), { status: 500 });
  }
};
