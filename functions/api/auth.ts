import { Env, createJWT } from './_auth';

export const onRequestPost: any = async ({ request, env }: { request: Request, env: Env }) => {
  const body = await request.json() as any;
  const { code, cpf } = body;

  // Login Admin
  if (code === '79913061') {
    const token = await createJWT({ role: 'admin' }, env.JWT_SECRET);
    return Response.json({ token, role: 'admin' });
  }

  // Login Cliente via CPF
  if (cpf) {
    const client: any = await env.DB.prepare('SELECT * FROM clients WHERE cpf = ?').bind(cpf).first();
    if (client) {
      const token = await createJWT({ role: 'client', clientId: client.id }, env.JWT_SECRET);
      
      // Mapeia o cliente para o formato aninhado que o frontend espera
      const formattedClient = {
          ...client,
          address: {
              street: client.street || '',
              number: client.number || '',
              zipCode: client.zipCode || ''
          }
      };

      return Response.json({ token, role: 'client', customer: formattedClient });
    }
  }

  return new Response(JSON.stringify({ error: 'Acesso negado. Verifique os dados e tente novamente.' }), { 
    status: 401,
    headers: { 'Content-Type': 'application/json' }
  });
};