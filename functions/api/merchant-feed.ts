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
    
    // Suporte para parâmetro de moeda (Default é BRL)
    let chosenCurrency = (url.searchParams.get('currency') || url.searchParams.get('country') || 'BRL').toUpperCase();
    if (chosenCurrency === 'KR') chosenCurrency = 'KRW';
    if (chosenCurrency === 'US') chosenCurrency = 'USD';
    if (chosenCurrency === 'BR') chosenCurrency = 'BRL';
    if (chosenCurrency === 'UK' || chosenCurrency === 'GB') chosenCurrency = 'GBP';
    if (chosenCurrency === 'JP') chosenCurrency = 'JPY';
    
    const validCurrencies = ['BRL', 'KRW', 'USD', 'EUR', 'JPY', 'GBP'];
    if (!validCurrencies.includes(chosenCurrency)) {
      chosenCurrency = 'BRL';
    }

    // Busca taxas de câmbio recentes para conversão precisa
    let rates: Record<string, number> = {
      BRL: 1,
      KRW: 250,
      USD: 0.18,
      EUR: 0.17,
      JPY: 29,
      GBP: 0.14
    };

    try {
      const exRes = await fetch('https://open.er-api.com/v6/latest/BRL');
      const data: any = await exRes.json();
      if (data && data.rates) {
        rates = {
          BRL: 1,
          KRW: data.rates.KRW || 250,
          USD: data.rates.USD || 0.18,
          EUR: data.rates.EUR || 0.17,
          JPY: data.rates.JPY || 29,
          GBP: data.rates.GBP || 0.14
        };
      }
    } catch (exErr) {
      // Usa os fallbacks definidos acima se a API falhar
    }

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
    xml += `    <description>Quitanda de Artes - Matrizes de Bordado, Estampas e Moldes Digitais (Feed ${chosenCurrency})</description>\n`;
    xml += '    <language>pt-br</language>\n';

    // Determina país e formato de frete com base na moeda
    let shippingCountry = 'BR';
    if (chosenCurrency === 'KRW') shippingCountry = 'KR';
    else if (chosenCurrency === 'USD') shippingCountry = 'US';
    else if (chosenCurrency === 'EUR') shippingCountry = 'DE';
    else if (chosenCurrency === 'JPY') shippingCountry = 'JP';
    else if (chosenCurrency === 'GBP') shippingCountry = 'GB';

    for (const row of results) {
      const id = String(row.id);
      const name = String(row.name || '');
      const description = String(row.description || `Adquira a arte digital ou produto '${name}' na Quitanda de Artes. Excelente qualidade e envio imediato.`);
      
      // Converte o preço base (BRL) para a moeda de destino
      const originalPrice = Number(row.price || 0);
      const rate = rates[chosenCurrency] || 1;
      const convertedPrice = originalPrice * rate;
      const priceText = `${convertedPrice.toFixed(2)} ${chosenCurrency}`;

      let imageUrl = row.image_url || row.imageUrl || '';
      if (!imageUrl) {
        imageUrl = `${origin}/icons/icon-192.svg`;
      } else if (!imageUrl.startsWith('http://') && !imageUrl.startsWith('https://')) {
        imageUrl = `${origin}${imageUrl.startsWith('/') ? '' : '/'}${imageUrl}`;
      }

      // Adiciona o parâmetro de moeda na URL do produto para que a página já carregue na moeda correta
      const productLink = `${origin}/shop?item=${encodeURIComponent(id)}&currency=${chosenCurrency}`;
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
      
      // Frete explícito no Feed para garantir aprovação do Google Merchant
      xml += '      <g:shipping>\n';
      xml += `        <g:country>${shippingCountry}</g:country>\n`;
      xml += '        <g:service>Entrega Digital Imediata</g:service>\n';
      xml += `        <g:price>0.00 ${chosenCurrency}</g:price>\n`;
      xml += '      </g:shipping>\n';

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
