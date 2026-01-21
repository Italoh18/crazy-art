
export interface Env {
  MP_ACCESS_TOKEN: string;
}

export const onRequestPost: any = async ({ request, env }: { request: Request, env: Env }) => {
  try {
    const { orderId, title, amount, payerEmail, payerName } = await request.json() as any;

    if (!env.MP_ACCESS_TOKEN) {
      console.error("ERRO CRÍTICO: MP_ACCESS_TOKEN não configurado no ambiente.");
      return new Response(JSON.stringify({ error: 'MP_ACCESS_TOKEN não configurado.' }), { status: 500 });
    }

    if (!orderId || !amount) {
      return new Response(JSON.stringify({ error: 'Dados incompletos (orderId ou amount faltando).' }), { status: 400 });
    }

    // Normalização de dados obrigatórios para evitar botão desabilitado
    // Se não houver email, usamos um placeholder válido para não quebrar o checkout
    const validEmail = (payerEmail && payerEmail.includes('@')) ? payerEmail : 'guest_customer@crazyart.com';
    const validPrice = Number(amount);
    
    // Identifica a URL base da aplicação para retorno
    const url = new URL(request.url);
    const origin = url.origin;

    const preferenceData = {
      items: [
        {
          id: orderId,
          title: title || 'Pagamento Crazy Art',
          quantity: 1, // Obrigatório ser inteiro >= 1
          currency_id: 'BRL',
          unit_price: validPrice // Obrigatório ser Number
        }
      ],
      payer: {
        name: payerName || 'Cliente Crazy Art',
        email: validEmail
      },
      external_reference: orderId,
      back_urls: {
        success: `${origin}/my-area?status=success`,
        failure: `${origin}/my-area?status=failure`,
        pending: `${origin}/my-area?status=pending`
      },
      auto_return: "approved",
      statement_descriptor: "CRAZYART",
      binary_mode: false // Permite pagamentos pendentes (boleto/pec) se necessário, mude para true se quiser só aprovação imediata
    };

    // LOG OBRIGATÓRIO: Payload enviado ao Mercado Pago
    console.log("MP Payload Enviado:", JSON.stringify(preferenceData, null, 2));

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
      console.error("MP API Erro:", errorText);
      throw new Error(`Erro Mercado Pago: ${errorText}`);
    }

    const mpData: any = await mpResponse.json();

    // LOG OBRIGATÓRIO: Resposta do Mercado Pago
    console.log("MP Resposta Recebida:", JSON.stringify(mpData, null, 2));

    return new Response(JSON.stringify({ 
      init_point: mpData.init_point, // Link de redirecionamento (Checkout Pro)
      preferenceId: mpData.id // ID da preferência (Para Bricks ou Logs)
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (e: any) {
    console.error("Exception em create-payment:", e.message);
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
};
