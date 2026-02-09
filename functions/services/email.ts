
export interface EmailPayload {
  to: string | string[];
  subject: string;
  html: string;
}

// Helper para formatar o remetente corretamente
const getSender = (env: any) => {
  // Alterado de onboarding@resend.dev para o domínio próprio conforme solicitado
  const sender = env.SENDER_EMAIL || 'no-reply@crazyart.com.br';
  
  // Se já estiver no formato "Nome <email>", usa como está
  if (sender.includes('<') && sender.includes('>')) {
    return sender;
  }
  // Caso contrário, adiciona o nome da loja
  return `Crazy Art <${sender}>`;
};

export const getAdminEmail = (env: any) => env.ADMIN_EMAIL || 'admin@crazyart.com';

/**
 * Envia e-mail usando a API do Resend via fetch (Edge Runtime).
 */
export const sendEmail = async (env: any, payload: EmailPayload) => {
  if (!env.RESEND_API_KEY) {
    console.warn('[Resend] API Key não configurada. E-mail ignorado.');
    return;
  }

  const toAddresses = Array.isArray(payload.to) ? payload.to : [payload.to];
  const validRecipients = toAddresses.filter(e => e && e.includes('@'));

  if (validRecipients.length === 0) {
    console.warn('[Resend] Nenhum destinatário válido.');
    return;
  }

  try {
    const sender = getSender(env);
    console.log(`[Resend] Enviando de [${sender}] para [${validRecipients.join(', ')}]`);

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: sender,
        to: validRecipients,
        subject: payload.subject,
        html: payload.html,
      }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error('[Resend] Erro na API:', errorText);
    } else {
      const data = await res.json();
      console.log(`[Resend] Enviado com sucesso! ID: ${(data as any).id}`);
    }
  } catch (e: any) {
    console.error('[Resend] Exceção de rede:', e.message);
  }
};

// --- Templates HTML ---

export const templates = {
  newOrderClient: (customerName: string, orderNumber: string, total: number) => `
    <div style="font-family: sans-serif; color: #333; line-height: 1.6; max-width: 600px;">
      <h2 style="color: #F59E0B;">Olá, ${customerName}!</h2>
      <p>Seu pedido <strong>#${orderNumber}</strong> foi criado com sucesso.</p>
      <div style="background: #f4f4f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 0; font-size: 18px;"><strong>Valor Total:</strong> R$ ${total.toFixed(2)}</p>
      </div>
      <p>Acesse sua área do cliente para acompanhar o status ou realizar o pagamento.</p>
      <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
      <p style="font-size: 12px; color: #777;">Crazy Art Studio - Transformando ideias</p>
    </div>
  `,

  newOrderAdmin: (customerName: string, orderNumber: string, total: number) => `
    <div style="font-family: sans-serif; color: #333; line-height: 1.6;">
      <h2 style="color: #333;">🔔 Novo Pedido da Loja!</h2>
      <p>O cliente <strong>${customerName}</strong> realizou um novo pedido.</p>
      <ul style="background: #f9fafb; padding: 15px 15px 15px 30px; border-radius: 8px; border: 1px solid #e5e7eb;">
        <li><strong>Pedido:</strong> #${orderNumber}</li>
        <li><strong>Valor:</strong> R$ ${total.toFixed(2)}</li>
      </ul>
      <p>Acesse o painel administrativo para detalhes.</p>
    </div>
  `,

  paymentConfirmedAdmin: (orderNumber: string, customerName: string) => `
    <div style="font-family: sans-serif; color: #333; line-height: 1.6;">
      <h2 style="color: #10B981;">✅ Pagamento Confirmado!</h2>
      <p>O pagamento do pedido <strong>#${orderNumber}</strong> de <strong>${customerName}</strong> foi processado.</p>
      <p>O status foi atualizado para "Pago" automaticamente.</p>
    </div>
  `,

  overdueClient: (customerName: string, orderNumber: string, dueDate: string) => `
    <div style="font-family: sans-serif; color: #333; line-height: 1.6;">
      <h2 style="color: #EF4444;">Aviso de Pendência</h2>
      <p>Olá, ${customerName}.</p>
      <p>Consta em nosso sistema que o pedido <strong>#${orderNumber}</strong> venceu em <strong>${new Date(dueDate).toLocaleDateString()}</strong>.</p>
      <div style="background: #fff1f2; color: #9f1239; padding: 15px; border-radius: 8px; margin: 20px 0;">
        Por favor, realize o pagamento via link na sua área do cliente.
      </div>
    </div>
  `,

  overdueAdmin: (customerName: string, orderNumber: string, dueDate: string) => `
    <div style="font-family: sans-serif; color: #333; line-height: 1.6;">
      <h2 style="color: #DC2626;">⚠️ Pedido em Atraso</h2>
      <p>O pedido <strong>#${orderNumber}</strong> do cliente <strong>${customerName}</strong> está vencido.</p>
      <p><strong>Vencimento:</strong> ${new Date(dueDate).toLocaleDateString()}</p>
    </div>
  `
};
