
export interface Env {
  MP_ACCESS_TOKEN: string;
}

export const onRequestPost: any = async ({ request, env }: { request: Request, env: Env }) => {
  try {
    const body = await request.json() as any;
    const { orderId, title, amount, payerEmail, payerName } = body;

    if (!env.MP_ACCESS_TOKEN) {
      console.error("[CreatePayment] Token ausente.");
      return new Response(JSON.stringify({ error: 'Erro de configuração (Token).' }), { status: 500 });
    }

    if (!orderId || !amount) {
      return new Response(JSON.stringify({ error: 'Dados do pedido ausentes.' }), { status: 400 });
    }

    // Limpeza de IDs para evitar espaços que quebrem o webhook
    const cleanOrderId = String(orderId).split(',').map(id => id.trim()).join(',');

    // Validação de segurança: Mercado Pago limita external_reference a 256 caracteres
    if (cleanOrderId.length > 250) {
       return new Response(JSON.stringify({ error: 'Muitos pedidos selecionados para um único pagamento. Selecione menos itens.' }), { status: 400 });
    }

    const cleanAmount = parseFloat(String(amount));
    const validEmail = (payerEmail && String(payerEmail).includes('@')) 
      ? String(payerEmail).trim() 
      : 'cliente@crazyart.com';

    const validName = payerName ? String(payerName).trim() : 'Cliente Crazy Art';
    const [firstName, ...lastNameParts] = validName.split(' ');
    const lastName = lastNameParts.join(' ') || 'Cliente';

    const urlObj = new URL(request.url);
    const origin = urlObj.origin;

    const preferencePayload = {
      items: [
        {
          id: "batch_payment",
          title: String(title || 'Faturas Crazy Art').substring(0, 255),
          description: "Pagamento de serviços/produtos Crazy Art Studio",
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
      // CRITICAL: Isso é o que o webhook usa para identificar os pedidos
      external_reference: cleanOrderId, 
      back_urls: {
        success: `${origin}/my-area?status=success`,
        failure: `${origin}/my-area?status=failure`,
        pending: `${origin}/my-area?status=pending`
      },
      auto_return: "approved",
      statement_descriptor: "CRAZYART",
      binary_mode: false
    };

    console.log("[Payment] Criando preferência para faturas:", cleanOrderId);

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
      console.error("[Payment] Erro MP API:", errorText);
      throw new Error(`Falha ao gerar link: ${errorText}`);
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
