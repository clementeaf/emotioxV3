// Service Worker para caché offline y mejor rendimiento
// Dynamic cache version based on timestamp to ensure fresh deploys
const CACHE_VERSION = '__CACHE_VERSION__'; // Will be replaced during build
const CACHE_NAME = `emotiox-research-cache-${CACHE_VERSION}`;
const RUNTIME_CACHE = `emotiox-research-runtime-${CACHE_VERSION}`;

// Instalar Service Worker
self.addEventListener('install', (event) => {
    // Skip waiting to activate immediately
    self.skipWaiting();
    console.log('Service Worker installing with cache version:', CACHE_VERSION);
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

// Estrategia: Network First optimizada con cache inteligente
self.addEventListener('fetch', (event) => {
    // Only handle GET requests
    if (event.request.method !== 'GET') {
        return;
    }

    // Validate request scheme
    try {
        const requestUrl = new URL(event.request.url);
        if (requestUrl.protocol !== 'http:' && requestUrl.protocol !== 'https:') {
            return;
        }
    } catch (error) {
        return;
    }

    // Don't cache API requests - let them pass through
    if (event.request.url.includes('/api/')) {
        event.respondWith(fetch(event.request));
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
                    if (response.status === 200) {
                        const responseToCache = response.clone();
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(event.request, responseToCache).catch((error) => {
                                console.debug('Cache put failed (non-critical):', error);
                            });
                        });
                    }
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
    // Network-first with cache fallback for assets
    else if (isAsset) {
        event.respondWith(
            fetch(event.request)
                .then((response) => {
                    // Only cache successful responses
                    if (response.status === 200) {
                        const responseToCache = response.clone();
                        caches.open(RUNTIME_CACHE).then((cache) => {
                            cache.put(event.request, responseToCache).catch((error) => {
                                console.debug('Cache put failed (non-critical):', error);
                            });
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
    // For other requests, just fetch without caching
    else {
        event.respondWith(fetch(event.request));
    }
});

