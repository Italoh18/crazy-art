
export async function onRequestPost(context: any) {
  try {
    const { userId, code } = await context.request.json();

    if (!userId || !code) {
      return new Response(JSON.stringify({ error: 'Dados incompletos' }), { status: 400 });
    }

    const db = context.env.DB;
    
    // Verify code
    const user = await db.prepare('SELECT verification_code FROM clients WHERE id = ?')
      .bind(userId)
      .first();

    if (!user || !user.verification_code || user.verification_code !== code) {
      return new Response(JSON.stringify({ error: 'Código inválido' }), { status: 400 });
    }

    // Mark as verified and CLEAR the code to prevent reuse
    await db.prepare('UPDATE clients SET is_verified = 1, verification_code = NULL WHERE id = ?')
      .bind(userId)
      .run();

    return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });

  } catch (e: any) {
    console.error("Auth verify-code error:", e.message);
    return new Response(JSON.stringify({ error: 'Erro ao verificar código. Tente novamente.' }), { status: 500 });
  }
}
