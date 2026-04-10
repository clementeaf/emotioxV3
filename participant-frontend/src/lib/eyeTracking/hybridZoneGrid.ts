/**
 * Zone grid and gaze-to-cell mapping for `/eye-tracking-hybrid` (lab page).
 * Survey `EyeTrackingRenderer` uses the same {@link HYBRID_IMAGE_CALIBRATION_POINTS} and hybrid IDW field for fixations.
 */

/** 2×2 = 4 cuadrantes sobre el rect del estímulo (formato simple para probabilidades iniciales). */
export const HYBRID_GRID_SIZE = 2;

export interface HybridZoneMeta {
    readonly id: string;
    readonly label: string;
    readonly col: number;
    readonly row: number;
}

/** Lista estable de 4 cuadrantes (orden row-major). */
export const HYBRID_AOI_GRID: readonly HybridZoneMeta[] = [
    { id: 'r0c0', label: 'Superior izquierda', col: 0, row: 0 },
    { id: 'r0c1', label: 'Superior derecha', col: 1, row: 0 },
    { id: 'r1c0', label: 'Inferior izquierda', col: 0, row: 1 },
    { id: 'r1c1', label: 'Inferior derecha', col: 1, row: 1 },
];

/** Hide cell label in results when share of samples is below this (noise filter). */
export const HYBRID_NOISE_THRESHOLD_PCT = 10;

/**
 * Stretch from image center (k>1 expands outer bands). Tuned for webcam gaze pulled toward center.
 */
export const HYBRID_EDGE_STRETCH_X = 1.12;

/** Y algo más que X: empuja hacia bordes verticales (inferior suele estar sub-representado). */
export const HYBRID_EDGE_STRETCH_Y = 1.22;

/**
 * En la mitad izquierda del estímulo (antes de nudges horizontales: relX bajo 50 % del ancho),
 * multiplica el stretch Y para separar mejor fila superior/inferior en la columna izquierda (r0c0 vs r1c0).
 */
export const HYBRID_LEFT_HALF_VERTICAL_STRETCH_MULT = 1.048;

/** Nudge hacia borde izquierdo (subido vs. derecha: mirada webcam suele caer algo a la derecha del estímulo). */
export const HYBRID_EDGE_LEFT_HALF_FACTOR = 0.11;

/** Nudge hacia borde derecho (ligeramente menor que antes para no desplazar tanto la columna derecha). */
export const HYBRID_EDGE_RIGHT_HALF_FACTOR = 0.15;

/** Nudge hacia arriba en la mitad superior (equilibrio con inferior: demasiado bajo deja poca “banda” para r0). */
export const HYBRID_EDGE_TOP_OUTER_FACTOR = 0.088;

/** Nudge hacia abajo en la mitad inferior (webcam suele subir el punto; no tan fuerte como para comerse la fila superior). */
export const HYBRID_EDGE_BOTTOM_OUTER_FACTOR = 0.195;

/**
 * Desplaza el corte fila sup/inf en coords estiradas. Valores altos favorecen inferiores y estrechan superiores.
 * Compromiso tras ajustes por cuadrantes inferiores.
 */
export const HYBRID_ZONE_ROW_BIAS = 0.026;

/**
 * Sesgo en coords estiradas para columna izq/der: negativo mueve el corte hacia la izquierda
 * (ayuda al cuadrante inferior izquierdo cuando X queda ligeramente a la derecha del centro).
 */
export const HYBRID_ZONE_COL_BIAS = -0.034;

/**
 * Recent zone ids for live highlight — con 4 cuadrantes hay menos fronteras; ventana moderada.
 */
export const HYBRID_ZONE_VOTE_HISTORY = 12;

/** Minimum gap between 1st and 2nd zone vote counts; if smaller, keep previous cell (border jitter). */
export const HYBRID_ZONE_VOTE_LEAD_MIN = 2;

/** Min ms between new votes in the sliding window (decouples rAF ~60Hz from zone classifier). */
export const HYBRID_ZONE_SAMPLE_MS = 36;

/** Same instant zone must hold this long (ms) to show fixation highlight (gold ring). */
export const HYBRID_FIXATION_DWELL_MS = 520;

/**
 * Nine calibration points in a 3×3 grid (% of image).
 * Covers corners, edge midpoints, and center for denser IDW residual field.
 * Order: top-left → top-center → top-right → mid-left → center → mid-right → bot-left → bot-center → bot-right.
 */
export const HYBRID_IMAGE_CALIBRATION_POINTS: readonly [number, number][] = [
    [15, 15],
    [50, 15],
    [85, 15],
    [15, 50],
    [50, 50],
    [85, 50],
    [15, 85],
    [50, 85],
    [85, 85],
];

