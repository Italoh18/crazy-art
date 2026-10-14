import { Env } from '../api/_auth';

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

function escapeHtml(str: string): string {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export const onRequest: any = async (context: {
  request: Request;
  env: Env & { ASSETS?: { fetch: (req: Request | URL | string) => Promise<Response> } };
  params: { slug?: string };
  next: () => Promise<Response>;
}) => {
  const { request, env, params, next } = context;
  const slug = String(params.slug || '').trim();

  // Se não houver slug, continua para a página padrão
  if (!slug) {
    return next();
  }

  let art: any = null;

  try {
    if (env.DB) {
      // 1. Tenta buscar direto por slug ou ID na tabela catalog
      try {
        art = await env.DB.prepare(
          'SELECT * FROM catalog WHERE type = "art" AND (slug = ? OR id = ?) AND active = 1 LIMIT 1'
        ).bind(slug, slug).first();
      } catch (dbErr: any) {
        // Ignora erro se coluna slug ainda não existir na tabela
      }

      // 2. Fallback resiliente: se a coluna slug no banco estiver NULL para artes antigas,
      // busca as artes ativas e localiza pelo slug gerado em runtime (idêntico ao sitemap.xml)
      if (!art) {
        try {
          const { results } = await env.DB.prepare(
            'SELECT * FROM catalog WHERE type = "art" AND active = 1 LIMIT 500'
          ).all();

          art = (results || []).find((item: any) => {
            const itemSlug = item.slug || generateSlug(item.name);
            return itemSlug === slug || String(item.id) === slug;
          });
        } catch (fallbackErr) {
          console.error('Erro no fallback de busca por slug no D1:', fallbackErr);
        }
      }
    }
  } catch (err) {
    console.error('Erro ao buscar arte no D1:', err);
  }

  // Obter o HTML base da aplicação (SPA fallback)
  let response = await next();
  const contentType = response.headers.get('content-type') || '';
  if (!response.ok || !contentType.includes('text/html')) {
    const rootUrl = new URL('/', request.url);
    response = env.ASSETS ? await env.ASSETS.fetch(rootUrl) : await fetch(rootUrl);
  }

  // Se a arte NÃO foi encontrada no banco (slug inexistente / arte removida)
  // NUNCA deixar o canonical apontar para a home! Redireciona canonical para a Quitanda e marca noindex.
  if (!art) {
    const fallbackCanonical = 'https://crazyart.com.br/quitanda_de_art';
    const notFoundTitle = 'Arte não encontrada | Quitanda de Artes - Crazy Art';
    const notFoundDesc = 'A arte solicitada não foi encontrada ou não está mais disponível na Quitanda de Artes da Crazy Art.';

    const transformedResponse = new HTMLRewriter()
      .on('title', {
        element(el: any) {
          el.setInnerContent(notFoundTitle);
        }
      })
      .on('meta[name="description"]', {
        element(el: any) {
          el.setAttribute('content', notFoundDesc);
        }
      })
      .on('meta[property="og:title"]', {
        element(el: any) {
          el.setAttribute('content', notFoundTitle);
        }
      })
      .on('meta[property="og:description"]', {
        element(el: any) {
          el.setAttribute('content', notFoundDesc);
        }
      })
      .on('meta[property="og:url"], meta[property="twitter:url"], meta[name="twitter:url"]', {
        element(el: any) {
          el.setAttribute('content', fallbackCanonical);
        }
      })
      .on('link[rel="canonical"]', {
        element(el: any) {
          el.setAttribute('href', fallbackCanonical);
        }
      })
      .on('head', {
        element(el: any) {
          el.append('<meta name="robots" content="noindex, follow" />\n', { html: true });
        }
      })
      .transform(response);

    const newHeaders = new Headers(transformedResponse.headers);
    newHeaders.set('Content-Type', 'text/html; charset=utf-8');
    newHeaders.set('Cache-Control', 'public, max-age=60, s-maxage=60');

    return new Response(transformedResponse.body, {
      status: 200,
      headers: newHeaders
    });
  }

  // Arte ENCONTRADA: Injetar metadados específicos da arte
  const artName = art.name || 'Arte Exclusiva';
  const pageTitle = `${artName} | Quitanda de Artes - Crazy Art`;
  const rawDesc = art.description || `Baixe a arte ${artName} em vetor, pronta para serigrafia, DTF e sublimação. Arquivo digital para estamparia na Quitanda da Crazy Art.`;
  const pageDesc = rawDesc.length > 160 ? rawDesc.slice(0, 157) + '...' : rawDesc;
  const artSlug = art.slug || generateSlug(art.name);
  const canonicalUrl = `https://crazyart.com.br/quitanda_de_art/${artSlug}`;
  const imageUrl = resolveImageUrl(art.image_url || art.imageUrl, env.R2_PUBLIC_URL);
  const altText = art.alt_text || `Arte ${artName} vetor para estamparia`;

  let hasReplacedCanonical = false;

  const transformedResponse = new HTMLRewriter()
    .on('title', {
      element(el: any) {
        el.setInnerContent(pageTitle);
      }
    })
    .on('meta[name="description"]', {
      element(el: any) {
        el.setAttribute('content', pageDesc);
      }
    })
    .on('meta[property="og:title"]', {
      element(el: any) {
        el.setAttribute('content', pageTitle);
      }
    })
    .on('meta[property="og:description"]', {
      element(el: any) {
        el.setAttribute('content', pageDesc);
      }
    })
    .on('meta[property="og:image"]', {
      element(el: any) {
        el.setAttribute('content', imageUrl);
      }
    })
    .on('meta[property="og:url"]', {
      element(el: any) {
        el.setAttribute('content', canonicalUrl);
      }
    })
    .on('meta[property="twitter:title"], meta[name="twitter:title"]', {
      element(el: any) {
        el.setAttribute('content', pageTitle);
      }
    })
    .on('meta[property="twitter:description"], meta[name="twitter:description"]', {
      element(el: any) {
        el.setAttribute('content', pageDesc);
      }
    })
    .on('meta[property="twitter:image"], meta[name="twitter:image"]', {
      element(el: any) {
        el.setAttribute('content', imageUrl);
      }
    })
    .on('meta[property="twitter:url"], meta[name="twitter:url"]', {
      element(el: any) {
        el.setAttribute('content', canonicalUrl);
      }
    })
    .on('link[rel="canonical"]', {
      element(el: any) {
        el.setAttribute('href', canonicalUrl);
        hasReplacedCanonical = true;
      }
    })
    .on('head', {
      element(el: any) {
        el.append(`<meta property="og:image:alt" content="${escapeHtml(altText)}" />\n`, { html: true });
        
        // Structured data Schema.org (Product)
        const productJsonLd = {
          "@context": "https://schema.org",
          "@type": "Product",
          "name": artName,
          "description": pageDesc,
          "image": imageUrl,
          "offers": {
            "@type": "Offer",
            "priceCurrency": "BRL",
            "price": Number(art.price || 0).toFixed(2),
            "availability": "https://schema.org/InStock",
            "url": canonicalUrl
          }
        };
        el.append(`<script type="application/ld+json">${JSON.stringify(productJsonLd)}</script>\n`, { html: true });

        el.onEndTag((endTag: any) => {
          if (!hasReplacedCanonical) {
            endTag.before(`<link rel="canonical" href="${escapeHtml(canonicalUrl)}" />\n`, { html: true });
          }
        });
      }
    })
    .transform(response);

  // Retorna com status 200 garantido e cabeçalhos corretos
  const newHeaders = new Headers(transformedResponse.headers);
  newHeaders.set('Content-Type', 'text/html; charset=utf-8');
  newHeaders.set('Cache-Control', 'public, max-age=60, s-maxage=60');

  return new Response(transformedResponse.body, {
    status: 200,
    headers: newHeaders
  });
};
