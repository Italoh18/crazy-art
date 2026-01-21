
export interface Env {
  DB: any;
  MP_ACCESS_TOKEN: string;
}

export const onRequestPost: any = async ({ request, env }: { request: Request, env: Env }) => {
  try {
    const url = new URL(request.url);
    const type = url.searchParams.get('type') || url.searchParams.get('topic');
    const id = url.searchParams.get('data.id') || url.searchParams.get('id');

    if (type !== 'payment' || !id) {
       return new Response('OK', { status: 200 });
    }

    if (!env.MP_ACCESS_TOKEN) {
      console.error('MP_ACCESS_TOKEN não configurado');
      return new Response('Config Error', { status: 500 });
    }

    const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${id}`, {
      headers: {
        'Authorization': `Bearer ${env.MP_ACCESS_TOKEN}`
      }
    });

    if (!mpRes.ok) {
       return new Response('MP API Error', { status: 500 });
    }

    const paymentData: any = await mpRes.json();
    
    if (paymentData.status === 'approved') {
      const reference = paymentData.external_reference;

      if (reference) {
        // Se houver múltiplos IDs separados por vírgula
        const orderIds = reference.includes(',') ? reference.split(',') : [reference];

        console.log("[Webhook] Processando múltiplos IDs:", orderIds);

        for (const orderId of orderIds) {
          const trimmedId = orderId.trim();
          if (trimmedId) {
            await env.DB.prepare("UPDATE orders SET status = 'paid', paid_at = datetime('now') WHERE id = ?")
              .bind(trimmedId)
              .run();
          }
        }
      }
    }

    return new Response('OK', { status: 200 });

  } catch (e: any) {
    console.error('Webhook Error:', e.message);
    return new Response(e.message, { status: 500 });
  }
};
