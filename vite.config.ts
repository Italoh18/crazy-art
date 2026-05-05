
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  // Carrega variáveis de ambiente baseadas no modo atual
  const env = loadEnv(mode, (process as any).cwd(), '');

  return {
    plugins: [
      react(),
      VitePWA({
        strategies: 'injectManifest',
        srcDir: 'src',
        filename: 'sw.ts',
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg', 'icons/*'],
        manifest: {
          name: 'Crazy Art | Comunicação Visual',
          short_name: 'Crazy Art',
          description: 'Soluções profissionais de design para estamparias e freelancers',
          theme_color: '#09090b',
          background_color: '#09090b',
          display: 'standalone',
          orientation: 'portrait',
          start_url: '/',
          icons: [
            {
              src: '/icons/icon-192.svg',
              sizes: '192x192',
              type: 'image/svg+xml',
              purpose: 'any maskable'
            },
            {
              src: '/icons/icon-512.svg',
              sizes: '512x512',
              type: 'image/svg+xml',
              purpose: 'any maskable'
            }
          ],
          shortcuts: [
            {
              name: 'Novo Pedido',
              url: '/montagem-molde',
              icons: [{ src: '/icons/icon-192.svg', sizes: '192x192' }]
            },
            {
              name: 'Meus Pedidos',
              url: '/client-orders',
              icons: [{ src: '/icons/icon-192.svg', sizes: '192x192' }]
            }
          ]
        },
        injectManifest: {
          maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5MB
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        },
        workbox: {
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365 // <== 365 dias
                },
                cacheableResponse: {
                  statuses: [0, 200]
                }
              }
            },
            {
              urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'gstatic-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365 // <== 365 dias
                },
                cacheableResponse: {
                  statuses: [0, 200]
                }
              }
            },
            {
               urlPattern: /^https:\/\/api\.*/i,
               handler: 'NetworkFirst',
               options: {
                  cacheName: 'api-cache',
                  expiration: {
                     maxEntries: 100,
                     maxAgeSeconds: 60 * 60 * 24 // 24 horas
                  },
                  networkTimeoutSeconds: 10,
                  cacheableResponse: {
                     statuses: [0, 200]
                  }
               }
            }
          ]
        }
      })
    ],
    resolve: {
      dedupe: ['react', 'react-dom'],
    },
    base: '/',
    define: {
      // Outras definições se necessário
    },
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      rollupOptions: {
        input: {
          main: 'index.html',
        },
      },
    },
    server: {
      // Proxy removido para compatibilidade com Cloudflare Pages
    }
  };
});
