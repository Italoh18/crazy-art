
export interface EmailPayload {
  to: string[];
  subject: string;
  html: string;
}

const getSender = (env: any) => env.SENDER_EMAIL || 'onboarding@resend.dev';
const getAdminEmail = (env: any) => env.ADMIN_EMAIL || 'admin@crazyart.com';

/**
 * Envia um e-mail usando a API REST do Resend via fetch.
 * Não requer SDKs, compatível com Edge Runtime.
 */
export const sendEmail = async (env: any, payload: EmailPayload) => {
  if (!env.RESEND_API_KEY) {
    console.warn('[Email Service] RESEND_API_KEY não configurada. E-mail ignorado.');
    return;
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: `Crazy Art <${getSender(env)}>`,
        to: payload.to,
        subject: payload.subject,
        html: payload.html,
      }),
    });

    if (!res.ok) {
      const error = await res.text();
      console.error('[Email Service] Erro ao enviar e-mail:', error);
    } else {
      console.log(`[Email Service] E-mail enviado para ${payload.to.join(', ')}`);
    }
  } catch (e: any) {
    console.error('[Email Service] Exceção:', e.message);
  }
};

// --- Templates HTML Simples ---

export const templates = {
  newOrderClient: (customerName: string, orderNumber: string, total: number) => `
    <div style="font-family: sans-serif; color: #333;">
      <h1>Olá, ${customerName}!</h1>
      <p>Seu pedido <strong>#${orderNumber}</strong> foi criado com sucesso.</p>
      <p>Valor Total: R$ ${total.toFixed(2)}</p>
      <p>Acesse sua área do cliente para mais detalhes.</p>
      <hr />
      <p style="font-size: 12px; color: #777;">Crazy Art Studio</p>
    </div>
  `,

  newOrderAdmin: (customerName: string, orderNumber: string, total: number) => `
    <div style="font-family: sans-serif; color: #333;">
      <h1>Novo Pedido da Loja!</h1>
      <p>O cliente <strong>${customerName}</strong> realizou um novo pedido.</p>
      <ul>
        <li>Pedido: #${orderNumber}</li>
        <li>Valor: R$ ${total.toFixed(2)}</li>
      </ul>
      <p>Verifique o painel administrativo.</p>
    </div>
  `,

  paymentConfirmedAdmin: (orderNumber: string, customerName: string) => `
    <div style="font-family: sans-serif; color: #333;">
      <h1 style="color: #10B981;">Pagamento Confirmado!</h1>
      <p>O pagamento do pedido <strong>#${orderNumber}</strong> de ${customerName} foi processado.</p>
      <p>O status do pedido foi atualizado para "Pago".</p>
    </div>
  `,

  overdueClient: (customerName: string, orderNumber: string, dueDate: string) => `
    <div style="font-family: sans-serif; color: #333;">
      <h1 style="color: #F59E0B;">Aviso de Atraso</h1>
      <p>Olá, ${customerName}.</p>
      <p>Consta em nosso sistema que o pedido <strong>#${orderNumber}</strong> venceu em ${new Date(dueDate).toLocaleDateString()}.</p>
      <p>Por favor, realize o pagamento ou entre em contato.</p>
    </div>
  `,

  overdueAdmin: (customerName: string, orderNumber: string, dueDate: string) => `
    <div style="font-family: sans-serif; color: #333;">
      <h1 style="color: #DC2626;">Pedido em Atraso</h1>
      <p>O pedido <strong>#${orderNumber}</strong> do cliente <strong>${customerName}</strong> está vencido desde ${new Date(dueDate).toLocaleDateString()}.</p>
    </div>
  `
};

export { getAdminEmail };
