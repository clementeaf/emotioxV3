/**
 * Caché global para URLs presigned de S3
 * Evita múltiples peticiones al backend para la misma imagen
 */

interface CachedUrl {
    url: string;
    expiresAt: number;
    mediaId?: string;
}

const cache = new Map<string, CachedUrl>();
const pendingRequests = new Map<string, Promise<CachedUrl>>();

/**
 * Obtiene una URL presigned desde caché o ejecutando un fetcher, deduplicando llamadas concurrentes.
 * @param s3Key - Key del objeto en S3
 * @param fetcher - Función que obtiene la URL presigned desde el backend
 * @returns Objeto con URL, expiración y opcionalmente mediaId
 */
export async function getPresignedUrl(
    s3Key: string,
    fetcher: () => Promise<{ url: string; expires_in: number; id?: string }>
): Promise<CachedUrl> {
    // Verificar si hay una petición en curso para este s3Key
    const pending = pendingRequests.get(s3Key);
    if (pending) {
        return pending;
    }

    // Verificar caché
    const cached = cache.get(s3Key);
    const now = Date.now();
    const refreshBuffer = 5 * 60 * 1000; // 5 minutos

    if (cached && cached.expiresAt > now + refreshBuffer) {
        return cached;
    }

    // Crear promesa de carga y guardarla para evitar duplicados
    const promise = (async () => {
        try {
            const result = await fetcher();
            const expiresIn = result.expires_in || 3600;
            const expiresAt = Date.now() + expiresIn * 1000;

            const cachedUrl: CachedUrl = {
                url: result.url,
                expiresAt,
                mediaId: result.id,
            };

            cache.set(s3Key, cachedUrl);
            return cachedUrl;
        } finally {
            pendingRequests.delete(s3Key);
        }
    })();

    pendingRequests.set(s3Key, promise);
    return promise;
}

/**
 * Limpia del caché las URLs expiradas.
 * @returns void
 */
export function cleanExpiredUrls(): void {
    const now = Date.now();
    for (const [key, value] of cache.entries()) {
        if (value.expiresAt <= now) {
            cache.delete(key);
        }
    }
}

// Limpiar cada 5 minutos
setInterval(cleanExpiredUrls, 5 * 60 * 1000);
