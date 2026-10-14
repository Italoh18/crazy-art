import { Env } from './api/_auth';

function generateSlug(text: string): string {
  if (!text) return '';
  return String(text)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function resolveImageUrl(imageUrl: string | null | undefined, r2PublicUrl?: string): string {
  if (!imageUrl) return 'https://crazyart.com.br/icons/icon-512.svg';
  const trimmed = imageUrl.trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }
  const base = (r2PublicUrl || 'https://imagens.crazyart.com.br').replace(/\/+$/, '');
  const path = trimmed.replace(/^\/+/, '');
  return `${base}/${path}`;
}

function escapeXml(str: string): string {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function formatRssDate(dateStr?: string | null): string {
  if (!dateStr) return new Date().toUTCString();
  try {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      return d.toUTCString();
    }
  } catch (e) {
    // fallback
  }
  return new Date().toUTCString();
}

function getMimeType(url: string): string {
  const lower = url.toLowerCase().split('?')[0];
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.gif')) return 'image/gif';
  if (lower.endsWith('.svg')) return 'image/svg+xml';
  return 'image/jpeg';
}

export const onRequestGet: any = async ({ env }: { env: Env }) => {
  const baseUrl = 'https://crazyart.com.br';
  let arts: any[] = [];

  try {
    if (env.DB) {
      const { results } = await env.DB.prepare(
        "SELECT id, name, slug, image_url, description, created_at FROM catalog WHERE type = 'art' AND active = 1 AND created_at >= '2026-10-15' ORDER BY created_at DESC, id DESC LIMIT 50"
      ).all();
      arts = results || [];
    }
  } catch (err: any) {
    // Fallback caso a coluna slug ainda não exista na tabela catalog
    try {
      if (env.DB) {
        const { results } = await env.DB.prepare(
          "SELECT id, name, image_url, description, created_at FROM catalog WHERE type = 'art' AND active = 1 AND created_at >= '2026-10-15' ORDER BY created_at DESC, id DESC LIMIT 50"
        ).all();
        arts = results || [];
      }
    } catch (fallbackErr) {
      console.error('Erro ao ler artes para feed RSS:', fallbackErr);
    }
  }

  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<rss version="2.0" xmlns:media="http://search.yahoo.com/mrss/" xmlns:atom="http://www.w3.org/2005/Atom">\n';
  xml += '  <channel>\n';
  xml += '    <title>Quitanda da Crazy Art - Novas Artes</title>\n';
  xml += `    <link>${baseUrl}/quitanda_de_art</link>\n`;
  xml += '    <description>Novas artes em vetor prontas para serigrafia, DTF e sublimação na Quitanda da Crazy Art.</description>\n';
  xml += '    <language>pt-br</language>\n';
  xml += `    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>\n`;
  xml += `    <atom:link href="${baseUrl}/rss.xml" rel="self" type="application/rss+xml" />\n`;

  for (const art of arts) {
    const artSlug = art.slug || generateSlug(art.name) || String(art.id);
    const link = `${baseUrl}/quitanda_de_art/${artSlug}`;
    const title = art.name || 'Arte Digital';
    const rawDesc = art.description ? String(art.description).trim() : '';
    const description = rawDesc || `Arte ${art.name || ''} em vetor, pronta para serigrafia, DTF e sublimação. Arquivo digital para estamparia na Quitanda da Crazy Art.`;
    const imageUrl = resolveImageUrl(art.image_url || art.imageUrl, env.R2_PUBLIC_URL);
    const mimeType = getMimeType(imageUrl);
    const pubDate = formatRssDate(art.created_at);

    xml += '    <item>\n';
    xml += `      <title>${escapeXml(title)}</title>\n`;
    xml += `      <link>${escapeXml(link)}</link>\n`;
    xml += `      <guid isPermaLink="true">${escapeXml(link)}</guid>\n`;
    xml += `      <pubDate>${pubDate}</pubDate>\n`;
    xml += `      <description>${escapeXml(description)}</description>\n`;
    xml += `      <enclosure url="${escapeXml(imageUrl)}" length="0" type="${escapeXml(mimeType)}" />\n`;
    xml += `      <media:content url="${escapeXml(imageUrl)}" medium="image" type="${escapeXml(mimeType)}" />\n`;
    xml += '    </item>\n';
  }

  xml += '  </channel>\n';
  xml += '</rss>';

  return new Response(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=1800, s-maxage=1800',
      'Access-Control-Allow-Origin': '*'
    }
  });
};

export const onRequest = onRequestGet;
