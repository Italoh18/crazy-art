
export async function onRequestPost(context: any) {
  try {
    const { id, email } = await context.request.json();

    if (!id || !email) {
      return new Response(JSON.stringify({ error: 'Dados incompletos' }), { status: 400 });
    }

    const db = context.env.DB;

    // Check if verified
    const user = await db.prepare('SELECT is_verified FROM clients WHERE id = ?')
      .bind(id)
      .first();

    if (!user || user.is_verified !== 1) {
      return new Response(JSON.stringify({ error: 'Verificação necessária' }), { status: 403 });
    }

    // Update email and reset verification
    await db.prepare('UPDATE clients SET email = ?, verification_code = NULL, is_verified = 0 WHERE id = ?')
      .bind(email, id)
      .run();

    return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });

  } catch (e: any) {
    console.error("Auth update-email error:", e.message);
    return new Response(JSON.stringify({ error: 'Erro ao atualizar e-mail.' }), { status: 500 });
  }
}
