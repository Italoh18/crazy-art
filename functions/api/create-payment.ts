
export interface Env {
  DB: any;
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

    // Limpeza de IDs
    const cleanOrderId = String(orderId).split(',').map(id => id.trim()).join(',');
    
    // NOVA LÓGICA: Sempre criar um ID de Lote para o external_reference
    // Isso remove a limitação de 256 caracteres do Mercado Pago.
    const batchId = crypto.randomUUID();
    const now = new Date().toISOString();

    try {
        await env.DB.prepare(
            "INSERT INTO payment_batches (id, order_ids, created_at) VALUES (?, ?, ?)"
        ).bind(batchId, cleanOrderId, now).run();
        console.log(`[Payment] Lote criado: ${batchId} contendo pedidos: ${cleanOrderId}`);
    } catch (dbErr: any) {
        console.error("[Payment] Erro ao salvar lote no DB:", dbErr.message);
        // Fallback: Se o banco falhar e a string for curta, tentamos usar a string direta
        if (cleanOrderId.length > 250) {
            throw new Error("Erro ao processar lote de muitos pedidos. Tente selecionar menos itens ou contate o suporte.");
        }
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
          id: "payment_transaction",
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
      // ENVIAMOS O ID DO LOTE EM VEZ DA LISTA DE IDs
      external_reference: batchId, 
      back_urls: {
        success: `${origin}/my-area?status=success`,
        failure: `${origin}/my-area?status=failure`,
        pending: `${origin}/my-area?status=pending`
      },
      auto_return: "approved",
      statement_descriptor: "CRAZYART",
      binary_mode: false
    };

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
