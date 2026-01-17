
import { Env } from './_auth';

export const onRequest: any = async ({ env }: { env: Env }) => {
  const testId = crypto.randomUUID();
  const ts = new Date().toISOString();
  const testCpf = `${Math.floor(Math.random() * 999)}.${Math.floor(Math.random() * 999)}.${Math.floor(Math.random() * 999)}-${Math.floor(Math.random() * 99)}`;

  try {
    console.log("Iniciando Force Insert de Diagnóstico...");

    // 1. Inserção Hardcoded
    const insertResult = await env.DB.prepare(
      'INSERT INTO clients (id, name, email, phone, cpf, street, number, zipCode, creditLimit) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).bind(
      testId, 
      `DEBUG_USER_${Date.now()}`, 
      "debug@crazyart.com", 
      "16999999999", 
      testCpf, 
      "Rua de Debug", 
      "0", 
      "00000-000", 
      999.99
    ).run();

    console.log("Resultado do Insert Diagnóstico:", JSON.stringify(insertResult));

    // 2. Seleção Imediata de Todos os Clientes
    const { results } = await env.DB.prepare('SELECT * FROM clients ORDER BY createdAt DESC').all();

    return Response.json({
      persisted: results.some((r: any) => r.id === testId),
      message: "Se 'persisted' for true, o D1 está gravando corretamente.",
      test_id: testId,
      insert_meta: insertResult.meta,
      db_count: results.length,
      rows: results
    });
  } catch (e: any) {
    console.error("Erro fatal no diagnóstico:", e.message);
    return new Response(JSON.stringify({ 
      persisted: false,
      error: e.message,
      stack: e.stack 
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
