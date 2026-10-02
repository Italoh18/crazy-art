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

    // 3. Validação baseada no perfil
    const isUserAdmin = user && user.role === 'admin';
    const isUserClient = user && user.role === 'client';

    let isAllowed = false;
    let maxSize = 5 * 1024 * 1024; // 5MB padrão para anônimos

    if (isUserAdmin) {
      isAllowed = true;
      maxSize = 50 * 1024 * 1024;
    } else if (isUserClient) {
      const clientAllowed = [
        'image/',
        'application/pdf',
        'application/x-coreldraw',
        'application/illustrator',
        'application/postscript',
        'image/vnd.adobe.photoshop'
      ];
      isAllowed = clientAllowed.some(type => file.type.startsWith(type)) || 
                  file.name.toLowerCase().endsWith('.cdr') || 
                  file.name.toLowerCase().endsWith('.ai') ||
                  file.name.toLowerCase().endsWith('.pdf') ||
                  file.name.toLowerCase().endsWith('.eps') ||
                  file.name.toLowerCase().endsWith('.psd');
      maxSize = 15 * 1024 * 1024; // 15MB para clientes logados
    } else {
      // Visitantes Anônimos: Estritamente imagens comuns, máx 5MB
      const anonAllowed = [
        'image/jpeg',
        'image/png',
        'image/webp',
        'image/svg+xml',
        'image/gif'
      ];
      isAllowed = anonAllowed.includes(file.type.toLowerCase()) || 
                  file.name.toLowerCase().endsWith('.jpg') ||
                  file.name.toLowerCase().endsWith('.jpeg') ||
                  file.name.toLowerCase().endsWith('.png') ||
                  file.name.toLowerCase().endsWith('.webp');
      maxSize = 5 * 1024 * 1024;
    }

    if (!isAllowed) {
      return new Response(JSON.stringify({ error: 'Formato de arquivo não suportado ou upload não autorizado para este tipo.' }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (file.size > maxSize) {
      return new Response(JSON.stringify({ error: `O arquivo excede o limite de ${maxSize / (1024 * 1024)}MB permitido para o seu perfil.` }), { 
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
