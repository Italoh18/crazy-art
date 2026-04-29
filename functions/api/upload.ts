import { getAuth, Env } from './_auth';

export const onRequestPost: any = async ({ request, env }: { request: Request, env: Env }) => {

  try {
    // 1. Verificação de Autenticação
    const user = await getAuth(request, env);
    if (!user || user.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Acesso negado. Apenas administradores podem fazer upload.' }), { 
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 2. Receber FormData
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return new Response(JSON.stringify({ error: 'Nenhum arquivo enviado.' }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 3. Validação
    // Apenas imagens
    if (!file.type.startsWith('image/')) {
      return new Response(JSON.stringify({ error: 'Apenas arquivos de imagem são permitidos.' }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Máximo 5MB
    if (file.size > 5 * 1024 * 1024) {
      return new Response(JSON.stringify({ error: 'O arquivo excede o limite de 5MB.' }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 4. Gerar nome único
    const timestamp = Date.now();
    const cleanFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const fileName = `${timestamp}-${cleanFileName}`;

    // 5. Upload para o bucket R2
    // O Cloudflare Functions suporta streaming ou ArrayBuffer para o bucket.put()
    const arrayBuffer = await file.arrayBuffer();
    
    await env.MY_BUCKET.put(fileName, arrayBuffer, {
      httpMetadata: {
        contentType: file.type,
      }
    });

    // 6. Retornar URL pública
    const publicUrl = `${env.R2_PUBLIC_URL}/${fileName}`;

    return new Response(JSON.stringify({ url: publicUrl }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (e: any) {
    console.error("Erro no upload R2:", e.message);
    return new Response(JSON.stringify({ error: 'Erro interno ao processar upload.' }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
