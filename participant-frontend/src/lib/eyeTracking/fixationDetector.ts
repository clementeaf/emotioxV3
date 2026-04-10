/**
 * I-DT (Dispersion-Threshold Identification) fixation detector.
 *
 * Groups consecutive gaze samples into fixations when their spatial dispersion
 * stays below a threshold for at least a minimum duration.
 *
 * Reference: Salvucci & Goldberg (2000) — "Identifying Fixations and Saccades
 * in Eye-Tracking Protocols".
 */

/** Raw gaze sample (viewport or image-relative coords). */
export interface GazeSample {
    readonly x: number;
    readonly y: number;
    /** Timestamp in ms (monotonic, e.g. performance.now()). */
    readonly t: number;
}

/** Detected fixation with centroid and duration. */
export interface DetectedFixation {
    /** Centroid X (same coordinate space as input samples). */
    readonly x: number;
    /** Centroid Y. */
    readonly y: number;
    /** Duration in ms. */
    readonly duration: number;
    /** Timestamp of the first sample in this fixation (ms). */
    readonly timestamp: number;
    /** Number of raw gaze samples that formed this fixation. */
    readonly pointCount: number;
}

// --- Defaults tuned for webcam gaze (~50ms sample interval, ~60px accuracy) ---

/**
 * Maximum dispersion (px) for a group of samples to be considered a fixation.
 * Webcam gaze has ~2-4° error; on a 1920px screen at 60cm that's ~60-120px.
 * We use a moderate value that tolerates webcam jitter but still separates distinct fixations.
 */
export const IDT_DEFAULT_DISPERSION_THRESHOLD_PX = 85;

/**
 * Minimum fixation duration (ms). Saccades are typically <80ms; micro-fixations
 * under 100ms are usually noise for webcam-grade tracking.
 */
export const IDT_DEFAULT_MIN_DURATION_MS = 120;

/**
 * Maximum gap between consecutive samples (ms) before splitting a fixation window.
 * If the tracker drops frames for longer than this, treat it as a break.
 */
export const IDT_MAX_SAMPLE_GAP_MS = 300;

/**
 * Dispersion of a set of samples: max(x) - min(x) + max(y) - min(y).
 * Fast O(n) metric used in the original I-DT paper.
 */
function dispersion(samples: readonly GazeSample[]): number {
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    for (const s of samples) {
        if (s.x < minX) minX = s.x;
        if (s.x > maxX) maxX = s.x;
        if (s.y < minY) minY = s.y;
        if (s.y > maxY) maxY = s.y;
    }
    return (maxX - minX) + (maxY - minY);
}

/** Centroid of a group of samples. */
function centroid(samples: readonly GazeSample[]): { x: number; y: number } {
    let sx = 0;
    let sy = 0;
    for (const s of samples) {
        sx += s.x;
        sy += s.y;
    }
    const n = samples.length;
    return { x: sx / n, y: sy / n };
}

/**
 * Detect fixations from a time-sorted array of gaze samples using I-DT.
 *
 * @param samples - Gaze points sorted by ascending timestamp
 * @param dispersionThreshold - Max dispersion (px) for a fixation window. Default 85.
 * @param minDuration - Minimum fixation duration (ms). Default 120.
 * @returns Array of detected fixations
 */
export function detectFixationsIDT(
    samples: readonly GazeSample[],
    dispersionThreshold: number = IDT_DEFAULT_DISPERSION_THRESHOLD_PX,
    minDuration: number = IDT_DEFAULT_MIN_DURATION_MS,
): DetectedFixation[] {
    if (samples.length < 2) return [];

    const fixations: DetectedFixation[] = [];
    let i = 0;

    while (i < samples.length) {
        // Initialize window with minimum duration worth of points
        let j = i + 1;
        while (j < samples.length) {
            // Split on temporal gap
            if (samples[j].t - samples[j - 1].t > IDT_MAX_SAMPLE_GAP_MS) break;
            if (samples[j].t - samples[i].t >= minDuration) break;
            j++;
        }

        // Not enough samples to reach min duration
        if (j >= samples.length || samples[j].t - samples[i].t < minDuration) {
            // Try the remaining window anyway
            const window = samples.slice(i, j + 1 <= samples.length ? j + 1 : j);
            if (window.length >= 2 && window[window.length - 1].t - window[0].t >= minDuration) {
                if (dispersion(window) <= dispersionThreshold) {
                    const c = centroid(window);
                    fixations.push({
                        x: Math.round(c.x),
                        y: Math.round(c.y),
                        duration: Math.round(window[window.length - 1].t - window[0].t),
                        timestamp: Math.round(window[0].t),
                        pointCount: window.length,
                    });
                }
            }
            break;
        }

        // Check dispersion of the initial window [i..j]
        let window = samples.slice(i, j + 1);

        if (dispersion(window) <= dispersionThreshold) {
            // Expand window while dispersion stays below threshold
            while (j + 1 < samples.length) {
                if (samples[j + 1].t - samples[j].t > IDT_MAX_SAMPLE_GAP_MS) break;
                const expanded = [...window, samples[j + 1]];
                if (dispersion(expanded) > dispersionThreshold) break;
                j++;
                window = expanded;
            }

            // Record fixation
            const c = centroid(window);
            const dur = window[window.length - 1].t - window[0].t;
            if (dur >= minDuration) {
                fixations.push({
                    x: Math.round(c.x),
                    y: Math.round(c.y),
                    duration: Math.round(dur),
                    timestamp: Math.round(window[0].t),
                    pointCount: window.length,
                });
            }

            i = j + 1;
        } else {
            // Dispersion too high — advance start by one sample
            i++;
        }
    }

    return fixations;
}

/**
 * Convert viewport gaze fixations to image-relative pixel coordinates.
 * Filters out fixations whose centroid falls outside the image bounds.
 *
 * @param fixations - Fixations in viewport coordinates
 * @param imgRect - Image bounding rect in viewport
 * @param naturalW - Image natural width (pixels)
 * @param naturalH - Image natural height (pixels)
 * @returns Fixations in image pixel coordinates
 */
export function mapFixationsToImageCoords(
    fixations: readonly DetectedFixation[],
    imgRect: DOMRect,
    naturalW: number,
    naturalH: number,
): DetectedFixation[] {
    if (imgRect.width <= 0 || imgRect.height <= 0) return [];
    return fixations
        .filter(f =>
            f.x >= imgRect.left && f.x <= imgRect.right &&
            f.y >= imgRect.top && f.y <= imgRect.bottom
        )
        .map(f => ({
            ...f,
            x: Math.round(((f.x - imgRect.left) / imgRect.width) * naturalW),
            y: Math.round(((f.y - imgRect.top) / imgRect.height) * naturalH),
        }));
}
