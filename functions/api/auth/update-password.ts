
export async function onRequestPost(context) {
  try {
    const { id, password } = await context.request.json();

    if (!id || !password) {
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

    // Hash password (SHA-256)
    const myText = new TextEncoder().encode(password);
    const myDigest = await crypto.subtle.digest({ name: 'SHA-256' }, myText);
    const hash = [...new Uint8Array(myDigest)].map(b => b.toString(16).padStart(2, '0')).join('');

    // Update password and reset verification
    await db.prepare('UPDATE clients SET password_hash = ?, verification_code = NULL, is_verified = 0 WHERE id = ?')
      .bind(hash, id)
      .run();

    return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });

  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
}
