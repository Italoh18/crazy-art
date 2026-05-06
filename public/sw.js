// Minimal Service Worker for PWA installability
// This worker does not handle notifications or push messages to avoid annoying prompts.

const CACHE_NAME = 'crazy-art-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Simple fetch handler to satisfy PWA criteria
  // For a SPA, we usually let Vite handle the assets, 
  // but we need this event listener to be present.
  event.respondWith(fetch(event.request));
});
