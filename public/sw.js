// Service Worker for PWA and Push Notifications - v1.0.3
const CACHE_NAME = 'crazy-art-v1.1.0';

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
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/')) return;

  // Páginas (HTML): busca da internet primeiro; se estiver sem internet, usa a cópia salva
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then((c) => c.put('/', copy));
        return res;
      }).catch(() => caches.match('/').then((r) => r || Response.error()))
    );
    return;
  }

  // Arquivos do build do Vite (/assets/ com hash no nome): nunca mudam, então usa o cache primeiro
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.match(req).then((cached) => cached || fetch(req).then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(req, copy));
        }
        return res;
      }))
    );
    return;
  }

  // Imagens, ícones e fontes do próprio site: mostra o salvo na hora e atualiza por trás
  if (['image', 'font', 'style'].includes(req.destination)) {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) => cache.match(req).then((cached) => {
        const network = fetch(req).then((res) => {
          if (res.ok) cache.put(req, res.clone());
          return res;
        }).catch(() => cached);
        return cached || network;
      }))
    );
    return;
  }
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
