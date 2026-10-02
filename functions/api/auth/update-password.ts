
import { hashPassword } from '../_auth';

export async function onRequestPost(context: any) {
  try {
    const { id, password } = await context.request.json();

    if (!id || !password || String(password).length < 6) {
      return new Response(JSON.stringify({ error: 'A senha deve ter pelo menos 6 caracteres.' }), { status: 400 });
    }

    const db = context.env.DB;

    // Check if verified and within time window
    const user: any = await db.prepare('SELECT is_verified, code_created_at FROM clients WHERE id = ?')
      .bind(id)
      .first();

    if (!user || user.is_verified !== 1) {
      return new Response(JSON.stringify({ error: 'Verificação de segurança necessária.' }), { status: 403 });
    }

    const now = Math.floor(Date.now() / 1000);
    const verifiedAt = user.code_created_at || 0;
    if (now - verifiedAt > 600) { // Max 10 minutes after verification
      await db.prepare('UPDATE clients SET is_verified = 0 WHERE id = ?').bind(id).run();
      return new Response(JSON.stringify({ error: 'Sessão de verificação expirada. Solicite um novo código.' }), { status: 403 });
    }

    // Modern Bcrypt password hash (Version 2)
    const newHash = await hashPassword(String(password));

    // Update password and reset verification
    await db.prepare('UPDATE clients SET password_hash = ?, password_version = 2, verification_code = NULL, is_verified = 0, verification_attempts = 0 WHERE id = ?')
      .bind(newHash, id)
      .run();

    return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });

  } catch (e: any) {
    console.error("Auth update-password error:", e.message);
    return new Response(JSON.stringify({ error: 'Erro ao atualizar senha.' }), { status: 500 });
  }
}
