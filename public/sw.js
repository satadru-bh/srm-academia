const CACHE_NAME = 'srm-academia-v9';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './styles.css?v=9',
  './app.js?v=9',
  './glass-bg.png?v=9',
  './glass_bg_light.png?v=9',
  './favicon.png',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png',
  './logo_light.png',
  './logo_dark.png',
  './qr.png',
  './manifest.json'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE).catch(() => {});
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);

  // Never cache API requests
  if (url.pathname.startsWith('/api')) return;

  // NETWORK-FIRST STRATEGY FOR ALL CORE ASSETS AND IMAGES
  // Guarantees background images & layout changes reload fresh immediately!
  const isNetworkFirst = event.request.mode === 'navigate' ||
                         url.pathname.endsWith('.html') ||
                         url.pathname.endsWith('.css') ||
                         url.pathname.endsWith('.js') ||
                         url.pathname.includes('glass-bg') ||
                         url.pathname.includes('glass_bg_light') ||
                         url.pathname === '/' ||
                         url.pathname === '';

  if (isNetworkFirst) {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseToCache));
          }
          return networkResponse;
        })
        .catch(() => {
          return caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) return cachedResponse;
            if (event.request.headers.get('accept')?.includes('text/html')) {
              return caches.match('./index.html') || caches.match('index.html');
            }
          });
        })
    );
    return;
  }

  // Cache-First fallback for static icons
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseToCache));
        }
        return networkResponse;
      });
    })
  );
});
