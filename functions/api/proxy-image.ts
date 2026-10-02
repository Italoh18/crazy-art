import { Env } from './_auth';

function isPrivateIpOrHost(hostname: string): boolean {
  const lower = hostname.toLowerCase();
  if (
    lower === 'localhost' ||
    lower.endsWith('.localhost') ||
    lower.endsWith('.local') ||
    lower.endsWith('.internal') ||
    lower.endsWith('.arpa') ||
    lower === '127.0.0.1' ||
    lower === '0.0.0.0' ||
    lower === '::1' ||
    lower === '169.254.169.254' || // AWS / GCP / Cloud metadata IP
    lower.startsWith('10.') ||
    lower.startsWith('192.168.') ||
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(lower)
  ) {
    return true;
  }
  return false;
}

export const onRequestGet: any = async ({ request }: { request: Request, env: Env }) => {
  const urlParam = new URL(request.url).searchParams.get('url');
  if (!urlParam) {
    return new Response('Parâmetro url ausente', { status: 400 });
  }

  let parsed: URL;
  try {
    parsed = new URL(urlParam);
  } catch {
    return new Response('URL inválida', { status: 400 });
  }

  // Permitir apenas protocolo HTTPS
  if (parsed.protocol !== 'https:') {
    return new Response('Apenas URLs HTTPS são permitidas por segurança.', { status: 400 });
  }

  // Bloquear IPs e redes privadas / metadados de nuvem (SSRF)
  if (isPrivateIpOrHost(parsed.hostname)) {
    return new Response('Acesso a endereços de rede privada ou locais é proibido.', { status: 403 });
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000); // 6s timeout

    const response = await fetch(parsed.toString(), {
      signal: controller.signal,
      headers: {
        'User-Agent': 'CrazyArt-ImageProxy/1.0'
      }
    });
    clearTimeout(timeout);

    const contentType = response.headers.get('content-type') || '';
    // Apenas repassar se for imagem
    if (!contentType.startsWith('image/')) {
      return new Response('O recurso requisitado não é uma imagem válida.', { status: 400 });
    }

    const newHeaders = new Headers();
    newHeaders.set('Access-Control-Allow-Origin', '*');
    newHeaders.set('Content-Type', contentType);
    newHeaders.set('Cache-Control', 'public, max-age=86400');
    newHeaders.set('X-Content-Type-Options', 'nosniff');
    
    return new Response(response.body, {
      status: response.status,
      headers: newHeaders
    });
  } catch (error: any) {
    return new Response('Falha ao obter imagem remota.', { status: 502 });
  }
};
