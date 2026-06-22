import { Env } from './_auth';

function escapeXml(unsafe: string): string {
  if (!unsafe) return '';
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export const onRequest: any = async ({ request, env }: { request: Request, env: Env }) => {
  try {
    const url = new URL(request.url);
    const origin = url.origin;

    // Busca produtos ativos do catálogo
    let results: any[] = [];
    try {
      const dbRes = await env.DB.prepare('SELECT * FROM catalog WHERE active = 1 ORDER BY created_at DESC LIMIT 1000').all();
      results = dbRes?.results || [];
    } catch (sqlError: any) {
      if (sqlError.message?.includes('no such table')) {
        const fallback = await env.DB.prepare('SELECT * FROM products').all();
        results = fallback?.results || [];
      } else {
        throw sqlError;
      }
    }

    // Estrutura do XML RSS 2.0 estruturado para o Google Merchant Center
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<rss xmlns:g="http://base.google.com/ns/1.0" version="2.0">\n';
    xml += '  <channel>\n';
    xml += '    <title>Quitanda de Artes</title>\n';
    xml += `    <link>${escapeXml(origin)}</link>\n`;
    xml += '    <description>Quitanda de Artes - Matrizes de Bordado, Estampas e Moldes Digitais</description>\n';
    xml += '    <language>pt-br</language>\n';

    for (const row of results) {
      const id = String(row.id);
      const name = String(row.name || '');
      const description = String(row.description || `Adquira a arte digital ou produto '${name}' na Quitanda de Artes. Excelente qualidade e envio imediata.`);
      const priceVal = Number(row.price || 0);
      const priceText = `${priceVal.toFixed(2)} BRL`;

      let imageUrl = row.image_url || row.imageUrl || '';
      if (!imageUrl) {
        imageUrl = `${origin}/icons/icon-192.svg`;
      } else if (!imageUrl.startsWith('http://') && !imageUrl.startsWith('https://')) {
        imageUrl = `${origin}${imageUrl.startsWith('/') ? '' : '/'}${imageUrl}`;
      }

      const productLink = `${origin}/shop?item=${encodeURIComponent(id)}`;
      const categoryText = row.subcategory || (row.type === 'art' ? 'Arte Pronta' : 'Produto');

      xml += '    <item>\n';
      xml += `      <g:id>${escapeXml(id)}</g:id>\n`;
      xml += `      <g:title>${escapeXml(name)}</g:title>\n`;
      xml += `      <g:description>${escapeXml(description)}</g:description>\n`;
      xml += `      <g:link>${escapeXml(productLink)}</g:link>\n`;
      xml += `      <g:image_link>${escapeXml(imageUrl)}</g:image_link>\n`;
      xml += `      <g:price>${escapeXml(priceText)}</g:price>\n`;
      xml += '      <g:availability>in stock</g:availability>\n';
      xml += '      <g:condition>new</g:condition>\n';
      xml += '      <g:brand>Quitanda de Artes</g:brand>\n';
      if (categoryText) {
        xml += `      <g:product_type>${escapeXml(categoryText)}</g:product_type>\n`;
      }
      xml += '    </item>\n';
    }

    xml += '  </channel>\n';
    xml += '</rss>';

    return new Response(xml, {
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=3600, s-maxage=3600',
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
