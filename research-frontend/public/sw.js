// Service Worker para caché offline y mejor rendimiento
const CACHE_NAME = 'emotiox-research-v1';
const RUNTIME_CACHE = 'emotiox-runtime-v1';

// Assets estáticos para cachear
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/manifest.json',
];

// Instalar Service Worker
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(STATIC_ASSETS);
        })
    );
    self.skipWaiting();
});

// Activar Service Worker
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames
                    .filter((name) => name !== CACHE_NAME && name !== RUNTIME_CACHE)
                    .map((name) => caches.delete(name))
            );
        })
    );
    return self.clients.claim();
});

// Estrategia: Network First, luego Cache
self.addEventListener('fetch', (event) => {
    // Ignorar requests que no son GET
    if (event.request.method !== 'GET') {
        return;
    }

    // Ignorar requests a APIs externas (dejar que pasen directamente)
    if (event.request.url.includes('/api/') || event.request.url.startsWith('http')) {
        return;
    }

    event.respondWith(
        fetch(event.request)
            .then((response) => {
                // Clonar la respuesta
                const responseToCache = response.clone();

                // Cachear assets estáticos
                if (event.request.destination === 'script' || 
                    event.request.destination === 'style' ||
                    event.request.destination === 'image') {
                    caches.open(RUNTIME_CACHE).then((cache) => {
                        cache.put(event.request, responseToCache);
                    });
                }

                return response;
            })
            .catch(() => {
                // Si falla la red, intentar desde caché
                return caches.match(event.request).then((cachedResponse) => {
                    if (cachedResponse) {
                        return cachedResponse;
                    }
                    // Si no hay caché, devolver página offline
                    if (event.request.destination === 'document') {
                        return caches.match('/index.html');
                    }
                });
            })
    );
});

