/**
 * Detects iOS/iPadOS (Safari, Chrome-on-iOS, etc.).
 * iOS ignores width/height min constraints and may reject them on older versions.
 */
const isIOS = (): boolean =>
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

/**
 * Constraints for webcam streams feeding BlazeGaze (WebEyeTrack).
 * iOS: only facingMode (min/ideal constraints are ignored or cause rejection).
 * Desktop/Android: uses min to ensure adequate eye-region pixel density.
 */
export const BLAZE_GAZE_MEDIA_STREAM_CONSTRAINTS: MediaStreamConstraints = {
    video: isIOS()
        ? { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } }
        : { facingMode: 'user', width: { min: 1024, ideal: 1280 }, height: { min: 576, ideal: 720 } },
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
