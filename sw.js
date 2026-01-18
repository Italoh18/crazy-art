self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener("fetch", (event) => {
  // Apenas permite instalação do PWA
  // Não utiliza cache para evitar telas pretas ou dados obsoletos
  if (event.request.mode === "navigate") {
    event.respondWith(fetch(event.request));
  }
});