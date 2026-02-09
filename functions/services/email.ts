
export interface EmailPayload {
  to: string | string[];
  subject: string;
  html: string;
}

// Definição dos tipos de templates disponíveis e suas variáveis
export type TemplateType = 
  | 'newOrderClient' 
  | 'newOrderAdmin' 
  | 'paymentConfirmedAdmin' 
  | 'overdueClient' 
  | 'overdueAdmin';

// Helper para formatar o remetente corretamente
const getSender = (env: any) => {
  const sender = env.SENDER_EMAIL || 'no-reply@crazyart.com.br';
  if (sender.includes('<') && sender.includes('>')) {
    return sender;
  }
  return `Crazy Art <${sender}>`;
};

export const getAdminEmail = (env: any) => env.ADMIN_EMAIL || 'admin@crazyart.com';

/**
 * Função principal de envio.
 * Agora é mais genérica e apenas entrega o que recebe.
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

// --- Sistema de Templates Híbrido (DB + Fallback) ---

const defaultTemplates = {
  newOrderClient: (vars: any) => ({
    subject: `Novo Pedido #${vars.orderNumber} - Crazy Art`,
    html: `
      <div style="font-family: sans-serif; color: #333; line-height: 1.6; max-width: 600px;">
        <h2 style="color: #F59E0B;">Olá, ${vars.customerName}!</h2>
        <p>Seu pedido <strong>#${vars.orderNumber}</strong> foi criado com sucesso.</p>
        <div style="background: #f4f4f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0; font-size: 18px;"><strong>Valor Total:</strong> R$ ${vars.total}</p>
        </div>
        <p>Acesse sua área do cliente para acompanhar o status ou realizar o pagamento.</p>
        <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="font-size: 12px; color: #777;">Crazy Art Studio</p>
      </div>
    `
  }),

  newOrderAdmin: (vars: any) => ({
    subject: `Novo Pedido Loja #${vars.orderNumber}`,
    html: `
      <div style="font-family: sans-serif; color: #333; line-height: 1.6;">
        <h2 style="color: #333;">🔔 Novo Pedido da Loja!</h2>
        <p>O cliente <strong>${vars.customerName}</strong> realizou um novo pedido.</p>
        <ul style="background: #f9fafb; padding: 15px 15px 15px 30px; border-radius: 8px; border: 1px solid #e5e7eb;">
          <li><strong>Pedido:</strong> #${vars.orderNumber}</li>
          <li><strong>Valor:</strong> R$ ${vars.total}</li>
        </ul>
        <p>Acesse o painel administrativo para detalhes.</p>
      </div>
    `
  }),

  paymentConfirmedAdmin: (vars: any) => ({
    subject: `Pagamento Confirmado #${vars.orderNumber}`,
    html: `
      <div style="font-family: sans-serif; color: #333; line-height: 1.6;">
        <h2 style="color: #10B981;">✅ Pagamento Confirmado!</h2>
        <p>O pagamento do pedido <strong>#${vars.orderNumber}</strong> de <strong>${vars.customerName}</strong> foi processado.</p>
        <p>O status foi atualizado para "Pago" automaticamente.</p>
      </div>
    `
  }),

  overdueClient: (vars: any) => ({
    subject: `Pendência: Pedido #${vars.orderNumber}`,
    html: `
      <div style="font-family: sans-serif; color: #333; line-height: 1.6;">
        <h2 style="color: #EF4444;">Aviso de Pendência</h2>
        <p>Olá, ${vars.customerName}.</p>
        <p>Consta em nosso sistema que o pedido <strong>#${vars.orderNumber}</strong> venceu em <strong>${vars.dueDate}</strong>.</p>
        <div style="background: #fff1f2; color: #9f1239; padding: 15px; border-radius: 8px; margin: 20px 0;">
          Por favor, realize o pagamento via link na sua área do cliente.
        </div>
      </div>
    `
  }),

  overdueAdmin: (vars: any) => ({
    subject: `ATRASO: Pedido #${vars.orderNumber}`,
    html: `
      <div style="font-family: sans-serif; color: #333; line-height: 1.6;">
        <h2 style="color: #DC2626;">⚠️ Pedido em Atraso</h2>
        <p>O pedido <strong>#${vars.orderNumber}</strong> do cliente <strong>${vars.customerName}</strong> está vencido.</p>
        <p><strong>Vencimento:</strong> ${vars.dueDate}</p>
      </div>
    `
  })
};

/**
 * Busca o template (do DB ou padrão) e substitui as variáveis.
 */
export const getRenderedTemplate = async (
  env: any, 
  type: TemplateType, 
  variables: Record<string, string | number>
): Promise<{ subject: string, html: string }> => {
  
  let dbTemplate: any = null;
  
  try {
    // Tenta buscar do banco de dados
    if (env.DB) {
        dbTemplate = await env.DB.prepare('SELECT * FROM email_templates WHERE type = ?').bind(type).first();
    }
  } catch (e) {
    console.error(`Erro ao buscar template ${type} do DB:`, e);
  }

  // Se existir no DB, usa ele; caso contrário, usa o padrão hardcoded
  if (dbTemplate) {
    let subject = dbTemplate.subject;
    let html = dbTemplate.html_body;

    // Substituição de variáveis (ex: {customerName} -> João)
    for (const [key, value] of Object.entries(variables)) {
        const regex = new RegExp(`{${key}}`, 'g');
        subject = subject.replace(regex, String(value));
        html = html.replace(regex, String(value));
    }

    // Injeção da Logo se existir
    if (dbTemplate.logo_url) {
        const logoHtml = `<div style="text-align: center; margin-bottom: 20px;"><img src="${dbTemplate.logo_url}" alt="Logo" style="max-height: 60px; max-width: 100%;" /></div>`;
        html = logoHtml + html;
    }

    return { subject, html };
  } else {
    // Fallback para templates padrão
    const fallbackFn = defaultTemplates[type];
    if (fallbackFn) {
        return fallbackFn(variables);
    }
    return { subject: 'Notificação', html: '<p>Notificação do Sistema</p>' };
  }
};

// Mantemos o objeto 'templates' antigo apenas para compatibilidade se algum arquivo não foi atualizado,
// mas ele redireciona para a lógica simplificada (sem DB, pois não tem env aqui)
export const templates = {
    newOrderClient: (customerName: string, orderNumber: string, total: number) => defaultTemplates.newOrderClient({ customerName, orderNumber, total }).html,
    newOrderAdmin: (customerName: string, orderNumber: string, total: number) => defaultTemplates.newOrderAdmin({ customerName, orderNumber, total }).html,
    paymentConfirmedAdmin: (orderNumber: string, customerName: string) => defaultTemplates.paymentConfirmedAdmin({ orderNumber, customerName }).html,
    overdueClient: (customerName: string, orderNumber: string, dueDate: string) => defaultTemplates.overdueClient({ customerName, orderNumber, dueDate }).html,
    overdueAdmin: (customerName: string, orderNumber: string, dueDate: string) => defaultTemplates.overdueAdmin({ customerName, orderNumber, dueDate }).html,
};
