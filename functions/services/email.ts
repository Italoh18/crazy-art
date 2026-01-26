
export interface EmailPayload {
  to: string;
  subject: string;
  title: string;
  message: string;
}

export const getAdminEmail = (env: any) => env.ADMIN_EMAIL || 'admin@crazyart.com';

export const sendEmail = async (env: any, payload: EmailPayload) => {
  // Verificação de segurança das variáveis
  if (
    !env.EMAILJS_SERVICE_ID ||
    !env.EMAILJS_TEMPLATE_ID ||
    !env.EMAILJS_PUBLIC_KEY
  ) {
    console.warn('[EmailJS] Variáveis de ambiente não configuradas (SERVICE_ID, TEMPLATE_ID ou PUBLIC_KEY).');
    return;
  }

  // Validação básica do destinatário
  if (!payload.to || !payload.to.includes('@')) {
    console.warn('[EmailJS] Destinatário inválido:', payload.to);
    return;
  }

  try {
    const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        service_id: env.EMAILJS_SERVICE_ID,
        template_id: env.EMAILJS_TEMPLATE_ID,
        user_id: env.EMAILJS_PUBLIC_KEY,
        template_params: {
          to_email: payload.to,
          subject: payload.subject,
          title: payload.title,
          message: payload.message,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[EmailJS] Erro na API:', errorText);
    } else {
      console.log(`[EmailJS] E-mail enviado para ${payload.to}`);
    }
  } catch (error: any) {
    console.error('[EmailJS] Exceção de rede:', error.message);
  }
};