/**
 * Single validation point after calibration — off-grid position to test accuracy.
 * If RMSE at this point exceeds threshold, the participant can re-calibrate.
 */
export const HYBRID_VALIDATION_POINT: readonly [number, number] = [62, 38];

/** RMSE threshold (viewport px) above which re-calibration is offered. */
export const HYBRID_RECALIBRATION_RMSE_THRESHOLD_PX = 120;

/**
 * Maps a point given as % of image box to BlazeGaze normalized coords (-0.5..0.5, center = screen center).
 * @param imgRect - Image bounding rect in viewport pixels
 * @param pctX - Horizontal position within image (0–100)
 * @param pctY - Vertical position within image (0–100)
 * @param vw - Viewport width
 * @param vh - Viewport height
 * @returns [normX, normY] for `blaze.calibrate`
 */
export function hybridImagePercentToBlazeNorm(
    imgRect: DOMRect,
    pctX: number,
    pctY: number,
    vw: number,
    vh: number,
): [number, number] {
    const cx = imgRect.left + (pctX / 100) * imgRect.width;
    const cy = imgRect.top + (pctY / 100) * imgRect.height;
    return [(cx / vw) - 0.5, (cy / vh) - 0.5];
}

/**
 * @param t - Normalized coordinate along one axis (0 = start, 1 = end)
 * @param k - Stretch factor from center (1 = no stretch)
 * @returns Stretched t in [0, 1]
 */
export function hybridStretchFromCenter01(t: number, k: number): number {
    const c = 0.5;
    return Math.max(0, Math.min(1, c + (t - c) * k));
}

/**
 * Stretch desde el centro con k atenuado cerca de t=0.5 para que las zonas medias
 * no amplifiquen tanto el error (el stretch fuerte en esquinas se mantiene hacia bordes).
 * @param t - Coordenada normalizada 0..1
 * @param k - Factor base (p. ej. HYBRID_EDGE_STRETCH_X)
 * @returns t estirado en [0,1]
 */
export function hybridStretchFromCenter01MiddleSoft(t: number, k: number): number {
    const c = 0.5;
    const distFromCenter = Math.abs(t - c) * 2;
    const span = 1.32;
    const kBlend = 1 + (k - 1) * Math.min(1, distFromCenter * span);
    return hybridStretchFromCenter01(t, kBlend);
}

/**
 * Maps viewport coords to stretched normalized [0,1]^2 (same transform as zone classification).
 * Sin boosts por esquina: la corrección principal es el campo IDW tras calibración.
 * @returns null if rect has no size
 */
export function hybridViewportToStretched01(
    x: number,
    y: number,
    rect: DOMRect,
): { sX: number; sY: number } | null {
    if (rect.width <= 0 || rect.height <= 0) return null;
    const relX = Math.max(0, Math.min(rect.width, x - rect.left));
    const relY = Math.max(0, Math.min(rect.height, y - rect.top));
    let tX = relX / rect.width;
    let tY = relY / rect.height;
    const isLeftHalfImage = tX < 0.5;

    if (tX < 0.5) {
        tX = Math.max(0, tX - (0.5 - tX) * HYBRID_EDGE_LEFT_HALF_FACTOR);
    } else {
        tX = Math.min(1, tX + (tX - 0.5) * HYBRID_EDGE_RIGHT_HALF_FACTOR);
    }
    if (tY < 0.5) {
        tY = Math.max(0, tY - (0.5 - tY) * HYBRID_EDGE_TOP_OUTER_FACTOR);
    } else {
        tY = Math.min(1, tY + (tY - 0.5) * HYBRID_EDGE_BOTTOM_OUTER_FACTOR);
    }

    const sX = hybridStretchFromCenter01MiddleSoft(tX, HYBRID_EDGE_STRETCH_X);
    const kY = HYBRID_EDGE_STRETCH_Y * (isLeftHalfImage ? HYBRID_LEFT_HALF_VERTICAL_STRETCH_MULT : 1);
    const sY = hybridStretchFromCenter01MiddleSoft(tY, kY);
    return { sX, sY };
}

/**
 * Pesos bilineales en la rejilla 2×2 (suma 1). Mismo espacio estirado que hybridPointToZone.
 * @returns Per-zone weights; empty map if rect invalid
 */
