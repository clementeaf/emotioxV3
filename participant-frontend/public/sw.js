// Dynamic cache version based on timestamp to ensure fresh deploys
const CACHE_VERSION = '__CACHE_VERSION__'; // Will be replaced during build
const CACHE_NAME = `emotiox-participant-cache-${CACHE_VERSION}`;

self.addEventListener('install', (event) => {
  // Skip waiting to activate immediately
  self.skipWaiting();
  console.log('Service Worker installing with cache version:', CACHE_VERSION);
});

self.addEventListener('fetch', (event) => {
  // Only cache HTTP/HTTPS requests, skip chrome-extension:// and other schemes
  if (!event.request.url.startsWith('http')) {
    return;
  }

  const url = new URL(event.request.url);
  const isAsset = url.pathname.match(/\.(js|css|mjs|json|woff|woff2|ttf|eot|otf|svg|png|jpg|jpeg|gif|webp|ico)$/);
  const isHTML = url.pathname.endsWith('.html') || url.pathname === '/';

  // Network-first strategy for HTML to always get latest version
  if (isHTML) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Cache the latest HTML for offline fallback
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
          return response;
        })
        .catch(() => {
          // If fetch fails (offline), use cached version
          return caches.match(event.request).then((cachedResponse) => {
            return cachedResponse || caches.match('/index.html');
          });
        })
    );
  }
  // Network-first with cache fallback for assets (JS, CSS, images, fonts)
  else if (isAsset) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Only cache successful responses
          if (response.status === 200) {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return response;
        })
        .catch(() => {
          // If fetch fails, try cache as fallback
          return caches.match(event.request);
        })
    );
  }
  // For other requests (API calls, etc.), just fetch without caching
  else {
    event.respondWith(fetch(event.request));
  }
});

self.addEventListener('activate', (event) => {
  // Take control of all pages immediately
  event.waitUntil(
    Promise.all([
      // Delete old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log('Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // Claim all clients to ensure the new service worker takes control
      self.clients.claim()
    ])
  );
});

