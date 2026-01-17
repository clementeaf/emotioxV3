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

    const requestUrl = new URL(event.request.url);
    const requestOrigin = requestUrl.origin;

    // CRITICAL FIX: Skip external API domains - these should never be intercepted
    const isExternalAPI = requestOrigin.includes('execute-api') || 
                         requestOrigin.includes('server.emotiox.org') ||
                         requestOrigin.includes('api.');
    
    if (isExternalAPI) {
        // Let external API requests pass through without interception
        return;
    }

    // CRITICAL FIX: Verify this is a same-origin request
    // The service worker must only intercept requests from the same origin as the page
    // Problem: If SW was registered from production (portal.emotiox.org) but page is localhost,
    // we must not intercept localhost requests
    // Solution: Check client origin and only intercept if it matches request origin
    if (event.clientId) {
        // Get client origin to verify it matches request origin
        const clientPromise = self.clients.get(event.clientId);
        
        // Use event.respondWith with a promise that checks the client origin
        // If origins don't match, we won't intercept (let the request pass through)
        event.respondWith(
            clientPromise.then((client) => {
                if (client) {
                    try {
                        const clientUrl = new URL(client.url);
                        const clientOrigin = clientUrl.origin;
                        
                        // If client origin doesn't match request origin, don't intercept
                        // This prevents SW from production intercepting localhost requests
                        if (clientOrigin !== requestOrigin) {
                            // Return the original fetch - don't intercept
                            return fetch(event.request);
                        }
                    } catch {
                        // If URL parsing fails, continue with interception (fallback)
                    }
                }
                
                // Origins match (or no client) - proceed with normal interception logic
                return handleRequest(event, requestUrl, requestOrigin);
            }).catch(() => {
                // If we can't get client, proceed with interception (fallback)
                return handleRequest(event, requestUrl, requestOrigin);
            })
        );
        return; // Exit early since we're handling the response above
    }
    
    // No clientId (navigation request) - proceed with normal interception
    handleRequest(event, requestUrl, requestOrigin);
});

/**
 * Handles the actual request interception logic
 * @param {FetchEvent} event - The fetch event
 * @param {URL} requestUrl - Parsed request URL
 * @param {string} requestOrigin - Request origin
 */
function handleRequest(event, requestUrl, requestOrigin) {
    // Don't cache API requests - let them pass through
    if (event.request.url.includes('/api/')) {
        return fetch(event.request);
    }

    const url = new URL(event.request.url);
    const isAsset = url.pathname.match(/\.(js|css|mjs|json|woff|woff2|ttf|eot|otf|svg|png|jpg|jpeg|gif|webp|ico)$/);
    const isHTML = url.pathname.endsWith('.html') || url.pathname === '/';

    // Network-first strategy for HTML to always get latest version
    if (isHTML) {
        return fetch(event.request)
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
                    if (cachedResponse) {
                        return cachedResponse;
                    }
                    // Use the request's origin to construct the index.html URL correctly
                    const indexUrl = new URL('/index.html', requestOrigin);
                    return caches.match(indexUrl.toString());
                });
            });
    }
    // Network-first with cache fallback for assets
    else if (isAsset) {
        return fetch(event.request)
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
            });
    }
    // For other requests, just fetch without caching
    else {
        return fetch(event.request);
    }
}
