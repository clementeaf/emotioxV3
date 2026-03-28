import { useRef, useState, useCallback, useEffect, useLayoutEffect } from 'react';

/**
 * Starts and stops the user-facing webcam stream on a video element.
 * If `<video>` mounts after `start()` (e.g. conditional render), `streamRef` is synced on the next layout pass.
 * Pass `layoutSyncKey` (e.g. route phase) so attach retries when the element becomes visible.
 */
export function useWebcam(
    videoRef: React.RefObject<HTMLVideoElement | null>,
    layoutSyncKey?: unknown,
): {
    isActive: boolean;
    error: string | null;
    start: () => Promise<void>;
    stop: () => void;
} {
    const streamRef = useRef<MediaStream | null>(null);
    const [isActive, setIsActive] = useState(false);
    const [error, setError] = useState<string | null>(null);

    /**
     * Binds `streamRef` to the current video element when both exist (handles late-mounted `<video>`).
     */
    const attachStreamToVideo = useCallback((): void => {
        const video = videoRef.current;
        const stream = streamRef.current;
        if (!video || !stream) return;
        if (video.srcObject !== stream) {
            video.srcObject = stream;
        }
        void video.play().catch(() => {
            /* ignore play interruption; layout effect retries after visibility changes */
        });
    }, [videoRef]);

    useLayoutEffect(() => {
        if (!streamRef.current) return;
        attachStreamToVideo();
    }, [attachStreamToVideo, layoutSyncKey]);

    const start = useCallback(async () => {
        try {
            setError(null);
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
            });
            streamRef.current = stream;
            attachStreamToVideo();
            setIsActive(true);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to access camera';
            setError(message);
            setIsActive(false);
        }
    }, [attachStreamToVideo]);

    const stop = useCallback(() => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(t => t.stop());
            streamRef.current = null;
        }
        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }
        setIsActive(false);
    }, [videoRef]);

    useEffect(() => {
        return () => {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(t => t.stop());
            }
        };
    }, []);

    return { isActive, error, start, stop };
}
