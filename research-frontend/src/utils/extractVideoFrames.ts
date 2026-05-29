/**
 * Client-side video frame extraction.
 * Uses <video> + <canvas> to extract keyframes at regular intervals.
 * Returns an array of PNG blobs with their timestamps.
 */

export interface ExtractedFrame {
  timestamp: number; // seconds
  blob: Blob;
}

/**
 * Extracts frames from a video URL at a given interval.
 * Downloads the video as a local blob first to avoid CORS canvas tainting.
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
  // Download video as blob to avoid CORS tainting when drawing to canvas
  let localUrl = videoUrl;
  if (!videoUrl.startsWith('blob:')) {
    const response = await fetch(videoUrl);
    if (!response.ok) throw new Error(`Failed to fetch video: ${response.status}`);
    const blob = await response.blob();
    localUrl = URL.createObjectURL(blob);
  }

  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.muted = true;
    video.preload = 'auto';

    const revokeUrl = () => {
      if (localUrl !== videoUrl) URL.revokeObjectURL(localUrl);
    };

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
      revokeUrl();
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

      // Generate timestamps
      const interval = Math.max(intervalSeconds, duration / maxFrames);
      for (let t = 0; t < duration; t += interval) {
        timestamps.push(Math.round(t * 100) / 100);
        if (timestamps.length >= maxFrames) break;
      }

      if (timestamps.length === 0) {
        timestamps = [0];
      }

      // Start seeking
      video.currentTime = timestamps[0];
    };

    video.addEventListener('loadedmetadata', onMetadata);
    video.addEventListener('seeked', onSeeked);
    video.addEventListener('error', onError);
    video.src = localUrl;
  });
};
