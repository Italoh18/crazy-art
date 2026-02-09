
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
    const isMultiple = cleanOrderId.includes(',');
    
    let externalRef = cleanOrderId;

    if (isMultiple) {
        const batchId = crypto.randomUUID();
        const now = new Date().toISOString();
        try {
            await env.DB.prepare(
                "INSERT INTO payment_batches (id, order_ids, created_at) VALUES (?, ?, ?)"
            ).bind(batchId, cleanOrderId, now).run();
            externalRef = batchId; // Usa o ID do lote
            console.log(`[Payment] Lote criado: ${batchId}`);
        } catch (dbErr: any) {
            console.error("[Payment] Erro ao criar lote:", dbErr.message);
            // Se falhar o banco, mas a string for pequena, tenta enviar direto
            if (cleanOrderId.length > 250) throw new Error("Erro ao processar lote. Tente pagar individualmente.");
        }
    } else {
        console.log(`[Payment] Pedido único: ${cleanOrderId}`);
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
    const notificationUrl = `${origin}/api/mp-webhook`;

    console.log(`[Payment] Configurando Webhook em: ${notificationUrl}`);

    const preferencePayload = {
      items: [
        {
          id: "payment_transaction",
          title: String(title || 'Faturas Crazy Art').substring(0, 255),
          description: "Pagamento de serviços/produtos Crazy Art Studio",
          category_id: "services", // ADICIONADO: Melhora aprovação e remove aviso de recomendação
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
      external_reference: externalRef,
      back_urls: {
        success: `${origin}/my-area?status=success`,
        failure: `${origin}/my-area?status=failure`,
        pending: `${origin}/my-area?status=pending`
      },
      auto_return: "approved",
      statement_descriptor: "CRAZYART",
      binary_mode: false,
      notification_url: notificationUrl // Campo obrigatório para Webhook
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
