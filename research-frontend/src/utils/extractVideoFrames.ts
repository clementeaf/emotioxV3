/**
 * Client-side video frame extraction.
 * Uses <video> + <canvas> to extract keyframes at regular intervals.
 * Returns an array of PNG blobs with their timestamps.
 *
 * Safari fix: tries crossOrigin='anonymous' first (same-origin, no re-download).
 * Falls back to blob fetch with AbortController timeout if canvas is tainted.
 */

export interface ExtractedFrame {
  timestamp: number; // seconds
  blob: Blob;
}

/**
 * Downloads a video as a local blob URL.
 * Uses AbortController with timeout to prevent Safari from hanging on cancelled fetches.
 */
const fetchAsBlob = async (url: string): Promise<string> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60_000);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error(`Failed to fetch video: ${response.status}`);
    const blob = await response.blob();
    return URL.createObjectURL(blob);
  } finally {
    clearTimeout(timeoutId);
  }
};

/**
 * Extracts frames from a video URL at a given interval.
 * @param videoUrl - URL of the video (blob URL or server URL)
 * @param intervalSeconds - Time between frames (default 2s)
 * @param maxFrames - Maximum number of frames (default 15)
 * @param onProgress - Optional progress callback (0-1)
 */
export const extractVideoFrames = async (
  videoUrl: string,
  intervalSeconds = 2,
  maxFrames = 15,
  onProgress?: (progress: number) => void,
): Promise<ExtractedFrame[]> => {
  // For blob URLs, use directly. For server URLs, try direct load first
  // (crossOrigin='anonymous' avoids re-download). If tainted, fallback to blob fetch.
  let localUrl = videoUrl;
  let usedBlob = false;

  if (!videoUrl.startsWith('blob:')) {
    // Try direct first — Safari cancels fetch() if <video> already loaded same URL
    try {
      const testResult = await tryDirectExtraction(videoUrl, intervalSeconds, maxFrames, onProgress);
      if (testResult) return testResult;
    } catch {
      // Direct failed (tainted canvas or load error) — fallback to blob fetch
    }

    // Fallback: download as blob
    localUrl = await fetchAsBlob(videoUrl);
    usedBlob = true;
  }

  try {
    return await extractFromUrl(localUrl, intervalSeconds, maxFrames, onProgress);
  } finally {
    if (usedBlob) URL.revokeObjectURL(localUrl);
  }
};

/**
 * Try extracting frames directly from URL with crossOrigin='anonymous'.
 * Returns null if canvas is tainted (SecurityError on drawImage/toBlob).
 */
const tryDirectExtraction = (
  videoUrl: string,
  intervalSeconds: number,
  maxFrames: number,
  onProgress?: (progress: number) => void,
): Promise<ExtractedFrame[] | null> => {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    video.preload = 'auto';
    video.crossOrigin = 'anonymous';

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) { resolve(null); return; }

    const timeout = setTimeout(() => {
      video.src = '';
      resolve(null);
    }, 15_000);

    video.addEventListener('loadedmetadata', () => {
      // Try drawing first frame to test for taint
      video.currentTime = 0;
    }, { once: true });

    video.addEventListener('seeked', () => {
      try {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0);
        // Test toBlob — this throws SecurityError if tainted
        canvas.toBlob((blob) => {
          clearTimeout(timeout);
          video.src = '';
          if (!blob) { resolve(null); return; }
          // Canvas works — use extractFromUrl with same crossOrigin approach
          resolve(null); // Let the caller use extractFromUrl with blob fallback
          // Actually, since we proved it works, do full extraction:
          extractFromUrl(video.src || videoUrl, intervalSeconds, maxFrames, onProgress, true)
            .then(resolve)
            .catch(() => resolve(null));
        }, 'image/png');
      } catch {
        clearTimeout(timeout);
        video.src = '';
        resolve(null);
      }
    }, { once: true });

    video.addEventListener('error', () => {
      clearTimeout(timeout);
      resolve(null);
    }, { once: true });

    video.src = videoUrl;
  });
};

/**
 * Core frame extraction from a video URL (blob or direct).
 */
const extractFromUrl = (
  videoUrl: string,
  intervalSeconds: number,
  maxFrames: number,
  onProgress?: (progress: number) => void,
  useCrossOrigin = false,
): Promise<ExtractedFrame[]> => {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    video.preload = 'auto';
    if (useCrossOrigin) video.crossOrigin = 'anonymous';

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      reject(new Error('Canvas 2D context not available'));
      return;
    }

    const frames: ExtractedFrame[] = [];
    let timestamps: number[] = [];
    let currentIdx = 0;

    const cleanup = () => {
      video.removeEventListener('loadedmetadata', onMetadata);
      video.removeEventListener('seeked', onSeeked);
      video.removeEventListener('error', onError);
      video.src = '';
    };

    const onError = () => {
      cleanup();
      reject(new Error('Failed to load video'));
    };

    const captureFrame = (): Promise<Blob> => {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0);
      return new Promise((res, rej) => {
        canvas.toBlob(
          blob => blob ? res(blob) : rej(new Error('toBlob failed')),
          'image/png',
        );
      });
    };

    const onSeeked = async () => {
      try {
        const blob = await captureFrame();
        frames.push({ timestamp: timestamps[currentIdx], blob });
        onProgress?.(frames.length / timestamps.length);
        currentIdx++;

        if (currentIdx < timestamps.length) {
          video.currentTime = timestamps[currentIdx];
        } else {
          cleanup();
          resolve(frames);
        }
      } catch (err) {
        cleanup();
        reject(err);
      }
    };

    const onMetadata = () => {
      const duration = video.duration;
      if (!duration || !isFinite(duration)) {
        cleanup();
        reject(new Error('Cannot read video duration'));
        return;
      }

      const interval = Math.max(intervalSeconds, duration / maxFrames);
      for (let t = 0; t < duration; t += interval) {
        timestamps.push(Math.round(t * 100) / 100);
        if (timestamps.length >= maxFrames) break;
      }

      if (timestamps.length === 0) {
        timestamps = [0];
      }

      video.currentTime = timestamps[0];
    };

    video.addEventListener('loadedmetadata', onMetadata);
    video.addEventListener('seeked', onSeeked);
    video.addEventListener('error', onError);
    video.src = videoUrl;
  });
};
