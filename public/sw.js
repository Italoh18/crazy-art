// Service Worker for PWA and Push Notifications
const CACHE_NAME = 'crazy-art-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Simple fetch handler to satisfy PWA criteria
  event.respondWith(fetch(event.request));
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
    vibrate: [100, 50, 100],
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
