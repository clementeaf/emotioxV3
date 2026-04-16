/**
 * Constraints for webcam streams feeding BlazeGaze (WebEyeTrack).
 * Uses `min` to ensure adequate eye-region pixel density for the CNN model.
 * Falls back gracefully — if camera can't meet min, browser negotiates best available.
 */
export const BLAZE_GAZE_MEDIA_STREAM_CONSTRAINTS: MediaStreamConstraints = {
    video: {
        facingMode: 'user',
        width: { min: 1024, ideal: 1280 },
        height: { min: 576, ideal: 720 },
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
