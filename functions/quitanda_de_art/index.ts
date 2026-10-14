import { Env } from '../api/_auth';

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
  next: () => Promise<Response>;
}) => {
  const { request, env, next } = context;

  const pageTitle = 'Quitanda de Artes | Vetores & Estampas para Sublimação - Crazy Art';
  const pageDesc = 'Explore o acervo de artes prontas, vetores em Corel Draw, matrizes de bordado e estampas exclusivas para download imediato na Quitanda da Crazy Art.';
  const canonicalUrl = 'https://crazyart.com.br/quitanda_de_art';
  const imageUrl = 'https://crazyart.com.br/icons/icon-512.svg';

  // Obter o HTML base da aplicação (SPA fallback)
  let response = await next();
  const contentType = response.headers.get('content-type') || '';
  if (!response.ok || !contentType.includes('text/html')) {
    const rootUrl = new URL('/', request.url);
    response = env.ASSETS ? await env.ASSETS.fetch(rootUrl) : await fetch(rootUrl);
  }

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
        // Schema.org CollectionPage / WebPage
        const collectionJsonLd = {
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          "name": pageTitle,
          "description": pageDesc,
          "url": canonicalUrl,
          "provider": {
            "@type": "Organization",
            "name": "Crazy Art",
            "url": "https://crazyart.com.br"
          }
        };
        el.append(`<script type="application/ld+json">${JSON.stringify(collectionJsonLd)}</script>\n`, { html: true });

        el.onEndTag((endTag: any) => {
          if (!hasReplacedCanonical) {
            endTag.before(`<link rel="canonical" href="${escapeHtml(canonicalUrl)}" />\n`, { html: true });
          }
        });
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
};
