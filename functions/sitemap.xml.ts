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

function formatDate(dateStr?: string): string {
  if (!dateStr) return new Date().toISOString().split('T')[0];
  try {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      return d.toISOString().split('T')[0];
    }
  } catch (e) {
    // fallback
  }
  return new Date().toISOString().split('T')[0];
}

export const onRequestGet: any = async ({ env }: { env: Env }) => {
  const baseUrl = 'https://crazyart.com.br';
  const today = new Date().toISOString().split('T')[0];

  const staticPages = [
    { loc: `${baseUrl}/`, priority: '1.0', changefreq: 'daily', lastmod: today, image: `${baseUrl}/icons/icon-512.svg`, imageTitle: 'Crazy Art Logo' },
    { loc: `${baseUrl}/quitanda_de_art`, priority: '0.9', changefreq: 'daily', lastmod: today },
    { loc: `${baseUrl}/shop`, priority: '0.8', changefreq: 'daily', lastmod: today },
    { loc: `${baseUrl}/layout-simples`, priority: '0.8', changefreq: 'weekly', lastmod: today },
    { loc: `${baseUrl}/montagem-molde`, priority: '0.8', changefreq: 'weekly', lastmod: today },
    { loc: `${baseUrl}/vetorizacao`, priority: '0.8', changefreq: 'weekly', lastmod: today },
    { loc: `${baseUrl}/matriz-bordado`, priority: '0.8', changefreq: 'weekly', lastmod: today },
    { loc: `${baseUrl}/tools`, priority: '0.7', changefreq: 'monthly', lastmod: today },
    { loc: `${baseUrl}/font-editor`, priority: '0.7', changefreq: 'monthly', lastmod: today },
    { loc: `${baseUrl}/layout-builder`, priority: '0.7', changefreq: 'monthly', lastmod: today },
    { loc: `${baseUrl}/remove-bg`, priority: '0.7', changefreq: 'monthly', lastmod: today },
    { loc: `${baseUrl}/pixel-art`, priority: '0.7', changefreq: 'monthly', lastmod: today },
    { loc: `${baseUrl}/pdf-to-word`, priority: '0.7', changefreq: 'monthly', lastmod: today },
    { loc: `${baseUrl}/print-check`, priority: '0.7', changefreq: 'monthly', lastmod: today },
    { loc: `${baseUrl}/trace-magic`, priority: '0.7', changefreq: 'monthly', lastmod: today },
    { loc: `${baseUrl}/power-trace-alfa`, priority: '0.7', changefreq: 'monthly', lastmod: today },
    { loc: `${baseUrl}/cdr-converter`, priority: '0.7', changefreq: 'monthly', lastmod: today },
    { loc: `${baseUrl}/pricing-calculator`, priority: '0.7', changefreq: 'monthly', lastmod: today },
    { loc: `${baseUrl}/smart-enlargement`, priority: '0.7', changefreq: 'monthly', lastmod: today },
    { loc: `${baseUrl}/politica-de-devolucao`, priority: '0.5', changefreq: 'yearly', lastmod: today },
  ];

  let arts: any[] = [];
  try {
    if (env.DB) {
      const { results } = await env.DB.prepare(
        'SELECT id, name, slug, image_url, description, alt_text, created_at FROM catalog WHERE type = "art" AND active = 1 ORDER BY id DESC LIMIT 5000'
      ).all();
      arts = results || [];
    }
  } catch (err: any) {
    // Se a coluna slug/alt_text ainda não existir, tenta query básica
    try {
      if (env.DB) {
        const { results } = await env.DB.prepare(
          'SELECT id, name, image_url, description, created_at FROM catalog WHERE type = "art" AND active = 1 ORDER BY id DESC LIMIT 5000'
        ).all();
        arts = results || [];
      }
    } catch (fallbackErr) {
      console.error('Erro ao ler artes para sitemap:', fallbackErr);
    }
  }

  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n';

  // Páginas Estáticas
  for (const page of staticPages) {
    xml += '  <url>\n';
    xml += `    <loc>${escapeXml(page.loc)}</loc>\n`;
    xml += `    <lastmod>${page.lastmod}</lastmod>\n`;
    xml += `    <changefreq>${page.changefreq}</changefreq>\n`;
    xml += `    <priority>${page.priority}</priority>\n`;
    if (page.image) {
      xml += '    <image:image>\n';
      xml += `      <image:loc>${escapeXml(page.image)}</image:loc>\n`;
      if (page.imageTitle) {
        xml += `      <image:title>${escapeXml(page.imageTitle)}</image:title>\n`;
      }
      xml += '    </image:image>\n';
    }
    xml += '  </url>\n';
  }

  // Páginas Dinâmicas de Artes da Quitanda
  for (const art of arts) {
    const artSlug = art.slug || generateSlug(art.name);
    if (!artSlug) continue;

    const loc = `${baseUrl}/quitanda_de_art/${artSlug}`;
    const lastmod = formatDate(art.created_at);
    const imageUrl = resolveImageUrl(art.image_url || art.imageUrl, env.R2_PUBLIC_URL);
    const title = art.name || 'Arte Digital para Estamparia';
    const caption = art.alt_text || art.description || `Arte ${title} em vetor para download imediato`;

    xml += '  <url>\n';
    xml += `    <loc>${escapeXml(loc)}</loc>\n`;
    xml += `    <lastmod>${lastmod}</lastmod>\n`;
    xml += `    <changefreq>weekly</changefreq>\n`;
    xml += `    <priority>0.8</priority>\n`;
    if (imageUrl) {
      xml += '    <image:image>\n';
      xml += `      <image:loc>${escapeXml(imageUrl)}</image:loc>\n`;
      xml += `      <image:title>${escapeXml(title)}</image:title>\n`;
      xml += `      <image:caption>${escapeXml(caption)}</image:caption>\n`;
      xml += '    </image:image>\n';
    }
    xml += '  </url>\n';
  }

  xml += '</urlset>';

  return new Response(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600'
    }
  });
};
