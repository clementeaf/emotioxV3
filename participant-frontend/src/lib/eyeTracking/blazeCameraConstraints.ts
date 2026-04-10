/**
 * Constraints for webcam streams feeding BlazeGaze (WebEyeTrack).
 * Uses `ideal` so the browser can fall back on weak cameras; avoids hard `min` that would fail permission on low-end devices.
 */
export const BLAZE_GAZE_MEDIA_STREAM_CONSTRAINTS: MediaStreamConstraints = {
    video: {
        facingMode: 'user',
        width: { ideal: 1280 },
        height: { ideal: 720 },
    },
};

/** Shorter frame side below this (px) triggers a non-blocking UI hint (typical 480p floor). */
export const BLAZE_GAZE_CAPTURE_SHORT_EDGE_WARN_PX = 480;

/**
 * Whether capture resolution is likely too low for stable gaze (short edge under warn threshold).
 * @param width - videoWidth from the frame fed to the model
 * @param height - videoHeight from the frame fed to the model
 */
export function isBlazeGazeCaptureResolutionLow(width: number, height: number): boolean {
    if (width <= 0 || height <= 0) {
        return false;
    }
    return Math.min(width, height) < BLAZE_GAZE_CAPTURE_SHORT_EDGE_WARN_PX;
}
