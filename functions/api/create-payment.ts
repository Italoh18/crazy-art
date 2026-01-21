
export interface Env {
  MP_ACCESS_TOKEN: string;
}

export const onRequestPost: any = async ({ request, env }: { request: Request, env: Env }) => {
  try {
    const { orderId, title, amount } = await request.json() as any;

    if (!env.MP_ACCESS_TOKEN) {
      return new Response(JSON.stringify({ error: 'MP_ACCESS_TOKEN não configurado.' }), { status: 500 });
    }

    if (!orderId || !amount) {
      return new Response(JSON.stringify({ error: 'Dados incompletos (orderId ou amount faltando).' }), { status: 400 });
    }

    // Identifica a URL base da aplicação para retorno
    const url = new URL(request.url);
    const origin = url.origin;

    const preferenceData = {
      items: [
        {
          id: orderId,
          title: title || 'Pagamento Crazy Art',
          quantity: 1,
          currency_id: 'BRL',
          unit_price: Number(amount)
        }
      ],
      external_reference: orderId,
      back_urls: {
        success: `${origin}/my-area?status=success`,
        failure: `${origin}/my-area?status=failure`,
        pending: `${origin}/my-area?status=pending`
      },
      auto_return: "approved"
    };

    const mpResponse = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${env.MP_ACCESS_TOKEN}`
      },
      body: JSON.stringify(preferenceData)
    });

    if (!mpResponse.ok) {
      const errorText = await mpResponse.text();
      throw new Error(`Erro Mercado Pago: ${errorText}`);
    }

    const mpData: any = await mpResponse.json();

    return new Response(JSON.stringify({ 
      init_point: mpData.init_point
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
};
