
export async function onRequestPost(context) {
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

    if (!user || user.verification_code !== code) {
      return new Response(JSON.stringify({ error: 'Código inválido' }), { status: 400 });
    }

    // Mark as verified
    await db.prepare('UPDATE clients SET is_verified = 1 WHERE id = ?')
      .bind(userId)
      .run();

    return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });

  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
}
