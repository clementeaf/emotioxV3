/** Shared decode cache — avoids reloading the same stimulus across tabs. */
const loadedImageCache = new Map<string, HTMLImageElement>();
const pendingImageLoads = new Map<string, Promise<HTMLImageElement>>();

/**
 * Loads an image URL once and reuses it for every consumer (HeatmapRenderer, tabs).
 * @param url - Stimulus image URL
 * @returns Loaded HTMLImageElement
 */
export function loadCachedStimulusImage(url: string): Promise<HTMLImageElement> {
    const cached = loadedImageCache.get(url);
    if (cached?.complete && cached.naturalWidth > 0) {
        return Promise.resolve(cached);
    }

    const pending = pendingImageLoads.get(url);
    if (pending) return pending;

    const promise = new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            loadedImageCache.set(url, img);
            pendingImageLoads.delete(url);
            resolve(img);
        };
        img.onerror = () => {
            pendingImageLoads.delete(url);
            reject(new Error(`Failed to load image: ${url}`));
        };
        img.src = url;
    });

    pendingImageLoads.set(url, promise);
    return promise;
}
