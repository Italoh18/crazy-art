
import { Env } from '../_auth';

export const onRequest: any = async ({ env }: { env: Env }) => {
  const testId = crypto.randomUUID();
  const ts = new Date().toISOString();
  
  try {
    // Diagnóstico: Tentativa de inserção direta para validar se o D1 aceita gravações
    // Baseado no schema identificado no arquivo orders.ts existente
    const insertResult = await env.DB.prepare(
      'INSERT INTO orders (id, orderNumber, customerId, description, totalValue, requestDate, dueDate, status, items, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).bind(
      testId,
      8888, // Número de pedido fixo para teste
      "DIAGNOSTIC_CLIENT", // customerId (mapeado de client_id no payload)
      "PEDIDO DE TESTE FORÇADO - DIAGNÓSTICO", // description
      99.99, // totalValue (mapeado de total no payload)
      ts, // requestDate (mapeado de order_date no payload)
      ts, // dueDate (mapeado de due_date no payload)
      "open", // status
      JSON.stringify([{ productId: "test", productName: "Item de Diagnóstico", quantity: 1, unitPrice: 99.99, total: 99.99 }]),
      ts // created_at
    ).run();

    // Busca imediata para confirmar persistência
    const { results } = await env.DB.prepare('SELECT * FROM orders ORDER BY created_at DESC LIMIT 10').all();

    return new Response(JSON.stringify({
      success: true,
      message: "Teste de persistência concluído. Verifique 'persisted' abaixo.",
      inserted_id: testId,
      persisted: results.some((r: any) => r.id === testId),
      insert_stats: insertResult,
      db_snapshot: results
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (e: any) {
    // Retorna erro detalhado do D1
    return new Response(JSON.stringify({
      success: false,
      error: e.message,
      stack: e.stack,
      hint: "Verifique se as colunas 'customerId', 'totalValue', 'requestDate' existem ou se são 'client_id', 'total', 'order_date'."
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
