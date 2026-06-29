/**
 * Session Quality Checks — pre-calibration environment validation.
 *
 * Verifies: brightness, face distance (iris diameter), camera resolution,
 * head stability, and face detection confidence before allowing calibration.
 *
 * All checks run on raw video frames — no external dependencies beyond
 * the camera MediaStream already acquired in setup phase.
 */

// ---------------------------------------------------------------------------
// Thresholds
// ---------------------------------------------------------------------------

/** Minimum average brightness (0-255) for acceptable illumination. */
export const MIN_BRIGHTNESS = 80;
/** Below this → hard reject (too dark to track iris). */
export const REJECT_BRIGHTNESS = 60;

/** Acceptable face distance range in cm (based on iris diameter). */
export const MIN_DISTANCE_CM = 45;
export const MAX_DISTANCE_CM = 75;

/** Known average iris diameter in mm (human constant). */
const IRIS_DIAMETER_MM = 11.7;

/** Minimum camera resolution (short edge). */
export const MIN_CAMERA_WIDTH = 640;
export const MIN_CAMERA_HEIGHT = 480;

/** Max variance of nose-tip position (px) over N frames for head stability. */
export const MAX_HEAD_VARIANCE_PX = 15;

/** Number of frames to sample for head stability check. */
export const HEAD_STABILITY_FRAMES = 30;

/** Minimum face detection confidence (0-1). */
export const MIN_FACE_CONFIDENCE = 0.8;

// ---------------------------------------------------------------------------
// Check results
// ---------------------------------------------------------------------------

export type QualityCheckId = 'brightness' | 'distance' | 'resolution' | 'headStability' | 'faceDetection';

export type CheckStatus = 'pending' | 'checking' | 'pass' | 'warn' | 'fail';

export interface QualityCheckResult {
    readonly id: QualityCheckId;
    readonly status: CheckStatus;
    readonly value?: number;
    readonly message?: string;
}

export interface QualityGateResult {
    readonly checks: QualityCheckResult[];
    readonly canProceed: boolean;
}

// ---------------------------------------------------------------------------
// Brightness check (canvas-based)
// ---------------------------------------------------------------------------

/**
 * Compute average brightness of a video frame.
 * Uses a downscaled canvas for performance.
 */
export function measureBrightness(video: HTMLVideoElement): number {
    const w = 64;
    const h = 48;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return 128; // fallback mid-range
    ctx.drawImage(video, 0, 0, w, h);
    const data = ctx.getImageData(0, 0, w, h).data;

    let sum = 0;
    const pixels = w * h;
    for (let i = 0; i < data.length; i += 4) {
        // Luminance from RGB (ITU-R BT.601)
        sum += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    }
    return sum / pixels;
}

export function checkBrightness(video: HTMLVideoElement): QualityCheckResult {
    const brightness = measureBrightness(video);
    if (brightness < REJECT_BRIGHTNESS) {
        return { id: 'brightness', status: 'fail', value: Math.round(brightness), message: 'Too dark — improve lighting' };
    }
    if (brightness < MIN_BRIGHTNESS) {
        return { id: 'brightness', status: 'warn', value: Math.round(brightness), message: 'Low light — accuracy may be reduced' };
    }
    return { id: 'brightness', status: 'pass', value: Math.round(brightness) };
}

// ---------------------------------------------------------------------------
// Camera resolution check
// ---------------------------------------------------------------------------

export function checkResolution(video: HTMLVideoElement): QualityCheckResult {
    const w = video.videoWidth;
    const h = video.videoHeight;
    if (w < MIN_CAMERA_WIDTH || h < MIN_CAMERA_HEIGHT) {
        return { id: 'resolution', status: 'fail', value: w, message: `Camera resolution too low (${w}×${h})` };
    }
    return { id: 'resolution', status: 'pass', value: w };
}

// ---------------------------------------------------------------------------
// Face distance estimation (iris diameter method)
// ---------------------------------------------------------------------------

/**
 * Estimate face-to-camera distance from iris diameter in pixels.
 * Uses the pinhole camera model: distance = (real_size × focal_length) / pixel_size
 *
 * Focal length approximation: ~video.videoWidth (for ~60° FOV webcams).
 * This gives a rough estimate ±10cm which is sufficient for the quality gate.
 */
export function estimateDistanceCm(irisDiameterPx: number, videoWidth: number): number {
    if (irisDiameterPx <= 0) return 999;
    // focal length ≈ frame width for typical 60° FOV webcam
    const focalPx = videoWidth;
    const distanceMm = (IRIS_DIAMETER_MM * focalPx) / irisDiameterPx;
    return distanceMm / 10;
}

export function checkDistance(distanceCm: number): QualityCheckResult {
    if (distanceCm < MIN_DISTANCE_CM) {
        return { id: 'distance', status: 'warn', value: Math.round(distanceCm), message: 'Too close — move back' };
    }
    if (distanceCm > MAX_DISTANCE_CM) {
        return { id: 'distance', status: 'warn', value: Math.round(distanceCm), message: 'Too far — move closer' };
    }
    return { id: 'distance', status: 'pass', value: Math.round(distanceCm) };
}

// ---------------------------------------------------------------------------
// Head stability check
// ---------------------------------------------------------------------------

/**
 * Compute variance (σ²) of a series of 2D positions.
 * Returns combined X+Y variance in pixels.
 */
export function computePositionVariance(positions: readonly { x: number; y: number }[]): number {
    if (positions.length < 2) return 999;
    let sumX = 0, sumY = 0;
    for (const p of positions) { sumX += p.x; sumY += p.y; }
    const meanX = sumX / positions.length;
    const meanY = sumY / positions.length;
    let varSum = 0;
    for (const p of positions) {
        varSum += (p.x - meanX) ** 2 + (p.y - meanY) ** 2;
    }
    return Math.sqrt(varSum / positions.length);
}

export function checkHeadStability(variance: number): QualityCheckResult {
    if (variance > MAX_HEAD_VARIANCE_PX) {
        return { id: 'headStability', status: 'fail', value: Math.round(variance), message: 'Keep your head still' };
    }
    return { id: 'headStability', status: 'pass', value: Math.round(variance) };
}

// ---------------------------------------------------------------------------
// Face detection confidence check
// ---------------------------------------------------------------------------

export function checkFaceConfidence(confidence: number): QualityCheckResult {
    if (confidence < MIN_FACE_CONFIDENCE) {
        return { id: 'faceDetection', status: 'fail', value: Math.round(confidence * 100), message: 'Face not clearly detected' };
    }
    return { id: 'faceDetection', status: 'pass', value: Math.round(confidence * 100) };
}

// ---------------------------------------------------------------------------
// Aggregate gate
// ---------------------------------------------------------------------------

export function evaluateGate(checks: QualityCheckResult[]): QualityGateResult {
    const hasFailure = checks.some(c => c.status === 'fail');
    return { checks, canProceed: !hasFailure };
}
