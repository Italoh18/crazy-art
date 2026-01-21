
export interface Env {
  DB: any;
  MP_ACCESS_TOKEN: string;
}

export const onRequestPost: any = async ({ request, env }: { request: Request, env: Env }) => {
  try {
    const url = new URL(request.url);
    const type = url.searchParams.get('type') || url.searchParams.get('topic');
    const id = url.searchParams.get('data.id') || url.searchParams.get('id');

    // Mercado Pago envia notificações de vários tipos, focamos em 'payment'
    if (type !== 'payment' || !id) {
       return new Response('OK', { status: 200 });
    }

    if (!env.MP_ACCESS_TOKEN) {
      console.error('MP_ACCESS_TOKEN não configurado');
      return new Response('Config Error', { status: 500 });
    }

    // Verificar status real do pagamento na API do MP
    const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${id}`, {
      headers: {
        'Authorization': `Bearer ${env.MP_ACCESS_TOKEN}`
      }
    });

    if (!mpRes.ok) {
       console.error('Erro ao consultar MP:', await mpRes.text());
       return new Response('MP API Error', { status: 500 });
    }

    const paymentData: any = await mpRes.json();
    
    // Se aprovado, atualizar banco de dados
    if (paymentData.status === 'approved') {
      const orderId = paymentData.external_reference;

      if (orderId) {
        await env.DB.prepare("UPDATE orders SET status = 'paid', paid_at = datetime('now') WHERE id = ?")
          .bind(orderId)
          .run();
      }
    }

    return new Response('OK', { status: 200 });

  } catch (e: any) {
    console.error('Webhook Error:', e.message);
    return new Response(e.message, { status: 500 });
  }
};
