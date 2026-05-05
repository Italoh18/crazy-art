/// <reference lib="webworker" />

import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { clientsClaim } from 'workbox-core';

declare const self: ServiceWorkerGlobalScope;

cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

self.skipWaiting();
clientsClaim();

// Handle Push Notifications
self.addEventListener('push', (event: any) => {
  console.log('[SW] Push Event received:', event);
  
  let data: any = {
    title: 'Crazy Art',
    message: 'Você tem uma nova atualização!',
    icon: '/icons/icon-192.svg',
    url: '/'
  };

  if (event.data) {
    try {
      data = { ...data, ...event.data.json() };
      console.log('[SW] Push Data JSON:', data);
    } catch (e) {
      data.message = event.data.text();
      console.log('[SW] Push Data Text:', data.message);
    }
  }

  const options: NotificationOptions = {
    body: data.message,
    icon: data.icon,
    badge: '/icons/icon-192.svg',
    tag: 'crazy-art-notification', // Evita duplicados
    // @ts-ignore
    renotify: true,
    data: {
      url: data.url
    },
    // @ts-ignore
    vibrate: [100, 50, 100],
    actions: [
      { action: 'open', title: 'Ver Agora' },
      { action: 'close', title: 'Fechar' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
      .then(() => {
        // Atualiza o badge se suportado
        if ('setAppBadge' in navigator) {
          (navigator as any).setAppBadge().catch(() => {});
        }
      })
  );
});

// Handle Notification Click
self.addEventListener('notificationclick', (event: any) => {
  event.notification.close();

  if (event.action === 'close') return;

  const urlToOpen = event.notification.data.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Se já houver uma aba aberta com a mesma URL, foca nela
      const clients = windowClients as readonly any[];
      for (const client of clients) {
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      // Caso contrário, abre uma nova aba
      if (self.clients.openWindow) {
        return self.clients.openWindow(urlToOpen);
      }
    })
  );
});
