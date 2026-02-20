
export async function onRequestPost(context) {
  try {
    const { userId, email, type } = await context.request.json();

    if (!userId || !email) {
      return new Response(JSON.stringify({ error: 'Dados incompletos' }), { status: 400 });
    }

    // Generate 4-digit code
    const code = Math.floor(1000 + Math.random() * 9000).toString();

    // Save to D1
    // We store the code in the user's row. 
    // Note: For email update, 'email' param is the NEW email, but we store the code in the user's row identified by userId.
    const db = context.env.DB;
    await db.prepare('UPDATE clients SET verification_code = ?, is_verified = 0 WHERE id = ?')
      .bind(code, userId)
      .run();

    // Send email via Resend
    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${context.env.RESEND_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: context.env.SENDER_EMAIL,
        to: email,
        subject: `Código de Verificação: ${code}`,
        html: `
          <div style="font-family: sans-serif; padding: 20px; color: #333;">
            <h2 style="color: #F59E0B;">Crazy Art Studio</h2>
            <p>Você solicitou uma alteração de ${type === 'password' ? 'senha' : 'email'}.</p>
            <p>Seu código de verificação é:</p>
            <h1 style="font-size: 32px; letter-spacing: 5px; background: #f4f4f5; padding: 10px; display: inline-block; border-radius: 8px;">${code}</h1>
            <p>Se não foi você, ignore este email.</p>
          </div>
        `
      })
    });

    if (!resendRes.ok) {
      const err = await resendRes.text();
      console.error("Resend Error:", err);
      return new Response(JSON.stringify({ error: 'Erro ao enviar email' }), { status: 500 });
    }

    return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });

  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
}
