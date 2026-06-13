/**
 * Extracts a single representative frame from a video at its midpoint.
 * Returns a blob URL suitable for use as an image source.
 *
 * Uses the <video> element with preload="metadata" + Range requests instead of
 * fetching the entire file as a blob — works with large videos without OOM.
 */
export async function extractVideoThumbnail(videoUrl: string): Promise<string> {
    return new Promise<string>((resolve, reject) => {
        const video = document.createElement('video');
        video.muted = true;
        video.playsInline = true;
        video.preload = 'metadata';
        video.crossOrigin = 'anonymous';

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            reject(new Error('Canvas 2D context not available'));
            return;
        }

        const timeoutRef: { current: ReturnType<typeof setTimeout> | undefined } = { current: undefined };

        const cleanup = (): void => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            video.removeAttribute('src');
            video.load(); // release network resources
        };

        const onError = (): void => {
            cleanup();
            reject(new Error('Failed to load video for thumbnail'));
        };

        const onSeeked = (): void => {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            ctx.drawImage(video, 0, 0);
            canvas.toBlob(
                (blob) => {
                    cleanup();
                    if (!blob) {
                        reject(new Error('toBlob returned null'));
                        return;
                    }
                    resolve(URL.createObjectURL(blob));
                },
                'image/png',
            );
        };

        const onMetadata = (): void => {
            video.currentTime = Math.min(video.duration / 2, 5);
        };

        // Timeout safety — reject if metadata never loads (30s)
        timeoutRef.current = setTimeout(() => {
            cleanup();
            reject(new Error('Video metadata load timed out'));
        }, 30_000);

        video.addEventListener('loadedmetadata', onMetadata, { once: true });
        video.addEventListener('seeked', onSeeked, { once: true });
        video.addEventListener('error', onError, { once: true });
        video.src = videoUrl;
    });
}
