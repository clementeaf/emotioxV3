/**
 * Relleno de huecos temporales entre muestras de mirada válidas consecutivas.
 * Trayectoria de mínimo jerk (aprox. "mínima acción" suave entre puntos medidos).
 */

/** No interpolar si el salto temporal supera este umbral (ms). */
export const HYBRID_GAP_FILL_MAX_MS = 1800;

/** Paso temporal entre muestras sintéticas (alineado al muestreo ~50 ms del estímulo). */
export const HYBRID_GAP_FILL_STEP_MS = 50;

/** Por debajo de esto el segmento no recibe puntos intermedios (ms). */
export const HYBRID_GAP_FILL_MIN_SEGMENT_MS = 55;

/**
 * Peso multiplicativo de la confianza en el heatmap para muestras sintéticas (0..1).
 * Bajo para no inflar el mapa con tramos interpolados.
 */
export const HYBRID_GAP_FILL_SYNTHETIC_WEIGHT = 0.22;

/** Muestra de mirada tras posible relleno de huecos. */
export interface HybridGazeSample {
    readonly x: number;
    readonly y: number;
    readonly t: number;
    /** true si se generó por interpolación mínimo jerk entre dos muestras válidas. */
    readonly interpolated: boolean;
}

/**
 * Factor de posición en trayectoria de mínimo jerk en [0,1] (τ normalizado).
 * Polinomio quinto orden con velocidad y aceleración nulas en τ=0 y τ=1.
 * @param tau - Fracción de tiempo en el segmento [0,1]
 * @returns Factor de avance en [0,1]
 */
export function hybridMinimumJerkPositive01(tau: number): number {
    const t = Math.max(0, Math.min(1, tau));
    return 10 * t * t * t - 15 * t * t * t * t + 6 * t * t * t * t * t;
}

/**
 * Expande la serie temporal con puntos sintéticos entre cada par de muestras consecutivas
 * cuando el hueco está en (MIN_SEGMENT, MAX_GAP]. Mínimo jerk independiente en X e Y con el mismo τ.
 * @param points - Muestras medidas (t en ms, coords en viewport ya corregidas si aplica)
 * @returns Serie ordenada por t: medidas + sintéticas etiquetadas
 */
export function expandGazeWithMinimumJerkGapFill(
    points: readonly { x: number; y: number; t: number }[],
): HybridGazeSample[] {
    if (points.length === 0) {
        return [];
    }
    const sorted = [...points].sort((a, b) => a.t - b.t);
    const out: HybridGazeSample[] = [];
    for (let i = 0; i < sorted.length; i++) {
        const p = sorted[i];
        out.push({ x: p.x, y: p.y, t: p.t, interpolated: false });
        if (i === sorted.length - 1) {
            break;
        }
        const q = sorted[i + 1];
        const dt = q.t - p.t;
        if (dt <= HYBRID_GAP_FILL_MIN_SEGMENT_MS || dt > HYBRID_GAP_FILL_MAX_MS) {
            continue;
        }
        let tInsert = p.t + HYBRID_GAP_FILL_STEP_MS;
        const endExclusive = q.t - HYBRID_GAP_FILL_STEP_MS * 0.25;
        while (tInsert < endExclusive) {
            const tau = (tInsert - p.t) / dt;
            const s = hybridMinimumJerkPositive01(tau);
            const x = p.x + (q.x - p.x) * s;
            const y = p.y + (q.y - p.y) * s;
            out.push({ x, y, t: tInsert, interpolated: true });
            tInsert += HYBRID_GAP_FILL_STEP_MS;
        }
    }
    return out;
}
