// Self-destructing Service Worker: actively removes stale caches and unregisters itself
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => Promise.all(cacheNames.map((name) => caches.delete(name))))
      .then(() => self.registration.unregister())
      .then(() => self.clients.claim())
      .then(() => {
        return self.clients.matchAll({ type: 'window' }).then((clients) => {
          for (const client of clients) {
            client.navigate(client.url);
          }
        });
      })
      .catch(() => {})
  );
});

self.addEventListener('fetch', (event) => {
  // Always fetch directly from network without caching
  event.respondWith(fetch(event.request));
});
