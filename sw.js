
const CACHE_NAME = 'crazy-art-cache-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Estratégia Network-first: tenta a rede, se falhar (offline), não faz nada especial
  // mas o evento fetch é obrigatório para que o navegador considere o app instalável.
  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request);
    })
  );
});
