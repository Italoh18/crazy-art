
import { getAuth } from '../_auth';

export async function onRequestPost(context: any) {
  try {
    const authUser = await getAuth(context.request, context.env);
    const { id, email } = await context.request.json();

    if (!id || !email || !String(email).includes('@')) {
      return new Response(JSON.stringify({ error: 'E-mail inválido ou dados incompletos.' }), { status: 400 });
    }

    if (!authUser || (authUser.role !== 'admin' && authUser.clientId !== id)) {
      return new Response(JSON.stringify({ error: 'Acesso negado.' }), { status: 403 });
    }

    const cleanEmail = String(email).trim().toLowerCase();
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
    if (now - verifiedAt > 600) {
      await db.prepare('UPDATE clients SET is_verified = 0 WHERE id = ?').bind(id).run();
      return new Response(JSON.stringify({ error: 'Sessão de verificação expirada. Solicite um novo código.' }), { status: 403 });
    }

    // Check if email already taken
    const existing = await db.prepare('SELECT id FROM clients WHERE email = ? AND id != ?').bind(cleanEmail, id).first();
    if (existing) {
      return new Response(JSON.stringify({ error: 'Este e-mail já está cadastrado em outra conta.' }), { status: 400 });
    }

    // Update email and reset verification
    await db.prepare('UPDATE clients SET email = ?, verification_code = NULL, is_verified = 0, verification_attempts = 0 WHERE id = ?')
      .bind(cleanEmail, id)
      .run();

    return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });

  } catch (e: any) {
    console.error("Auth update-email error:", e.message);
    return new Response(JSON.stringify({ error: 'Erro ao atualizar e-mail.' }), { status: 500 });
  }
}
