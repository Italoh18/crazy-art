
import { getAuth } from '../_auth';

export async function onRequestPost(context: any) {
  try {
    const { userId, email, type } = await context.request.json();
    const db = context.env.DB;

    // Ensure verification security columns exist
    try {
      await db.prepare('ALTER TABLE clients ADD COLUMN verification_attempts INTEGER DEFAULT 0').run();
    } catch (e) {}
    try {
      await db.prepare('ALTER TABLE clients ADD COLUMN code_created_at INTEGER DEFAULT 0').run();
    } catch (e) {}

    let targetClient: any = null;
    let recipientEmail = '';

    // If type is password reset:
    if (type === 'password') {
      if (userId) {
        targetClient = await db.prepare('SELECT id, email, name FROM clients WHERE id = ?').bind(userId).first();
      } else if (email) {
        targetClient = await db.prepare('SELECT id, email, name FROM clients WHERE email = ?').bind(String(email).trim().toLowerCase()).first();
      }

      if (!targetClient || !targetClient.email) {
        return new Response(JSON.stringify({ error: 'Usuário não encontrado.' }), { status: 404 });
      }

      // Always send to the client's REGISTERED email in the database to prevent account takeover
      recipientEmail = targetClient.email;
    } else if (type === 'email') {
      // Changing email requires the user to be logged in
      const authUser = await getAuth(context.request, context.env);
      if (!authUser || (authUser.role !== 'admin' && authUser.clientId !== userId)) {
        return new Response(JSON.stringify({ error: 'Não autorizado para alterar e-mail.' }), { status: 401 });
      }

      if (!email || !email.includes('@')) {
        return new Response(JSON.stringify({ error: 'Novo e-mail inválido.' }), { status: 400 });
      }

      targetClient = await db.prepare('SELECT id, email, name FROM clients WHERE id = ?').bind(userId).first();
      if (!targetClient) {
        return new Response(JSON.stringify({ error: 'Usuário não encontrado.' }), { status: 404 });
      }

      // Check if new email is already used by another client
      const emailInUse = await db.prepare('SELECT id FROM clients WHERE email = ? AND id != ?').bind(String(email).trim().toLowerCase(), userId).first();
      if (emailInUse) {
        return new Response(JSON.stringify({ error: 'Este e-mail já está sendo utilizado por outra conta.' }), { status: 400 });
      }

      recipientEmail = String(email).trim().toLowerCase();
    } else {
      return new Response(JSON.stringify({ error: 'Tipo de solicitação inválido.' }), { status: 400 });
    }

    // Generate secure 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const nowTs = Math.floor(Date.now() / 1000);

    // Save to D1 with timestamp and reset attempts
    await db.prepare('UPDATE clients SET verification_code = ?, is_verified = 0, verification_attempts = 0, code_created_at = ? WHERE id = ?')
      .bind(code, nowTs, targetClient.id)
      .run();

    // Send email via Resend
    if (!context.env.RESEND_API_KEY || !context.env.SENDER_EMAIL) {
      console.warn("Resend email service not configured.");
      return new Response(JSON.stringify({ success: true, message: 'Código gerado.' }), { headers: { 'Content-Type': 'application/json' } });
    }

    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${context.env.RESEND_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: context.env.SENDER_EMAIL,
        to: recipientEmail,
        subject: `Código de Verificação: ${code}`,
        html: `
          <div style="font-family: sans-serif; padding: 20px; color: #333;">
            <h2 style="color: #F59E0B;">Crazy Art | Comunicação visual</h2>
            <p>Olá, <strong>${targetClient.name || 'Cliente'}</strong>!</p>
            <p>Você solicitou uma alteração de ${type === 'password' ? 'senha' : 'e-mail'}.</p>
            <p>Seu código de verificação é:</p>
            <h1 style="font-size: 32px; letter-spacing: 5px; background: #f4f4f5; padding: 12px; display: inline-block; border-radius: 8px; font-family: monospace; border: 1px solid #e4e4e7;">${code}</h1>
            <p style="color: #666; font-size: 13px;">Este código é válido por 10 minutos. Se não foi você quem solicitou, ignore este e-mail.</p>
          </div>
        `
      })
    });

    if (!resendRes.ok) {
      const err = await resendRes.text();
      console.error("Resend Error:", err);
      return new Response(JSON.stringify({ error: 'Erro ao enviar e-mail com código.' }), { status: 500 });
    }

    return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });

  } catch (e: any) {
    console.error("Auth send-code error:", e.message);
    return new Response(JSON.stringify({ error: 'Erro ao processar solicitação. Tente novamente mais tarde.' }), { status: 500 });
  }
}