export function hybridPointToSoftZoneWeights(
    x: number,
    y: number,
    rect: DOMRect,
): Record<string, number> {
    const out: Record<string, number> = {};
    for (const z of HYBRID_AOI_GRID) {
        out[z.id] = 0;
    }
    const p = hybridViewportToStretched01(x, y, rect);
    if (!p) return out;

    const sXWeighted = Math.min(1 - 1e-9, Math.max(0, p.sX + HYBRID_ZONE_COL_BIAS));
    const sYWeighted = Math.min(1 - 1e-9, Math.max(0, p.sY + HYBRID_ZONE_ROW_BIAS));
    const gx = sXWeighted * HYBRID_GRID_SIZE;
    const gy = sYWeighted * HYBRID_GRID_SIZE;
    const colF = Math.min(Math.max(gx, 0), HYBRID_GRID_SIZE - 1e-9);
    const rowF = Math.min(Math.max(gy, 0), HYBRID_GRID_SIZE - 1e-9);
    const col0 = Math.min(Math.floor(colF), HYBRID_GRID_SIZE - 1);
    const row0 = Math.min(Math.floor(rowF), HYBRID_GRID_SIZE - 1);
    const col1 = Math.min(col0 + 1, HYBRID_GRID_SIZE - 1);
    const row1 = Math.min(row0 + 1, HYBRID_GRID_SIZE - 1);
    const wx = colF - col0;
    const wy = rowF - row0;
    const w00 = (1 - wx) * (1 - wy);
    const w10 = wx * (1 - wy);
    const w01 = (1 - wx) * wy;
    const w11 = wx * wy;
    const id = (row: number, col: number): string => `r${row}c${col}`;
    out[id(row0, col0)] += w00;
    out[id(row0, col1)] += w10;
    out[id(row1, col0)] += w01;
    out[id(row1, col1)] += w11;
    return out;
}

/**
 * Asigna un punto viewport a un cuadrante 2×2. Compensa sub-disparo (half-planes, boosts de esquina, stretch).
 * @returns Zone id (`r{row}c{col}`), or null if the image has no layout size
 */
export function hybridPointToZone(x: number, y: number, rect: DOMRect): string | null {
    const p = hybridViewportToStretched01(x, y, rect);
    if (!p) return null;
    const sXWeighted = Math.min(1 - 1e-9, Math.max(0, p.sX + HYBRID_ZONE_COL_BIAS));
    const sYWeighted = Math.min(1 - 1e-9, Math.max(0, p.sY + HYBRID_ZONE_ROW_BIAS));
    const col = Math.min(Math.floor(sXWeighted * HYBRID_GRID_SIZE), HYBRID_GRID_SIZE - 1);
    const row = Math.min(Math.floor(sYWeighted * HYBRID_GRID_SIZE), HYBRID_GRID_SIZE - 1);
    return `r${row}c${col}`;
}

/**
 * Picks zone from recent votes: prefers clear lead over runner-up, then strict majority; else keeps previous.
 * @param zones - Recent zone ids (null = off-image)
 * @param previous - Last committed zone
 * @returns Winning zone id or null
 */
export function hybridModeZoneFromHistory(
    zones: readonly (string | null)[],
    previous: string | null,
): string | null {
    const counts = new Map<string, number>();
    for (const z of zones) {
        if (z) counts.set(z, (counts.get(z) ?? 0) + 1);
    }
    const validCount = zones.reduce((n, z) => n + (z ? 1 : 0), 0);
    if (validCount === 0) {
        return previous;
    }

    const sorted = [...counts.entries()].sort((a, b) => {
        if (b[1] !== a[1]) return b[1] - a[1];
        if (a[0] === previous) return -1;
        if (b[0] === previous) return 1;
        return 0;
    });
    const topId = sorted[0]?.[0] ?? null;
    const topV = sorted[0]?.[1] ?? 0;
    const secondV = sorted[1]?.[1] ?? 0;

    if (topId === null) {
        return previous;
    }

    if (sorted.length >= 2 && topV - secondV < HYBRID_ZONE_VOTE_LEAD_MIN) {
        return previous ?? topId;
    }

    const need = Math.floor(validCount / 2) + 1;
    if (topV < need) {
        return previous ?? topId;
    }
    return topId;
}

/**
 * Heatmap cell background color from 0–1 intensity (results overlay).
 * @param intensity - Normalized weight vs max cell count
 * @returns CSS rgba string
 */
export function hybridHeatColor(intensity: number): string {
    if (intensity < 0.25) return 'rgba(59, 130, 246, 0.15)';
    if (intensity < 0.50) return 'rgba(34, 197, 94, 0.30)';
    if (intensity < 0.75) return 'rgba(250, 204, 21, 0.45)';
    return 'rgba(239, 68, 68, 0.60)';
}
