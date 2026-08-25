const CACHE_VERSION = '__CACHE_VERSION__';
const CACHE_NAME = `app-shell-${CACHE_VERSION}`;
const RUNTIME_CACHE = `runtime-${CACHE_VERSION}`;

self.addEventListener('install', (e) => self.skipWaiting());

self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(
                keys.filter((k) => k !== CACHE_NAME && k !== RUNTIME_CACHE)
                    .map((k) => caches.delete(k))
            )
        )
    );
    return self.clients.claim();
});

self.addEventListener('fetch', (e) => {
    if (e.request.method !== 'GET') return;

    const url = new URL(e.request.url);
    if (!['http:', 'https:'].includes(url.protocol)) return;

    // Never cache API calls or SSE streams
    if (url.pathname.startsWith('/api/') ||
        url.pathname.includes('/live/stream') ||
        url.hostname.includes('execute-api') ||
        url.hostname.includes('server.emotiox.org')) {
        return;
    }

    // CRITICAL FIX: Verificar que el origen del cliente coincida con el origen del request
    // Si el request es a portal.emotiox.org pero el cliente está en localhost, NO interceptar
    const isLocalhost = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
    const isProductionDomain = url.hostname.includes('emotiox.org') || url.hostname.includes('useremotion.com') || url.hostname.includes('emotio.cx');

    // Si el request es a producción, NO interceptar
    if (isProductionDomain) {
        return;
    }

    // Si el request es a localhost, verificar que el cliente también esté en localhost
    if (isLocalhost && e.clientId) {
        e.respondWith(
            self.clients.get(e.clientId).then((client) => {
                if (client) {
                    try {
                        const clientUrl = new URL(client.url);
                        const clientIsLocalhost = clientUrl.hostname === 'localhost' || clientUrl.hostname === '127.0.0.1';
                        const clientIsProduction = clientUrl.hostname.includes('emotiox.org') || clientUrl.hostname.includes('useremotion.com');

                        // Si el cliente está en producción pero el request es a localhost, NO interceptar
                        if (clientIsProduction && isLocalhost) {
                            return fetch(e.request);
                        }

                        // Verificación adicional: orígenes deben coincidir
                        if (clientUrl.origin !== url.origin) {
                            return fetch(e.request);
                        }
                    } catch {
                        // Si falla el parsing, continuar con interceptación (fallback)
                    }
                }

                // Orígenes coinciden - proceder con interceptación normal
                return handleRequest(e, url);
            }).catch(() => {
                // Si no podemos obtener el cliente, proceder con interceptación (fallback)
                return handleRequest(e, url);
            })
        );
        return;
    }

    // Sin clientId pero request es a localhost - proceder con interceptación
    if (isLocalhost) {
        e.respondWith(handleRequest(e, url));
        return;
    }

    // Para cualquier otro caso, no interceptar
    return;
});

function handleRequest(e, url) {
    const isNavigationRequest = e.request.mode === 'navigate';
    const hasFileExtension = url.pathname.includes('.') && !url.pathname.endsWith('.html');

    if (isNavigationRequest || (!hasFileExtension && !url.pathname.startsWith('/api/'))) {
        return fetch(e.request)
            .then((res) => {
                // Cachear HTML exitoso para offline
                if (res.ok) {
                    const resClone = res.clone();
                    caches.open(CACHE_NAME).then((cache) =>
                        cache.put(e.request, resClone)
                    );
                }
                return res;
            })
            .catch(() => {
                // Fallback: buscar en cache o index.html
                return caches.match(e.request).then((cached) => {
                    return cached || caches.match(new URL('/index.html', url.origin).toString());
                });
            });
    }

    // Assets → cache first + actualizar en background
    return caches.match(e.request).then((cached) => {
        if (cached) {
            // Actualizar cache en background
            fetch(e.request).then((res) => {
                if (res.ok) {
                    const resClone = res.clone();
                    caches.open(RUNTIME_CACHE).then((cache) =>
                        cache.put(e.request, resClone)
                    );
                }
            }).catch(() => {
                // Ignorar errores de actualización en background
            });
            return cached;
        }

        // No hay cache - obtener de la red
        return fetch(e.request).then((res) => {
            if (res.ok) {
                const resClone = res.clone();
                caches.open(RUNTIME_CACHE).then((cache) =>
                    cache.put(e.request, resClone)
                );
            }
            return res;
        });
    });
}
