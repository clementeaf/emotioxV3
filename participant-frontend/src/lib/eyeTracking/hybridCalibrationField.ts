/**
 * Post-calibración: campo de corrección en viewport a partir de residuos en los puntos de calibración
 * (objetivo − mirada estimada). Interpolación IDW en coordenadas normalizadas de la imagen.
 * Complementa BlazeGaze sin sustituir su calibrate() interno.
 */

/** Residuo en un punto de calibración (u,v en 0..1 sobre el rect del estímulo). */
export interface HybridCalibrationResidual {
    readonly u: number;
    readonly v: number;
    readonly dx: number;
    readonly dy: number;
}

/** Mezcla 0..1 del campo sobre la mirada corregida (sube un poco al reducir boosts geométricos en rejilla). */
export const HYBRID_CALIBRATION_FIELD_STRENGTH = 0.62;

/**
 * Aplica corrección interpolada por distancia inversa a la mirada en coords de viewport.
 * @param x - Client X
 * @param y - Client Y
 * @param rect - Bounding rect del estímulo
 * @param samples - Residuos de calibración (p. ej. 4 en modo cuadrantes)
 * @param strength - Típicamente HYBRID_CALIBRATION_FIELD_STRENGTH
 * @returns Punto corregido en viewport
 */
export function hybridApplyCalibrationField(
    x: number,
    y: number,
    rect: DOMRect,
    samples: readonly HybridCalibrationResidual[],
    strength: number,
): { x: number; y: number } {
    if (samples.length === 0 || strength <= 0) {
        return { x, y };
    }
    const wImg = rect.width;
    const hImg = rect.height;
    if (wImg <= 0 || hImg <= 0) {
        return { x, y };
    }
    const u = (x - rect.left) / wImg;
    const v = (y - rect.top) / hImg;
    if (u < -0.02 || u > 1.02 || v < -0.02 || v > 1.02) {
        return { x, y };
    }

    const eps = 1e-5;
    let wSum = 0;
    let dxSum = 0;
    let dySum = 0;
    for (const s of samples) {
        const du = u - s.u;
        const dv = v - s.v;
        const w = 1 / (du * du + dv * dv + eps);
        wSum += w;
        dxSum += w * s.dx;
        dySum += w * s.dy;
    }
    if (wSum <= 0) {
        return { x, y };
    }
    const dx = (dxSum / wSum) * strength;
    const dy = (dySum / wSum) * strength;
    return {
        x: Math.max(0, Math.min(window.innerWidth, x + dx)),
        y: Math.max(0, Math.min(window.innerHeight, y + dy)),
    };
}

/**
 * RMSE of calibration residuals in viewport pixels (spread of |target − gaze| at each point).
 * @param samples - Residuals from hybrid calibration clicks
 * @returns 0 if empty
 */
export function hybridCalibrationRmsePx(samples: readonly HybridCalibrationResidual[]): number {
    if (samples.length === 0) return 0;
    let sumSq = 0;
    for (const s of samples) {
        sumSq += s.dx * s.dx + s.dy * s.dy;
    }
    return Math.sqrt(sumSq / samples.length);
}

/** Higher = confidence falls off faster with distance from nearest calibration anchor in UV space. */
export const HYBRID_CALIB_CONFIDENCE_K = 14;

/**
 * Confidence in [0,1] from proximity to calibration samples in normalized image coordinates.
 * Far from all anchors → lower weight for soft heatmap aggregation.
 * @param u - Horizontal position in 0..1 on stimulus rect
 * @param v - Vertical position in 0..1 on stimulus rect
 * @param samples - Calibration residuals (uses their u,v as anchors)
 * @param k - Squared-distance scale; default HYBRID_CALIB_CONFIDENCE_K
 */
export function hybridCalibrationConfidenceWeightUv(
    u: number,
    v: number,
    samples: readonly HybridCalibrationResidual[],
    k: number = HYBRID_CALIB_CONFIDENCE_K,
): number {
    if (samples.length === 0) return 1;
    let minD2 = Infinity;
    for (const s of samples) {
        const du = u - s.u;
        const dv = v - s.v;
        minD2 = Math.min(minD2, du * du + dv * dv);
    }
    return 1 / (1 + k * minD2);
}
