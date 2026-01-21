
export interface Env {
  MP_ACCESS_TOKEN: string;
}

export const onRequestPost: any = async ({ request, env }: { request: Request, env: Env }) => {
  try {
    const body = await request.json() as any;
    const { orderId, title, amount, payerEmail, payerName } = body;

    // orderId aqui pode ser uma string simples "ID1" ou composta "ID1,ID2,ID3"
    if (!env.MP_ACCESS_TOKEN) {
      return new Response(JSON.stringify({ error: 'Token ausente.' }), { status: 500 });
    }

    if (!orderId || !amount) {
      return new Response(JSON.stringify({ error: 'Dados incompletos.' }), { status: 400 });
    }

    const cleanAmount = parseFloat(String(amount));
    const validEmail = (payerEmail && String(payerEmail).includes('@')) 
      ? String(payerEmail).trim() 
      : 'cliente_sem_email@crazyart.com';

    const validName = payerName ? String(payerName).trim() : 'Cliente Crazy Art';
    const [firstName, ...lastNameParts] = validName.split(' ');
    const lastName = lastNameParts.join(' ') || 'Cliente';

    const urlObj = new URL(request.url);
    const origin = urlObj.origin;

    const preferencePayload = {
      items: [
        {
          id: String(orderId), // Aqui passamos a string de IDs
          title: String(title || 'Pedido Crazy Art').substring(0, 255),
          description: "Pagamento de faturas Crazy Art Studio",
          quantity: 1,
          currency_id: 'BRL',
          unit_price: Number(cleanAmount.toFixed(2))
        }
      ],
      payer: {
        name: firstName,
        surname: lastName,
        email: validEmail
      },
      external_reference: String(orderId), // Referência enviada para o webhook
      back_urls: {
        success: `${origin}/my-area?status=success`,
        failure: `${origin}/my-area?status=failure`,
        pending: `${origin}/my-area?status=pending`
      },
      auto_return: "approved",
      statement_descriptor: "CRAZYART",
      binary_mode: false
    };

    console.log("[BatchPayment] Iniciando para:", orderId);

    const mpResponse = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${env.MP_ACCESS_TOKEN}`
      },
      body: JSON.stringify(preferencePayload)
    });

    if (!mpResponse.ok) {
      const errorText = await mpResponse.text();
      throw new Error(`Erro MP: ${errorText}`);
    }

    const mpData: any = await mpResponse.json();
    
    return new Response(JSON.stringify({ 
      init_point: mpData.init_point,
      preferenceId: mpData.id 
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (e: any) {
    console.error("[CreatePayment] Exception:", e.message);
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
};
