// Service Worker for PWA and Push Notifications - v1.0.3
const CACHE_NAME = 'crazy-art-v1.0.3';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Apagando cache antigo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Apenas intercepta requisições locais do tipo GET para cumprir os requisitos de PWA
  if (event.request.method !== 'GET') return;
  if (!event.request.url.startsWith(self.location.origin)) return;
  
  // Evita interceptar chamadas de API para evitar conflitos de autenticação/dados
  if (event.request.url.includes('/api/')) return;

  // Permite que o navegador trate requisições de navegação nativamente.
  // Isso previne que reloads (Ctrl+R) deem tela branca em sub-rotas SPA.
  if (event.request.mode === 'navigate') {
    return;
  }

  event.respondWith(
    fetch(event.request).catch((err) => {
      console.warn('[SW] Falha ao buscar recurso:', event.request.url, err);
    })
  );
});

// Push Notification Handling
self.addEventListener('push', (event) => {
  console.log('[SW] Push recebido:', event);
  
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
      console.log('[SW] Payload JSON:', data);
    } catch (e) {
      console.warn('[SW] Payload não é JSON, usando texto puro:', event.data.text());
      data = { title: 'Crazy Art', body: event.data.text() };
    }
  }

  const options = {
    body: data.body || 'Nova notificação da Crazy Art',
    icon: data.icon || '/icons/icon-192.svg',
    badge: data.badge || '/icons/icon-192.svg',
    image: data.image || null, // Permite exibir uma imagem maior se enviada
    vibrate: [200, 100, 200],
    dir: 'ltr',
    lang: 'pt-BR',
    data: {
      url: data.url || '/'
    },
    tag: data.tag || 'crazy-art-notification', // Evita duplicatas
    actions: data.actions || []
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'Crazy Art', options)
      .then(() => console.log('[SW] Notificação exibida com sucesso'))
      .catch(err => console.error('[SW] Erro ao exibir notificação:', err))
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
