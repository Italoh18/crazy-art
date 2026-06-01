import { getAuth, Env } from './_auth';

export const onRequestPost: any = async ({ request, env }: { request: Request, env: Env }) => {

  try {
    // 1. Verificação de Autenticação (Opcional para permitir uploads de visitantes em formulários específicos)
    const user = await getAuth(request, env);
    // Nota: Mantemos o usuário como null se não houver token, permitindo uploads anônimos
    // mas aplicando restrições mais severas.

    // 2. Receber FormData
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const category = formData.get('category') as string || ''; // p.ex: banners, portfolio, clientes

    if (!file) {
      return new Response(JSON.stringify({ error: 'Nenhum arquivo enviado.' }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 3. Validação
    const allowedTypes = [
      'image/',
      'padding/', // Algumas variações de mime-type
      'application/pdf',
      'application/x-coreldraw',
      'application/illustrator',
      'application/postscript',
      'image/vnd.adobe.photoshop',
      'application/octet-stream' // Para extensões menos comuns ou binárias de artes
    ];

    const isAllowed = allowedTypes.some(type => file.type.startsWith(type)) || 
                      file.name.toLowerCase().endsWith('.cdr') || 
                      file.name.toLowerCase().endsWith('.ai') ||
                      file.name.toLowerCase().endsWith('.pdf') ||
                      file.name.toLowerCase().endsWith('.eps');

    if (!isAllowed && (!user || user.role !== 'admin')) {
      return new Response(JSON.stringify({ error: 'Formato de arquivo não suportado.' }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Limites de tamanho
    // Máximo 10MB para clientes logados ou anônimos, 50MB para admins
    const isUserAdmin = user && user.role === 'admin';
    const maxSize = isUserAdmin ? 50 * 1024 * 1024 : 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return new Response(JSON.stringify({ error: `O arquivo excede o limite de ${maxSize / (1024 * 1024)}MB.` }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 4. Gerar nome e path
    const timestamp = Date.now();
    const cleanFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    
    // Se tiver categoria, colocar na pasta imagens/categoria
    // Caso contrário, deixar na raiz do bucket (compatibilidade)
    let filePath = '';
    if (category) {
      // Garantir que a categoria é válida conforme solicitado (segurança simples)
      const validCategories = ['banners', 'portfolio', 'clientes'];
      const targetCategory = validCategories.includes(category) ? category : 'outros';
      filePath = `imagens/${targetCategory}/${timestamp}-${cleanFileName}`;
    } else {
      filePath = `${timestamp}-${cleanFileName}`;
    }

    // 5. Upload para o bucket R2
    const arrayBuffer = await file.arrayBuffer();
    
    await env.MY_BUCKET.put(filePath, arrayBuffer, {
      httpMetadata: {
        contentType: file.type,
        contentDisposition: `attachment; filename="${cleanFileName}"`,
      }
    });

    // 6. Retornar URL pública
    const publicUrl = `${env.R2_PUBLIC_URL}/${filePath}`;

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
