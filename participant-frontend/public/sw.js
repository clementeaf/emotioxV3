const CACHE_NAME = 'emotiox-participant-cache-v2';
const urlsToCache = [
  '/',
  '/index.html',
  // Add other critical assets here
];

self.addEventListener('install', (event) => {
  // Skip waiting to activate immediately
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', (event) => {
  // Only cache HTTP/HTTPS requests, skip chrome-extension:// and other schemes
  if (!event.request.url.startsWith('http')) {
    return;
  }

  // For JS, CSS, and other assets, always fetch from network first (stale-while-revalidate)
  // This ensures we get the latest code
  const url = new URL(event.request.url);
  const isAsset = url.pathname.match(/\.(js|css|mjs|json|woff|woff2|ttf|eot|otf|svg|png|jpg|jpeg|gif|webp|ico)$/);
  
  if (isAsset) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Clone the response because it can only be consumed once
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
          return response;
        })
        .catch(() => {
          // If fetch fails, try cache as fallback
          return caches.match(event.request);
        })
    );
  } else {
    // For HTML and other resources, try cache first, then network
    event.respondWith(
      caches.match(event.request)
        .then((response) => {
          if (response) {
            return response;
          }
          return fetch(event.request).then((response) => {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
            return response;
          });
        })
        .catch(() => {
          // If fetch fails, return a fallback if available
          return caches.match('/index.html');
        })
    );
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

