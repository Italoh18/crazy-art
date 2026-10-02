
export async function onRequestPost(context: any) {
  try {
    const { userId, code } = await context.request.json();

    if (!userId || !code) {
      return new Response(JSON.stringify({ error: 'Dados incompletos' }), { status: 400 });
    }

    const db = context.env.DB;
    
    // Fetch code, attempts and created_at
    const user: any = await db.prepare('SELECT verification_code, verification_attempts, code_created_at FROM clients WHERE id = ?')
      .bind(userId)
      .first();

    if (!user || !user.verification_code) {
      return new Response(JSON.stringify({ error: 'Nenhum código ativo encontrado. Solicite um novo código.' }), { status: 400 });
    }

    const attempts = user.verification_attempts || 0;
    if (attempts >= 3) {
      // Invalidate code after 3 failed attempts
      await db.prepare('UPDATE clients SET verification_code = NULL, verification_attempts = 0 WHERE id = ?')
        .bind(userId)
        .run();
      return new Response(JSON.stringify({ error: 'Limite de tentativas excedido. Solicite um novo código.' }), { status: 429 });
    }

    const now = Math.floor(Date.now() / 1000);
    const createdAt = user.code_created_at || now;
    if (now - createdAt > 600) { // 10 minutes expiry
      await db.prepare('UPDATE clients SET verification_code = NULL, verification_attempts = 0 WHERE id = ?')
        .bind(userId)
        .run();
      return new Response(JSON.stringify({ error: 'Código expirado. Solicite um novo código.' }), { status: 400 });
    }

    if (String(user.verification_code).trim() !== String(code).trim()) {
      await db.prepare('UPDATE clients SET verification_attempts = ? WHERE id = ?')
        .bind(attempts + 1, userId)
        .run();
      const remaining = 2 - attempts;
      return new Response(JSON.stringify({ 
        error: remaining > 0 
          ? `Código incorreto. Você tem mais ${remaining} tentativa(s).` 
          : 'Código incorreto. Limite excedido.' 
      }), { status: 400 });
    }

    // Mark as verified, record timestamp and CLEAR the code to prevent reuse
    await db.prepare('UPDATE clients SET is_verified = 1, verification_code = NULL, verification_attempts = 0, code_created_at = ? WHERE id = ?')
      .bind(now, userId)
      .run();

    return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });

  } catch (e: any) {
    console.error("Auth verify-code error:", e.message);
    return new Response(JSON.stringify({ error: 'Erro ao verificar código. Tente novamente.' }), { status: 500 });
  }
}
