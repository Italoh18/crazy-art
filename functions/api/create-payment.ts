
export interface Env {
  MP_ACCESS_TOKEN: string;
}

export const onRequestPost: any = async ({ request, env }: { request: Request, env: Env }) => {
  try {
    const body = await request.json() as any;
    const { orderId, title, amount, payerEmail, payerName } = body;

    // 1. Validação de Ambiente
    if (!env.MP_ACCESS_TOKEN) {
      console.error("[CreatePayment] ERRO: MP_ACCESS_TOKEN ausente.");
      return new Response(JSON.stringify({ error: 'Configuração de pagamento incompleta (Token ausente).' }), { status: 500 });
    }

    // 2. Validação de Dados Básicos
    if (!orderId || !amount) {
      console.error("[CreatePayment] ERRO: Dados inválidos recebidos.", body);
      return new Response(JSON.stringify({ error: 'Dados do pedido incompletos.' }), { status: 400 });
    }

    // 3. Normalização Estrita de Tipos (Requisito MP)
    const cleanAmount = parseFloat(String(amount));
    
    if (isNaN(cleanAmount) || cleanAmount <= 0) {
       console.error("[CreatePayment] ERRO: Valor inválido.", amount);
       return new Response(JSON.stringify({ error: 'Valor do pedido inválido.' }), { status: 400 });
    }

    // Email de fallback seguro caso o cliente não tenha email cadastrado
    const validEmail = (payerEmail && String(payerEmail).includes('@')) 
      ? String(payerEmail).trim() 
      : 'cliente_sem_email@crazyart.com';

    const validName = payerName ? String(payerName).trim() : 'Cliente Crazy Art';
    const [firstName, ...lastNameParts] = validName.split(' ');
    const lastName = lastNameParts.join(' ') || 'Cliente';

    // Recupera origem para URLs de retorno
    const urlObj = new URL(request.url);
    const origin = urlObj.origin;

    // 4. Montagem do Payload da Preferência
    const preferencePayload = {
      items: [
        {
          id: String(orderId),
          title: String(title || 'Pedido Crazy Art').substring(0, 255),
          description: String(title || 'Pedido Crazy Art').substring(0, 255),
          quantity: 1, // Obrigatório ser int
          currency_id: 'BRL', // Obrigatório
          unit_price: Number(cleanAmount.toFixed(2)) // Obrigatório ser number com 2 casas
        }
      ],
      payer: {
        name: firstName,
        surname: lastName,
        email: validEmail
      },
      external_reference: String(orderId),
      back_urls: {
        success: `${origin}/my-area?status=success`,
        failure: `${origin}/my-area?status=failure`,
        pending: `${origin}/my-area?status=pending`
      },
      auto_return: "approved",
      statement_descriptor: "CRAZYART",
      binary_mode: false // false = aceita pendente (boleto), true = apenas cartão aprovado na hora
    };

    // LOG OBRIGATÓRIO
    console.log("[CreatePayment] Payload Enviado ao MP:", JSON.stringify(preferencePayload, null, 2));

    // 5. Chamada à API do Mercado Pago
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
      console.error("[CreatePayment] Erro na API do MP:", errorText);
      throw new Error(`Falha ao criar preferência: ${errorText}`);
    }

    const mpData: any = await mpResponse.json();
    
    // LOG OBRIGATÓRIO
    console.log("[CreatePayment] Resposta MP Sucesso. ID:", mpData.id);
    console.log("[CreatePayment] Link de Redirecionamento (init_point):", mpData.init_point);

    // 6. Retorno para o Frontend
    return new Response(JSON.stringify({ 
      init_point: mpData.init_point, // URL para redirecionamento
      preferenceId: mpData.id 
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (e: any) {
    console.error("[CreatePayment] Exception:", e.message);
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
};
