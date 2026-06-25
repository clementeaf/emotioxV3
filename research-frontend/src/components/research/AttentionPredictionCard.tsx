import { useState, useMemo, useRef, useCallback, useEffect, type ReactNode } from 'react';
import { useViewportHeight } from '../../hooks/useViewportHeight';
import { createPortal } from 'react-dom';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { cn } from '../../lib/utils';
import { HeatmapRenderer } from '../results/cognitive-task/components/HeatmapRenderer';
import { SpotlightRenderer } from '../results/cognitive-task/components/SpotlightRenderer';
import { ColdMapRenderer } from '../results/cognitive-task/components/ColdMapRenderer';
import { loadCachedStimulusImage } from '../../utils/stimulusImageCache';
import { GazeScanpathPlayer } from './GazeScanpathPlayer';
import { computeGridPercentages } from './VideoFrameScrubber';
import { researchService } from '../../services/research.service';
import { resolveMediaUrl } from '../../services/media.service';
import { GazePathOverlay } from './GazePathOverlay';
import { AiAoiOverlay } from './AiAoiOverlay';
import { AoiRectEditor } from './AoiRectEditor';
import type { AiAnalysisResult } from '../../types/aiAnalysis.types';
import type { ManualAOI } from '../../types/attentionPrediction.types';
import {
    canRunAnalysisGate,
    canRunPredictionGate,
    clampAoiBounds,
    DEFAULT_COLD_MAP_SETTINGS,
    DEFAULT_SPOTLIGHT_SETTINGS,
    formatHeatmapViewSummary,
    isLegacyDenseHeatmap,
    normalizeManualAois,
    reconcileAutoAoisWithManual,
    computeAoiAttentionShare,
    estimateExposureTime,
    anchorGazePathToHeatmap,
    anchorGazeRoutesToHeatmap,
    buildAttentionLayerPreset,
    shouldBlockAoiKeyboardDelete,
    resolveHeatmapVisualProfile,
    type AttentionLayerContext,
    type AttentionPredictionTabId,
    STIMULUS_MEDIA_FIT_FLEX_CLASS,
    type ColdMapSettings,
    type HeatmapMapMode,
    type SpotlightSettings,
} from '../../utils/attentionPrediction.utils';

import { StimulusOverlayFrame, ZoomControls, STIMULUS_TRANSFORM_CONTENT_STYLE } from './StimulusOverlayFrame';
import { generateGridAois } from '../../utils/gridAoiGenerator';
import { AoiTimelineBar } from './AoiTimelineBar';
import { HeatmapSettingsModal, DEFAULT_SETTINGS, type HeatmapPoint, type HeatmapSettings, type HeatmapViewSettings } from './HeatmapSettingsModal';
import { MapModeControlBar } from './MapModeControlBar';
import {
    decodeThermalMap,
    renderSaliencyMapDirect,
    sigmoidContrast,
    buildColorLUT,
    REBALANCED_THERMAL_STOPS,
} from '../../utils/thermalContrast';
import { StimulusFullscreenModal } from './StimulusFullscreenModal';
import type { VideoFrameData } from './VideoFrameScrubber';
import { extractVideoThumbnail } from '../../utils/extractVideoThumbnail';

/* ─── Constants ─── */

const ROUTE_COLORS: Record<string, string> = {
    'typical-scan': '#3B82F6',
    'group-scan': '#10B981',
    'novelty-search': '#F59E0B',
};

const GAZE_ROUTE_LEGEND: Array<{ id: string; color: string; label: string }> = [
    { id: 'typical-scan', color: ROUTE_COLORS['typical-scan'], label: 'Typical Scan (Vertical Flow)' },
    { id: 'group-scan', color: ROUTE_COLORS['group-scan'], label: 'Group/Area Scan' },
    { id: 'novelty-search', color: ROUTE_COLORS['novelty-search'], label: 'Novelty/Differentiation Search' },
];

const AOI_COLORS = ['#3B82F6', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#EF4444', '#06B6D4'];

const TAB_ICONS: Record<string, ReactNode> = {
    eye: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>,
    video: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
    image: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>,
    settings: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
    route: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 6l6 6-6 6" /><circle cx="6" cy="6" r="2" /><circle cx="18" cy="18" r="2" /></svg>,
    aoi: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><rect x="3" y="3" width="18" height="18" rx="2" /><path strokeLinecap="round" d="M3 9h18M9 3v18" /></svg>,
};

/* ─── Types ─── */

interface AOIWithStats extends ManualAOI {
    percentage: number;
}

type TabId = AttentionPredictionTabId;

interface StimulusLayers {
    heatmap: boolean;
    aiAois: boolean;
    manualAois: boolean;
    gaze: boolean;
}

const BASE_TABS: { id: TabId; label: string; icon: string }[] = [
    { id: 'original', label: 'Original', icon: 'image' },
    { id: 'heatmap', label: 'Heatmap', icon: 'eye' },
    { id: 'gaze-paths', label: 'Gaze Paths', icon: 'route' },
    { id: 'aoi-editor', label: 'AOI Editor', icon: 'aoi' },
];

/* ─── Video thermal grid — frame + IDW heatmap + grid + split ─── */

/* ─── Thermal colormap LUT (navy → blue → cyan → green → yellow → red) ─── */

const THERMAL_LUT: Array<[number, number, number]> = (() => {
    const stops: Array<{ t: number; r: number; g: number; b: number }> = [
        { t: 0.00, r: 0,   g: 0,   b: 80  },  // #000050 navy
        { t: 0.10, r: 0,   g: 0,   b: 140 },  // #00008c blue
        { t: 0.25, r: 0,   g: 40,  b: 200 },  // #0028c8 medium blue
        { t: 0.40, r: 0,   g: 160, b: 160 },  // #00a0a0 teal
        { t: 0.50, r: 0,   g: 200, b: 60  },  // #00c83c green
        { t: 0.62, r: 100, g: 220, b: 0   },  // #64dc00 lime
        { t: 0.74, r: 220, g: 220, b: 0   },  // #dcdc00 yellow
        { t: 0.85, r: 255, g: 140, b: 0   },  // #ff8c00 orange
        { t: 0.95, r: 255, g: 40,  b: 0   },  // #ff2800 red-orange
        { t: 1.00, r: 255, g: 0,   b: 0   },  // #ff0000 red
    ];
    const lut: Array<[number, number, number]> = [];
    for (let i = 0; i < 256; i++) {
        const t = i / 255;
        let lo = 0;
        for (let s = 1; s < stops.length; s++) {
            if (stops[s].t >= t) { lo = s - 1; break; }
        }
        const hi = Math.min(lo + 1, stops.length - 1);
        const range = stops[hi].t - stops[lo].t;
        const f = range > 0 ? (t - stops[lo].t) / range : 0;
        lut.push([
            Math.round(stops[lo].r + (stops[hi].r - stops[lo].r) * f),
            Math.round(stops[lo].g + (stops[hi].g - stops[lo].g) * f),
            Math.round(stops[lo].b + (stops[hi].b - stops[lo].b) * f),
        ]);
    }
    return lut;
})();

/* ─── IDW interpolation → thermal ImageData ─── */

const renderThermalImageData = (
    sparse: HeatmapPoint[],
    canvasW: number,
    canvasH: number,
    alpha: number,
): ImageData => {
    const DS = 8; // downsample factor (8x for speed)
    const dw = Math.ceil(canvasW / DS);
    const dh = Math.ceil(canvasH / DS);

    // Pre-compute absolute positions
    const pts = sparse.map(p => ({
        x: (p.x / 100) * canvasW,
        y: (p.y / 100) * canvasH,
        v: p.value ?? 0.5,
    }));

    // IDW at downsampled resolution — full canvas coverage
    const grid = new Float32Array(dw * dh);
    let maxVal = 0;
    for (let row = 0; row < dh; row++) {
        for (let col = 0; col < dw; col++) {
            const px = (col + 0.5) * DS;
            const py = (row + 0.5) * DS;
            let num = 0, den = 0;
            for (const pt of pts) {
                const dx = px - pt.x;
                const dy = py - pt.y;
                const distSq = dx * dx + dy * dy;
                if (distSq < 1) { num = pt.v; den = 1; break; }
                const w = 1 / Math.pow(distSq, 1.25);
                num += w * pt.v;
                den += w;
            }
            const val = den > 0 ? num / den : 0;
            grid[row * dw + col] = val;
            if (val > maxVal) maxVal = val;
        }
    }

    // Normalize + gamma for contrast
    const scale = maxVal > 0 ? 1 / maxVal : 1;
    const GAMMA = 2.0;

    // Multi-pass box blur on downsampled grid — eliminates grid artifacts
    const boxBlur = (src: Float32Array, dst: Float32Array, w2: number, h2: number) => {
        for (let row = 0; row < h2; row++) {
            for (let col = 0; col < w2; col++) {
                let sum = 0, count = 0;
                for (let dr = -1; dr <= 1; dr++) {
                    for (let dc = -1; dc <= 1; dc++) {
                        const nr = row + dr;
                        const nc = col + dc;
                        if (nr >= 0 && nr < h2 && nc >= 0 && nc < w2) {
                            sum += src[nr * w2 + nc];
                            count++;
                        }
                    }
                }
                dst[row * w2 + col] = sum / count;
            }
        }
    };
    const tmp = new Float32Array(dw * dh);
    const blurred = new Float32Array(dw * dh);
    boxBlur(grid, tmp, dw, dh);
    boxBlur(tmp, blurred, dw, dh);
    boxBlur(blurred, tmp, dw, dh);
    boxBlur(tmp, blurred, dw, dh);
    boxBlur(blurred, tmp, dw, dh);
    boxBlur(tmp, blurred, dw, dh);

    // Bilinear upsample + colormap → ImageData
    const imgData = new ImageData(canvasW, canvasH);
    const d = imgData.data;
    const a = Math.round(alpha * 255);

    for (let y = 0; y < canvasH; y++) {
        for (let x = 0; x < canvasW; x++) {
            const gx = Math.min((x / DS) - 0.5, dw - 1.001);
            const gy = Math.min((y / DS) - 0.5, dh - 1.001);
            const gx0 = Math.max(0, Math.floor(gx));
            const gy0 = Math.max(0, Math.floor(gy));
            const gx1 = Math.min(gx0 + 1, dw - 1);
            const gy1 = Math.min(gy0 + 1, dh - 1);
            const fx = gx - gx0;
            const fy = gy - gy0;

            const v00 = blurred[gy0 * dw + gx0];
            const v10 = blurred[gy0 * dw + gx1];
            const v01 = blurred[gy1 * dw + gx0];
            const v11 = blurred[gy1 * dw + gx1];
            const raw = (v00 * (1 - fx) * (1 - fy) + v10 * fx * (1 - fy) +
                v01 * (1 - fx) * fy + v11 * fx * fy) * scale;
            const intensity = Math.pow(raw, GAMMA);

            const idx = Math.min(255, Math.max(0, Math.round(intensity * 255)));
            const [r, g, b] = THERMAL_LUT[idx];
            const off = (y * canvasW + x) * 4;
            d[off] = r;
            d[off + 1] = g;
            d[off + 2] = b;
            d[off + 3] = a;
        }
    }
    return imgData;
};

/* ─── Per-frame heatmap resolution (pure, exported for tests) ─── */

/**
 * Returns the index of the last frame whose timestamp ≤ currentTime.
 * Falls back to 0 when no frame qualifies.
 */
export const resolveFrameIndex = (
    frames: { timestamp: number }[],
    currentTime: number,
): number => frames.reduce<number>(
    (best, frame, idx) => (frame.timestamp <= currentTime ? idx : best),
    0,
);

/**
 * Modulates accumulated heatmap intensity using the current frame's hotspots.
 *
 * The accumulated map provides stable spatial coverage (~1700 pts).
 * Per-frame hotspots boost nearby accumulated points and attenuate distant ones,
 * so the overall shape stays clean but "hot zones" shift over time.
 *
 * @param baseAttenuation - minimum multiplier for points far from any frame hotspot (0..1, default 0.25)
 * @param boostRadius     - distance in % units within which frame hotspots boost accumulated points (default 12)
 */
export const modulateAccumulatedByFrame = (
    accumulated: HeatmapPoint[],
    frames: VideoFrameData[],
    centerIdx: number,
    baseAttenuation = 0.25,
    boostRadius = 12,
): HeatmapPoint[] => {
    const framePoints = frames[centerIdx]?.heatmapData ?? [];
    // No per-frame data → return accumulated unmodified
    if (framePoints.length === 0) return accumulated;

    const radiusSq = boostRadius * boostRadius;

    return accumulated.map(ap => {
        // Find closest frame hotspot (squared distance in % space)
        const minDistSq = framePoints.reduce(
            (best, fp) => {
                const dx = ap.x - fp.x;
                const dy = ap.y - fp.y;
                return Math.min(best, dx * dx + dy * dy);
            },
            Infinity,
        );
        // Gaussian-like falloff: 1.0 at hotspot center → baseAttenuation far away
        const proximity = Math.max(0, 1 - minDistSq / radiusSq);
        const multiplier = baseAttenuation + (1 - baseAttenuation) * proximity;
        return {
            x: ap.x,
            y: ap.y,
            value: (ap.value ?? 0.5) * multiplier,
        };
    });
};

const THERMAL_GRID_OPTIONS = [
    { label: '2×2', cols: 2, rows: 2 },
    { label: '3×3', cols: 3, rows: 3 },
    { label: '4×4', cols: 4, rows: 4 },
    { label: '5×5', cols: 5, rows: 5 },
];

const VideoThermalGrid = ({
    heatmapData,
    videoUrl,
    videoFrames,
    thermalMap,
    thermalMapWidth,
    thermalMapHeight,
}: {
    heatmapData: HeatmapPoint[];
    videoUrl: string;
    videoFrames: VideoFrameData[];
    thermalMap?: string;
    thermalMapWidth?: number;
    thermalMapHeight?: number;
}) => {
    const [gridSize, setGridSize] = useState(1);
    const [splitPct, setSplitPct] = useState(100);
    const [dragging, setDragging] = useState(false);
    const [videoRect, setVideoRect] = useState<{ left: number; top: number; width: number; height: number } | null>(null);
    const [activeFrameIdx, setActiveFrameIdx] = useState(0);

    // Decode dense thermal map once (stable across renders)
    const decodedThermalMap = useMemo(
        () => thermalMap ? decodeThermalMap(thermalMap) : null,
        [thermalMap],
    );
    console.log('[VideoThermalGrid] thermalMap received:', { hasThermalMap: !!thermalMap, length: thermalMap?.length, thermalMapWidth, thermalMapHeight, decodedLength: decodedThermalMap?.length });
    const hasDenseMap = decodedThermalMap !== null && !!thermalMapWidth && !!thermalMapHeight;

    // Precompute FLIR LUT (stable reference)
    const flirLut = useMemo(() => buildColorLUT(REBALANCED_THERMAL_STOPS), []);

    // Per-frame modulated data (for grid percentages only — NOT for thermal IDW)
    const activeHeatmapData = useMemo(
        () => modulateAccumulatedByFrame(heatmapData, videoFrames, activeFrameIdx),
        [heatmapData, videoFrames, activeFrameIdx],
    );

    const containerRef = useRef<HTMLDivElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const gridCanvasRef = useRef<HTMLCanvasElement>(null);

    const { cols, rows } = THERMAL_GRID_OPTIONS[gridSize];

    // Divider drag — controls how much heatmap is visible
    useEffect(() => {
        if (!dragging) return;
        const onMove = (e: MouseEvent) => {
            const video = videoRef.current;
            if (!video) return;
            const vRect = video.getBoundingClientRect();
            setSplitPct(Math.max(5, Math.min(100, ((e.clientX - vRect.left) / vRect.width) * 100)));
        };
        const onUp = () => setDragging(false);
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
        return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
    }, [dragging]);

    // Track the actual video CONTENT area (excluding internal letterbox bars)
    const updateVideoRect = useCallback(() => {
        const video = videoRef.current;
        const container = containerRef.current;
        if (!video || !container || !video.videoWidth) return;

        const cRect = container.getBoundingClientRect();
        const elemW = video.offsetWidth;
        const elemH = video.offsetHeight;
        const nativeAR = video.videoWidth / video.videoHeight;
        const elemAR = elemW / elemH;

        // Content area within the <video> element (object-fit: contain behavior)
        let contentW: number, contentH: number, offsetX: number, offsetY: number;
        if (elemAR > nativeAR) {
            contentH = elemH;
            contentW = elemH * nativeAR;
            offsetX = (elemW - contentW) / 2;
            offsetY = 0;
        } else {
            contentW = elemW;
            contentH = elemW / nativeAR;
            offsetX = 0;
            offsetY = (elemH - contentH) / 2;
        }

        const vRect = video.getBoundingClientRect();
        setVideoRect({
            left: (vRect.left - cRect.left) + offsetX,
            top: (vRect.top - cRect.top) + offsetY,
            width: contentW,
            height: contentH,
        });
    }, []);

    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;
        const ro = new ResizeObserver(() => updateVideoRect());
        ro.observe(video);
        return () => ro.disconnect();
    }, [updateVideoRect]);

    // ─── Track video time → resolve active prediction frame ───

    const handleTimeUpdate = useCallback(() => {
        const video = videoRef.current;
        const time = video?.currentTime ?? 0;
        const idx = resolveFrameIndex(videoFrames, time);
        setActiveFrameIdx(prev => (prev === idx ? prev : idx));
    }, [videoFrames]);

    // ─── Layer 1: Base thermal (accumulated IDW — built ONCE, expensive) ───

    // ─── Layer 1: Base thermal ImageData (accumulated IDW — built ONCE) ───

    const baseThermalDataRef = useRef<ImageData | null>(null);
    const thermalCacheRef = useRef<HTMLCanvasElement | null>(null);
    const gridOverlayCacheRef = useRef<HTMLCanvasElement | null>(null);
    const animRef = useRef<number | null>(null);
    const canvasDimsRef = useRef<{ w: number; h: number }>({ w: 0, h: 0 });

    const buildBaseThermal = useCallback(() => {
        const video = videoRef.current;
        const noData = heatmapData.length === 0 && !hasDenseMap;
        const noVideo = !video || !video.videoWidth;
        const skip = noData || noVideo;
        // eslint-disable-next-line @typescript-eslint/no-unused-expressions
        skip || (() => {
            const w = video!.videoWidth;
            const h = video!.videoHeight;

            // Dense map path: direct FLIR colormap from full saliency array
            // Sparse path (fallback): IDW interpolation from point array
            baseThermalDataRef.current = hasDenseMap && decodedThermalMap && thermalMapWidth && thermalMapHeight
                ? renderSaliencyMapDirect(decodedThermalMap, thermalMapWidth, thermalMapHeight, w, h, flirLut, sigmoidContrast, 0.85)
                : renderThermalImageData(heatmapData, w, h, 0.55);
            canvasDimsRef.current = { w, h };

            // Init canvas dimensions once
            const canvas = gridCanvasRef.current;
            // eslint-disable-next-line @typescript-eslint/no-unused-expressions
            canvas && (() => { canvas.width = w; canvas.height = h; })();
        })();
    }, [heatmapData, hasDenseMap, decodedThermalMap, thermalMapWidth, thermalMapHeight, flirLut]);

    // ─── Layer 2: Modulated thermal (per frame — clones base, multiplies alpha by proximity) ───

    const buildModulatedThermal = useCallback(() => {
        const base = baseThermalDataRef.current;
        if (!base) return;

        const { w, h } = canvasDimsRef.current;
        const framePoints = videoFrames[activeFrameIdx]?.heatmapData ?? [];

        // Clone base ImageData
        const modulated = new ImageData(new Uint8ClampedArray(base.data), base.width, base.height);

        // No frame hotspots → use base as-is (full accumulated)
        if (framePoints.length > 0) {
            // Pre-compute hotspot positions in pixel space
            const hotspots = framePoints.map(fp => ({
                px: (fp.x / 100) * w,
                py: (fp.y / 100) * h,
                v: fp.value ?? 0.5,
            }));
            const boostRadius = Math.max(40, Math.min(w, h) * 0.12);
            const radiusSq = boostRadius * boostRadius;
            const BASE_ATT = 0.25;

            // Modulate alpha per pixel — iterate at 4x step for speed, interpolate neighbors
            const d = modulated.data;
            const STEP = 4;
            for (let y = 0; y < h; y += STEP) {
                for (let x = 0; x < w; x += STEP) {
                    // Find min squared distance to any hotspot
                    let minDistSq = Infinity;
                    for (const hs of hotspots) {
                        const dx = x - hs.px;
                        const dy = y - hs.py;
                        const dsq = dx * dx + dy * dy;
                        if (dsq < minDistSq) minDistSq = dsq;
                    }
                    const proximity = Math.max(0, 1 - minDistSq / radiusSq);
                    const multiplier = BASE_ATT + (1 - BASE_ATT) * proximity;

                    // Apply to STEP×STEP block
                    const yEnd = Math.min(y + STEP, h);
                    const xEnd = Math.min(x + STEP, w);
                    for (let by = y; by < yEnd; by++) {
                        for (let bx = x; bx < xEnd; bx++) {
                            const off = (by * w + bx) * 4 + 3; // alpha channel
                            d[off] = Math.round(d[off] * multiplier);
                        }
                    }
                }
            }
        }

        // Put on thermal cache canvas
        const tc = thermalCacheRef.current ?? document.createElement('canvas');
        tc.width = w;
        tc.height = h;
        tc.getContext('2d')?.putImageData(modulated, 0, 0);
        thermalCacheRef.current = tc;
    }, [videoFrames, activeFrameIdx]);

    // ─── Layer 3: Grid lines + labels (per frame — updated percentages) ───

    const buildGridOverlay = useCallback(() => {
        const video = videoRef.current;
        const data = activeHeatmapData;
        if (!video || !video.videoWidth || data.length === 0) return;

        const w = video.videoWidth;
        const h = video.videoHeight;
        const gc = document.createElement('canvas');
        gc.width = w;
        gc.height = h;
        const gctx = gc.getContext('2d');
        if (!gctx) return;

        const cellW = w / cols;
        const cellH = h / rows;
        gctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        gctx.lineWidth = 2;
        Array.from({ length: rows - 1 }, (_, i) => (i + 1) * cellH).forEach(y => {
            gctx.beginPath(); gctx.moveTo(0, y); gctx.lineTo(w, y); gctx.stroke();
        });
        Array.from({ length: cols - 1 }, (_, i) => (i + 1) * cellW).forEach(x => {
            gctx.beginPath(); gctx.moveTo(x, 0); gctx.lineTo(x, h); gctx.stroke();
        });
        const pcts = computeGridPercentages(data, cols, rows);
        const fontSize = Math.max(14, Math.min(28, Math.min(cellW, cellH) * 0.18));
        gctx.font = `bold ${fontSize}px monospace`;
        gctx.textAlign = 'center';
        gctx.textBaseline = 'bottom';
        gctx.shadowColor = 'rgba(0,0,0,1)';
        gctx.shadowBlur = 6;
        gctx.fillStyle = '#00ff00';
        Array.from({ length: rows * cols }, (_, idx) => idx).forEach(idx => {
            const ri = Math.floor(idx / cols);
            const ci = idx % cols;
            gctx.fillText(
                `${String.fromCharCode(65 + ci)}${ri + 1}: ${pcts[idx]}%`,
                ci * cellW + cellW / 2,
                (ri + 1) * cellH - 8,
            );
        });
        gctx.shadowBlur = 0;
        gridOverlayCacheRef.current = gc;
    }, [activeHeatmapData, cols, rows]);

    // ─── Composite: video + thermal + grid — runs every rAF frame ───

    const compositeFrame = useCallback(() => {
        const video = videoRef.current;
        const canvas = gridCanvasRef.current;
        if (!video || !canvas || !video.videoWidth) return;

        const { w, h } = canvasDimsRef.current;
        if (!w) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.drawImage(video, 0, 0, w, h);
        if (thermalCacheRef.current) ctx.drawImage(thermalCacheRef.current, 0, 0);
        if (gridOverlayCacheRef.current) ctx.drawImage(gridOverlayCacheRef.current, 0, 0);
    }, []);

    // ─── Animation loop: redraws canvas while video plays ───

    const startLoop = useCallback(() => {
        const loop = () => {
            compositeFrame();
            animRef.current = requestAnimationFrame(loop);
        };
        animRef.current = requestAnimationFrame(loop);
    }, [compositeFrame]);

    const stopLoop = useCallback(() => {
        if (animRef.current) cancelAnimationFrame(animRef.current);
        animRef.current = null;
    }, []);

    useEffect(() => {
        const video = videoRef.current;
        // Guard: no video element → nothing to wire
        if (!video) return;
        const onPlay = () => startLoop();
        const onPause = () => { stopLoop(); compositeFrame(); };
        const onSeeked = () => { handleTimeUpdate(); compositeFrame(); };
        const onTimeUpdate = () => handleTimeUpdate();
        video.addEventListener('play', onPlay);
        video.addEventListener('pause', onPause);
        video.addEventListener('seeked', onSeeked);
        video.addEventListener('ended', onPause);
        video.addEventListener('timeupdate', onTimeUpdate);
        return () => {
            stopLoop();
            video.removeEventListener('play', onPlay);
            video.removeEventListener('pause', onPause);
            video.removeEventListener('seeked', onSeeked);
            video.removeEventListener('ended', onPause);
            video.removeEventListener('timeupdate', onTimeUpdate);
        };
    }, [startLoop, stopLoop, compositeFrame, handleTimeUpdate]);

    // Cleanup on unmount
    useEffect(() => { return () => stopLoop(); }, [stopLoop]);

    // ─── Init: build base thermal once on video load ───

    const handleVideoLoaded = useCallback(() => {
        updateVideoRect();
        buildBaseThermal();
        buildModulatedThermal();
        buildGridOverlay();
        compositeFrame();
    }, [updateVideoRect, buildBaseThermal, buildModulatedThermal, buildGridOverlay, compositeFrame]);

    // Rebuild base thermal only when accumulated data changes (rare)
    useEffect(() => { buildBaseThermal(); }, [buildBaseThermal]);

    // Rebuild modulated thermal on frame change (cheap alpha multiply)
    useEffect(() => { buildModulatedThermal(); compositeFrame(); }, [buildModulatedThermal, compositeFrame]);

    // Rebuild grid overlay on frame change or grid size change (cheap)
    useEffect(() => { buildGridOverlay(); compositeFrame(); }, [buildGridOverlay, compositeFrame]);

    return (
        <div ref={containerRef} className="absolute inset-0 flex items-center justify-center bg-black select-none">
            {/* Video — with native controls for play/pause/seek */}
            <video
                ref={videoRef}
                src={videoUrl}
                className="max-w-full max-h-full block"
                controls
                muted
                playsInline
                preload="metadata"
                onLoadedData={handleVideoLoaded}
            />

            {/* Grid canvas — right side thermal heatmap */}
            <canvas
                ref={gridCanvasRef}
                className="absolute pointer-events-none"
                style={videoRect ? {
                    left: videoRect.left,
                    top: videoRect.top,
                    width: videoRect.width,
                    height: videoRect.height,
                    clipPath: `inset(0 ${100 - splitPct}% 0 0)`,
                } : { display: 'none' }}
            />

            {/* Draggable divider — controls heatmap reveal */}
            {videoRect && (
                <div
                    className="absolute z-10 flex items-center"
                    style={{
                        left: videoRect.left + videoRect.width * (splitPct / 100),
                        top: videoRect.top,
                        height: videoRect.height,
                        transform: 'translateX(-50%)',
                    }}
                >
                    <div
                        className="w-5 h-full cursor-col-resize flex items-center justify-center group"
                        onMouseDown={(e) => { e.preventDefault(); setDragging(true); }}
                    >
                        <div className="w-0.5 h-full bg-white/70 group-hover:bg-white transition-colors" />
                        <div className="absolute w-6 h-10 rounded-full bg-white/80 border-2 border-gray-400 flex items-center justify-center shadow-lg cursor-col-resize">
                            <svg className="w-3 h-3 text-gray-500" viewBox="0 0 6 10" fill="currentColor">
                                <circle cx="1" cy="2" r="0.8" /><circle cx="1" cy="5" r="0.8" /><circle cx="1" cy="8" r="0.8" />
                                <circle cx="5" cy="2" r="0.8" /><circle cx="5" cy="5" r="0.8" /><circle cx="5" cy="8" r="0.8" />
                            </svg>
                        </div>
                    </div>
                </div>
            )}

            {/* Grid size selector */}
            <div className="absolute bottom-2 right-2 z-10 flex items-center gap-1 bg-black/60 rounded px-2 py-1">
                {THERMAL_GRID_OPTIONS.map((opt, i) => (
                    <button
                        key={opt.label}
                        onClick={() => setGridSize(i)}
                        className={cn(
                            'px-1.5 py-0.5 text-[10px] font-medium rounded transition-colors',
                            i === gridSize ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white',
                        )}
                    >
                        {opt.label}
                    </button>
                ))}
            </div>
        </div>
    );
};

/* ─── Props ─── */

interface AttentionPredictionCardProps {
    imageUrl: string;
    title: string;
    heatmapData?: HeatmapPoint[];
    onDelete?: () => void;
    isDeleting?: boolean;
    className?: string;
    researchId?: string;
    stimulusMediaId?: string;
    isVideo?: boolean;
    videoFrames?: VideoFrameData[];
    aiAnalysis?: AiAnalysisResult;
    pendingImportAois?: AiAnalysisResult['autoAois'];
    onImportAoisDone?: () => void;
    onAddMore?: () => void;
    onRunAnalysis?: (manualAois: ManualAOI[]) => void;
    onRunPrediction?: (manualAois: ManualAOI[]) => void;
    isPredicting?: boolean;
    predictElapsed?: number;
    predictionError?: string;
    initialTab?: TabId;
    workflowFocusTab?: TabId;
    onWorkflowFocusTabHandled?: () => void;
    onOpenCriteria?: () => void;
    isCriteriaDrawerOpen?: boolean;
    aoiSkipped?: boolean;
    onAoiSkippedChange?: (skipped: boolean) => void;
    onAoiListChange?: (aois: ManualAOI[]) => void;
    autoPresets?: { blur: number; opacity: number; threshold: number };
    griddedAOIs?: Array<{ label: string; x: number; y: number; width: number; height: number; attention: number; rank: number }>;
    isAnalyzing?: boolean;
    analyzeElapsed?: number;
    headerExtra?: ReactNode;
    onProcessVideo?: () => void;
    videoProgress?: { phase: string; current: number; total: number; message: string } | null;
    onDismissVideoProgress?: () => void;
    thermalMap?: string;
    thermalMapWidth?: number;
    thermalMapHeight?: number;
    /** Pre-rendered heatmap video URL from DINO server-side render */
    heatmapVideoUrl?: string;
    /** Overlay-only video URL (heatmap without original) */
    overlayOnlyUrl?: string;
    /** Per-frame grid metadata from DINO render */
    gridMetadata?: Array<{ timestamp: number; cells: Array<{ label: string; percentage: number }> }>;
}

/* ─── Main Card ─── */

export const AttentionPredictionCard = ({
    imageUrl,
    title,
    heatmapData = [],
    onDelete,
    isDeleting = false,
    className,
    researchId,
    stimulusMediaId,
    isVideo = false,
    videoFrames = [],
    aiAnalysis,
    pendingImportAois,
    onImportAoisDone,
    onAddMore,
    onRunAnalysis,
    onRunPrediction,
    isPredicting = false,
    predictElapsed = 0,
    predictionError,
    initialTab,
    workflowFocusTab,
    onWorkflowFocusTabHandled,
    isCriteriaDrawerOpen = false,
    aoiSkipped = false,
    onAoiSkippedChange,
    onAoiListChange,
    autoPresets,
    griddedAOIs,
    isAnalyzing = false,
    analyzeElapsed = 0,
    headerExtra,
    onProcessVideo: _onProcessVideo,
    videoProgress,
    onDismissVideoProgress: _onDismissVideoProgress,
    thermalMap,
    thermalMapWidth,
    thermalMapHeight,
    heatmapVideoUrl,
    overlayOnlyUrl,
    gridMetadata: _gridMetadata,
}: AttentionPredictionCardProps) => {
    /* ── Download helper ── */
    const downloadVideo = useCallback((url: string, filename: string) => {
        fetch(url)
            .then(r => r.blob())
            .then(blob => {
                const ext = url.split('.').pop() || 'webm';
                const a = document.createElement('a');
                a.href = URL.createObjectURL(blob);
                a.download = `${filename}.${ext}`;
                a.click();
                URL.revokeObjectURL(a.href);
            })
            .catch(() => window.open(url, '_blank'));
    }, []);

    /* ── Tab & layer state ── */
    const [activeTab, setActiveTab] = useState<TabId>(initialTab ?? 'original');
    const [layers, setLayers] = useState<StimulusLayers>({
        heatmap: false, aiAois: false, manualAois: false, gaze: false,
    });
    const layerContextRef = useRef<AttentionLayerContext>({
        hasHeatmap: false, hasGazeRoutes: false, hasManualAois: false, hasAutoAois: false,
    });
    const overlayAvailabilityRef = useRef({ heatmap: false, gaze: false });
    const loadedAoiCountRef = useRef(0);

    /* ── AOI drawing state ── */
    const [showSkipConfirm, setShowSkipConfirm] = useState(false);
    const [skipConfirmAction, setSkipConfirmAction] = useState<'gate-only' | 'predict'>('gate-only');
    const [showNameModal, setShowNameModal] = useState(false);
    const [pendingRect, setPendingRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
    const [pendingLabel, setPendingLabel] = useState('');
    const [selectedAoiId, setSelectedAoiId] = useState<string | null>(null);
    const [editingLabelId, setEditingLabelId] = useState<string | null>(null);
    const [editingLabelValue, setEditingLabelValue] = useState('');
    const [drawingAoi, setDrawingAoi] = useState(false);
    const [aoiStart, setAoiStart] = useState<{ x: number; y: number } | null>(null);
    const [aoiCurrent, setAoiCurrent] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
    const [aoiList, setAoiList] = useState<ManualAOI[]>([]);
    const [isSavingAois, setIsSavingAois] = useState(false);
    const [activeGridPreset, setActiveGridPreset] = useState('Manual');
    const aoiContainerRef = useRef<HTMLDivElement>(null);

    /** Track AOI count at last predict to detect staleness */
    const aoiCountAtPredict = useRef<number | null>(null);

    /* ── Heatmap settings state ── */
    const [showSettings, setShowSettings] = useState(false);
    const [showFullscreen, setShowFullscreen] = useState(false);
    const heatmapViewSnapshotRef = useRef<HeatmapViewSettings | null>(null);
    const [settings, setSettings] = useState<HeatmapSettings>(() => {
        if (autoPresets) {
            return { blur: autoPresets.blur, opacity: autoPresets.opacity, threshold: autoPresets.threshold, preset: 'Precise' };
        }
        return { ...DEFAULT_SETTINGS };
    });
    const [mapMode, setMapMode] = useState<HeatmapMapMode>('classic');
    const [spotlightSettings, setSpotlightSettings] = useState<SpotlightSettings>({ ...DEFAULT_SPOTLIGHT_SETTINGS });
    const [coldSettings, setColdSettings] = useState<ColdMapSettings>({ ...DEFAULT_COLD_MAP_SETTINGS });

    /* ── Gaze state ── */
    const [visibleRoutes, setVisibleRoutes] = useState<Set<string>>(new Set(['typical-scan', 'group-scan', 'novelty-search']));
    const [gazeMode, setGazeMode] = useState<'static' | 'animated'>('static');

    /* ── Refs ── */
    const tabContentRef = useRef<HTMLDivElement>(null);

    /** Reactive viewport height — tracks window resize with debounce */
    const stableMaxHeight = useViewportHeight();

    /* ── Tab management ── */

    const applyTabLayers = useCallback((tabId: TabId, context: AttentionLayerContext): void => {
        setLayers(buildAttentionLayerPreset(tabId, context));
    }, []);

    useEffect(() => {
        if (initialTab) {
            setActiveTab(initialTab);
            applyTabLayers(initialTab, layerContextRef.current);
        }
    }, [initialTab, applyTabLayers]);

    const handleTabChange = useCallback((tabId: TabId): void => {
        setActiveTab(tabId);
        applyTabLayers(tabId, layerContextRef.current);
    }, [applyTabLayers]);

    useEffect(() => {
        if (!workflowFocusTab) return;
        handleTabChange(workflowFocusTab);
        onWorkflowFocusTabHandled?.();
    }, [workflowFocusTab, handleTabChange, onWorkflowFocusTabHandled]);

    const toggleLayer = useCallback((key: keyof StimulusLayers): void => {
        setLayers(prev => ({ ...prev, [key]: !prev[key] }));
    }, []);

    const applyCompositeLayers = useCallback((): void => {
        applyTabLayers(activeTab, layerContextRef.current);
    }, [activeTab, applyTabLayers]);

    /* ── Stimulus image cache ── */
    useEffect(() => {
        if (!imageUrl || isVideo) return;
        void loadCachedStimulusImage(imageUrl);
    }, [imageUrl, isVideo]);

    /* ── Video thumbnail for AOI Editor ── */
    const [videoThumbnailUrl, setVideoThumbnailUrl] = useState<string | null>(null);
    useEffect(() => {
        if (!isVideo || !imageUrl) return;
        let revoked = false;
        void extractVideoThumbnail(imageUrl).then((url) => {
            if (!revoked) setVideoThumbnailUrl(url);
        });
        return () => {
            revoked = true;
            setVideoThumbnailUrl((prev) => {
                if (prev) URL.revokeObjectURL(prev);
                return null;
            });
        };
    }, [isVideo, imageUrl]);

    /* ── Tabs filter ── */
    const tabs = useMemo(() => {
        return BASE_TABS.filter(tab => {
            if (tab.id === 'gaze-paths') return !isVideo && aiAnalysis?.gazePath && aiAnalysis.gazePath.length > 0;
            return true;
        });
    }, [aiAnalysis, isVideo]);

    /* ── Auto-presets sync ── */
    useEffect(() => {
        if (autoPresets) {
            setSettings({ blur: autoPresets.blur, opacity: autoPresets.opacity, threshold: autoPresets.threshold, preset: 'Precise' });
        }
    }, [autoPresets]);

    /* ── AOI: global mouse handlers for drawing ── */
    useEffect(() => {
        if (!drawingAoi || !aoiStart) return;
        const container = aoiContainerRef.current;
        if (!container) return;

        const handleMouseMove = (e: MouseEvent) => {
            const pos = getMousePercent(e, container);
            setAoiCurrent({
                x: Math.min(aoiStart.x, pos.x),
                y: Math.min(aoiStart.y, pos.y),
                w: Math.abs(pos.x - aoiStart.x),
                h: Math.abs(pos.y - aoiStart.y),
            });
        };

        const handleMouseUp = () => {
            setAoiCurrent(prev => {
                if (prev && prev.w > 1 && prev.h > 1) {
                    setPendingRect(prev);
                    setPendingLabel(`Zona ${aoiList.length + 1}`);
                    setSelectedAoiId(null);
                    setShowNameModal(true);
                }
                return null;
            });
            setAoiStart(null);
            setDrawingAoi(false);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [drawingAoi, aoiStart]); // eslint-disable-line react-hooks/exhaustive-deps

    /* ── AOI: load persisted ── */
    useEffect(() => {
        if (!researchId || !stimulusMediaId) return;
        researchService.getById(researchId).then(res => {
            const s = (res.research.settings as Record<string, unknown>) || {};
            const stimuli = (s.stimuli as Array<Record<string, unknown>>) || [];
            const stimulus = stimuli.find(st => st.mediaId === stimulusMediaId);
            const savedAois = normalizeManualAois(stimulus?.aois);
            setAoiList(savedAois);
        }).catch(() => { /* ignore load errors */ });
    }, [researchId, stimulusMediaId]);

    useEffect(() => {
        onAoiListChange?.(aoiList);
    }, [aoiList, onAoiListChange]);

    /* ── AOI: persist ── */
    const pendingAoisRef = useRef<ManualAOI[] | null>(null);
    const saveInFlightRef = useRef(false);

    const persistAois = useCallback(async (aois: ManualAOI[]) => {
        if (!researchId || !stimulusMediaId) return;
        pendingAoisRef.current = aois;
        if (saveInFlightRef.current) return;
        saveInFlightRef.current = true;
        setIsSavingAois(true);
        try {
            while (pendingAoisRef.current !== null) {
                const toSave = pendingAoisRef.current;
                pendingAoisRef.current = null;
                const res = await researchService.getById(researchId);
                const s = (res.research.settings as Record<string, unknown>) || {};
                const stimuli = (s.stimuli as Array<Record<string, unknown>>) || [];
                const updatedStimuli = stimuli.map(st => {
                    if (st.mediaId === stimulusMediaId) return { ...st, aois: toSave };
                    return st;
                });
                await researchService.update(researchId, {
                    settings: { ...s, stimuli: updatedStimuli },
                });
            }
        } catch {
            // Best-effort persistence
        } finally {
            saveInFlightRef.current = false;
            setIsSavingAois(false);
        }
    }, [researchId, stimulusMediaId]);

    const getMousePercent = (e: React.MouseEvent | MouseEvent, el: HTMLElement) => {
        const rect = el.getBoundingClientRect();
        return {
            x: Math.min(100, Math.max(0, ((e.clientX - rect.left) / rect.width) * 100)),
            y: Math.min(100, Math.max(0, ((e.clientY - rect.top) / rect.height) * 100)),
        };
    };

    /* ── AOI: CRUD ── */

    const confirmPendingAoi = useCallback(() => {
        if (!pendingRect) return;
        const label = pendingLabel.trim() || `Zona ${aoiList.length + 1}`;
        const aoi: ManualAOI = clampAoiBounds({
            id: `aoi_${crypto.randomUUID()}`,
            label,
            x: pendingRect.x, y: pendingRect.y,
            width: pendingRect.w, height: pendingRect.h,
            source: 'manual',
        });
        const updated = [...aoiList, aoi];
        setAoiList(updated);
        void persistAois(updated);
        setShowNameModal(false);
        setPendingRect(null);
        setPendingLabel('');
        setSelectedAoiId(aoi.id);
    }, [aoiList, pendingLabel, pendingRect, persistAois]);

    const videoDuration = useMemo(() => {
        if (!isVideo || videoFrames.length === 0) return 0;
        const lastTs = videoFrames[videoFrames.length - 1]?.timestamp ?? 0;
        return lastTs + 2; // +2s for the interval after last frame
    }, [isVideo, videoFrames]);

    const handleAoiTimeRangeChange = useCallback((aoiId: string, timeRange: { startTime: number; endTime: number }) => {
        const updated = aoiList.map(a => a.id === aoiId ? { ...a, timeRange } : a);
        setAoiList(updated);
        void persistAois(updated);
    }, [aoiList, persistAois]);

    const handleGridPresetChange = useCallback((preset: { label: string; cols: number; rows: number }) => {
        setActiveGridPreset(preset.label);
        if (preset.cols === 0) {
            // "Manual" selected — clear grid AOIs but keep manual ones
            const manualOnly = aoiList.filter(a => a.source !== 'imported-grid');
            setAoiList(manualOnly);
            void persistAois(manualOnly);
            return;
        }
        const gridAois = generateGridAois(preset.cols, preset.rows);
        setAoiList(gridAois);
        void persistAois(gridAois);
    }, [aoiList, persistAois]);

    const updateAoi = useCallback((updated: ManualAOI) => {
        setAoiList(prev => {
            const next = prev.map(a => (a.id === updated.id ? updated : a));
            void persistAois(next);
            return next;
        });
    }, [persistAois]);

    const updateAoiLabel = useCallback((aoiId: string, label: string) => {
        const trimmed = label.trim() || 'Zona sin nombre';
        setAoiList(prev => {
            const next = prev.map(a => (a.id === aoiId ? { ...a, label: trimmed } : a));
            void persistAois(next);
            return next;
        });
        setEditingLabelId(null);
    }, [persistAois]);

    const removeAoi = useCallback((aoiId: string): void => {
        setAoiList((prev) => {
            const updated = prev.filter(a => a.id !== aoiId);
            void persistAois(updated);
            return updated;
        });
        setSelectedAoiId((prev) => (prev === aoiId ? null : prev));
    }, [persistAois]);

    /* ── AOI: keyboard delete ── */
    useEffect(() => {
        if (!selectedAoiId) return;
        const onKeyDown = (e: KeyboardEvent): void => {
            if (e.key !== 'Delete' && e.key !== 'Backspace') return;
            if (shouldBlockAoiKeyboardDelete({
                showNameModal, editingLabelId,
                criteriaDrawerOpen: isCriteriaDrawerOpen,
                target: e.target,
            })) return;
            removeAoi(selectedAoiId);
        };
        document.addEventListener('keydown', onKeyDown);
        return () => document.removeEventListener('keydown', onKeyDown);
    }, [selectedAoiId, showNameModal, editingLabelId, isCriteriaDrawerOpen, removeAoi]);

    useEffect(() => {
        if (isCriteriaDrawerOpen) setSelectedAoiId(null);
    }, [isCriteriaDrawerOpen]);

    /* ── Gates ── */
    const predictionGateOpen = canRunPredictionGate(aoiList.length, aoiSkipped);
    const analysisGateOpen = canRunAnalysisGate(heatmapData.length, aoiList.length, aoiSkipped, Boolean(heatmapVideoUrl));
    const hasHeatmap = heatmapData.length > 0 || Boolean(heatmapVideoUrl);

    const handlePredictClick = (): void => {
        if (!onRunPrediction) return;
        if (!predictionGateOpen) {
            setSkipConfirmAction('predict');
            setShowSkipConfirm(true);
            return;
        }
        aoiCountAtPredict.current = aoiList.length;
        // Switch to heatmap tab for video so user sees progress overlay
        if (isVideo) setActiveTab('heatmap');
        onRunPrediction(aoiList);
    };

    const handleAnalysisClick = (): void => {
        if (!onRunAnalysis || !analysisGateOpen) return;
        onRunAnalysis(aoiList);
    };

    /* ── Auto-switch to heatmap after prediction completes ── */
    const wasPredicting = useRef(false);
    useEffect(() => {
        const justFinished = wasPredicting.current && !isPredicting && hasHeatmap;
        wasPredicting.current = isPredicting;
        if (justFinished) handleTabChange('heatmap');
    }, [isPredicting, hasHeatmap, handleTabChange]);

    /* ── AOI import ── */
    const importedAiLabels = useMemo(
        () => new Set(aoiList.filter(a => a.source === 'imported-ai').map(a => a.label)),
        [aoiList],
    );

    const handleImportAois = useCallback((aiAois: AiAnalysisResult['autoAois']) => {
        const existingLabels = new Set(aoiList.map(a => a.label));
        const newAois: ManualAOI[] = aiAois
            .filter(a => !existingLabels.has(a.label))
            .map(a => ({
                id: `aoi_${crypto.randomUUID()}`,
                label: a.label,
                x: a.x, y: a.y, width: a.width, height: a.height,
                source: 'imported-ai' as const,
            }));
        if (newAois.length > 0) {
            const updated = [...aoiList, ...newAois];
            setAoiList(updated);
            void persistAois(updated);
        }
    }, [aoiList, persistAois]);

    useEffect(() => {
        if (!pendingImportAois || pendingImportAois.length === 0) return;
        handleImportAois(pendingImportAois);
        onImportAoisDone?.();
    }, [pendingImportAois]); // eslint-disable-line react-hooks/exhaustive-deps

    /* ── Computed data ── */
    const computedAois: AOIWithStats[] = useMemo(() => {
        const saliencyPoints = heatmapData.map(p => ({ x: p.x, y: p.y, value: p.value ?? 0 }));
        return aoiList.map(aoi => ({
            ...aoi,
            percentage: computeAoiAttentionShare(aoi, saliencyPoints),
        }));
    }, [aoiList, heatmapData]);

    const displayAutoAois = useMemo(
        () => isPredicting ? [] : reconcileAutoAoisWithManual(aoiList, aiAnalysis?.autoAois ?? []),
        [aoiList, aiAnalysis?.autoAois, isPredicting],
    );

    const anchoredHeatmapData = useMemo(
        () => heatmapData.map((point) => ({ x: point.x, y: point.y, value: point.value ?? 0 })),
        [heatmapData],
    );

    const gazeRoutes = useMemo(() => {
        if (!aiAnalysis?.gazePath?.length) return [];

        const anchorFixations = (fixations: AiAnalysisResult['gazePath']): AiAnalysisResult['gazePath'] => (
            anchoredHeatmapData.length > 0
                ? anchorGazePathToHeatmap(fixations, anchoredHeatmapData)
                : fixations
        );

        if (aiAnalysis.gazePathRoutes?.length) {
            return anchoredHeatmapData.length > 0
                ? anchorGazeRoutesToHeatmap(aiAnalysis.gazePathRoutes, anchoredHeatmapData)
                : aiAnalysis.gazePathRoutes;
        }

        return [{
            id: 'typical-scan',
            name: 'Typical Scan',
            description: 'Default predicted path',
            fixations: anchorFixations(aiAnalysis.gazePath),
        }];
    }, [aiAnalysis, anchoredHeatmapData]);

    /* ── Layer context sync ── */
    const layerContext = useMemo<AttentionLayerContext>(() => ({
        hasHeatmap,
        hasGazeRoutes: gazeRoutes.length > 0,
        hasManualAois: computedAois.length > 0,
        hasAutoAois: displayAutoAois.length > 0,
    }), [hasHeatmap, gazeRoutes.length, computedAois.length, displayAutoAois.length]);

    layerContextRef.current = layerContext;

    useEffect(() => {
        if (!stimulusMediaId) return;
        overlayAvailabilityRef.current = { heatmap: false, gaze: false };
        loadedAoiCountRef.current = 0;
        const tab = initialTab ?? 'original';
        const context: AttentionLayerContext = {
            hasHeatmap: heatmapData.length > 0,
            hasGazeRoutes: Boolean(aiAnalysis?.gazePath?.length),
            hasManualAois: false,
            hasAutoAois: (aiAnalysis?.autoAois?.length ?? 0) > 0,
        };
        setActiveTab(tab);
        applyTabLayers(tab, context);
        setGazeMode('static');
        setVisibleRoutes(new Set(['typical-scan', 'group-scan', 'novelty-search']));
    }, [stimulusMediaId, initialTab, applyTabLayers]);

    useEffect(() => {
        const prev = overlayAvailabilityRef.current;
        const gainedOverlay = (!prev.heatmap && layerContext.hasHeatmap) || (!prev.gaze && layerContext.hasGazeRoutes);
        overlayAvailabilityRef.current = { heatmap: layerContext.hasHeatmap, gaze: layerContext.hasGazeRoutes };
        if (!gainedOverlay) return;
        if (activeTab === 'original' || activeTab === 'gaze-paths' || activeTab === 'heatmap') {
            applyTabLayers(activeTab, layerContext);
        }
    }, [layerContext, activeTab, applyTabLayers]);

    useEffect(() => {
        if (aoiList.length === 0) { loadedAoiCountRef.current = 0; return; }
        if (loadedAoiCountRef.current > 0) { loadedAoiCountRef.current = aoiList.length; return; }
        loadedAoiCountRef.current = aoiList.length;
        if (activeTab === 'original' || activeTab === 'gaze-paths') {
            applyTabLayers(activeTab, layerContextRef.current);
        }
    }, [aoiList.length, activeTab, applyTabLayers]);

    const primaryGazeRoute = useMemo(
        () => gazeRoutes.find((route) => visibleRoutes.has(route.id)) ?? gazeRoutes[0],
        [gazeRoutes, visibleRoutes],
    );

    const animatedGazePath = useMemo(
        () => primaryGazeRoute?.fixations ?? [],
        [primaryGazeRoute],
    );

    const toggleGazeRoute = useCallback((id: string): void => {
        setVisibleRoutes(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    }, []);

    /* ── Derived flags ── */
    const showHeatmapLayer = layers.heatmap && hasHeatmap;
    const showBaseImage = !showHeatmapLayer;
    const isAoiEditMode = activeTab === 'aoi-editor';
    /** Effective image URL for the viewport — video AOI editor uses mid-frame thumbnail */
    const viewportImageUrl = (isVideo && isAoiEditMode && videoThumbnailUrl) ? videoThumbnailUrl : imageUrl;
    const showMapModeControls = hasHeatmap && (layers.heatmap || activeTab === 'heatmap');
    const heatmapBlur = isAoiEditMode ? Math.max(settings.blur, 10) : settings.blur;
    const heatmapOpacity = isAoiEditMode ? Math.max(settings.opacity, 40) : settings.opacity;
    const heatmapThreshold = isAoiEditMode ? Math.min(settings.threshold, 20) : settings.threshold;
    const heatmapGranularity: 'precise' | 'smooth' = settings.preset === 'Smooth' ? 'smooth' : 'precise';
    const heatmapVisualProfile = resolveHeatmapVisualProfile(settings.preset);
    const effectiveMapMode: HeatmapMapMode = isAoiEditMode ? 'classic' : mapMode;
    const showLegacyHeatmapBanner = hasHeatmap && !isVideo && isLegacyDenseHeatmap(heatmapData.length);

    /* ── Heatmap settings management ── */
    const applyHeatmapViewSettings = useCallback((view: HeatmapViewSettings): void => {
        setSettings(view.settings);
        setMapMode(view.mapMode);
        setSpotlightSettings(view.spotlight);
        setColdSettings(view.cold);
    }, []);

    const openHeatmapSettings = useCallback((): void => {
        heatmapViewSnapshotRef.current = {
            settings: { ...settings }, mapMode,
            spotlight: { ...spotlightSettings }, cold: { ...coldSettings },
        };
        setShowSettings(true);
    }, [settings, mapMode, spotlightSettings, coldSettings]);

    const cancelHeatmapSettings = useCallback((): void => {
        const snapshot = heatmapViewSnapshotRef.current;
        if (snapshot) applyHeatmapViewSettings(snapshot);
        heatmapViewSnapshotRef.current = null;
        setShowSettings(false);
    }, [applyHeatmapViewSettings]);

    const confirmHeatmapSettings = useCallback((): void => {
        heatmapViewSnapshotRef.current = null;
        setShowSettings(false);
    }, []);

    const heatmapViewSummary = useMemo(
        () => formatHeatmapViewSummary({ mapMode, settings, spotlight: spotlightSettings, cold: coldSettings }),
        [mapMode, settings, spotlightSettings, coldSettings],
    );

    const handleMapModeChange = useCallback((mode: HeatmapMapMode): void => {
        if (isAoiEditMode && mode !== 'classic') return;
        setMapMode(mode);
        if (!layers.heatmap) setLayers((prev) => ({ ...prev, heatmap: true }));
    }, [isAoiEditMode, layers.heatmap]);

    const handlePresetChange = useCallback((preset: string, values: Pick<HeatmapSettings, 'blur' | 'threshold' | 'opacity'>): void => {
        setSettings(prev => ({ ...prev, preset, ...values }));
    }, []);

    /* ── Empty state ── */
    if (!imageUrl) {
        return (
            <div className="bg-gray-100 h-64 flex items-center justify-center rounded-lg">
                <span className="text-gray-400">No image available</span>
            </div>
        );
    }

    /* ── Render ── */
    return (
        <>
            <div className={cn('flex h-full min-h-0 flex-col overflow-hidden rounded-lg border bg-white', className)}>
                {/* Title + actions */}
                <CardHeader
                    title={title}
                    onAddMore={onAddMore}
                    onDelete={onDelete}
                    isDeleting={isDeleting}
                    headerExtra={headerExtra}
                    onRunPrediction={onRunPrediction}
                    isPredicting={isPredicting || (videoProgress != null && videoProgress.phase !== 'error' && videoProgress.phase !== 'complete')}
                    predictElapsed={predictElapsed}
                    videoProgressMessage={videoProgress?.message}
                    hasHeatmap={hasHeatmap}
                    predictionGateOpen={predictionGateOpen}
                    onPredictClick={handlePredictClick}
                    heatmapStale={hasHeatmap && aoiCountAtPredict.current !== null && aoiList.length !== aoiCountAtPredict.current}
                    onRunAnalysis={onRunAnalysis}
                    isAnalyzing={isAnalyzing}
                    analyzeElapsed={analyzeElapsed}
                    analysisGateOpen={analysisGateOpen}
                    aiAnalysis={aiAnalysis}
                    onAnalysisClick={handleAnalysisClick}
                    heatmapVideoUrl={heatmapVideoUrl}
                    overlayOnlyUrl={overlayOnlyUrl}
                    imageUrl={imageUrl}
                    downloadVideo={downloadVideo}
                />

                {showLegacyHeatmapBanner && (
                    <div className="mx-4 mt-3 px-3 py-2 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-md">
                        Datos de heatmap antiguos — usa «Regenerar heatmap» para obtener un mapa fino con hotspots precisos.
                    </div>
                )}

                {predictionError && (
                    <div className="mx-4 mt-3 px-3 py-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded-md flex items-center justify-between gap-2">
                        <span>Error al generar heatmap: {predictionError}</span>
                        {onRunPrediction && (
                            <button type="button" onClick={handlePredictClick} className="text-red-800 underline font-medium shrink-0">
                                Reintentar
                            </button>
                        )}
                    </div>
                )}

                {/* Tabs + Settings */}
                <div className="border-b bg-white">
                    <div className="flex items-center px-4">
                        <div className="flex gap-1 flex-1">
                            {tabs.map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => handleTabChange(tab.id)}
                                    className={cn(
                                        'flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 transition-colors',
                                        activeTab === tab.id
                                            ? 'border-blue-600 text-blue-600'
                                            : 'border-transparent text-gray-600 hover:text-gray-900'
                                    )}
                                >
                                    {TAB_ICONS[tab.icon]}
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                        {!isVideo && (
                            <button
                                type="button"
                                onClick={() => setShowFullscreen(true)}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded hover:bg-gray-200 transition-colors mr-2"
                                title="Vista completa"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5" />
                                </svg>
                            </button>
                        )}
                        {!isVideo && (
                            <button
                                type="button"
                                onClick={openHeatmapSettings}
                                className={cn(
                                    'flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 transition-colors',
                                    showSettings ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-600 hover:text-gray-900',
                                )}
                            >
                                {TAB_ICONS.settings}
                                Settings
                            </button>
                        )}
                    </div>
                </div>

                {/* Layer toggles — Heatmap and Gaze Paths tabs */}
                {!isVideo && (activeTab === 'heatmap' || activeTab === 'gaze-paths') && (
                    <LayerToggles
                        layers={layers}
                        hasHeatmap={hasHeatmap}
                        displayAutoAois={displayAutoAois}
                        computedAois={computedAois}
                        gazeRoutes={gazeRoutes}
                        onToggleLayer={toggleLayer}
                        onApplyComposite={applyCompositeLayers}
                    />
                )}

                {/* Map mode control bar — image only */}
                {!isVideo && showMapModeControls && activeTab === 'heatmap' && (
                    <MapModeControlBar
                        mapMode={mapMode}
                        settings={settings}
                        isAoiEditMode={isAoiEditMode}
                        heatmapViewSummary={heatmapViewSummary}
                        onMapModeChange={handleMapModeChange}
                        onPresetChange={handlePresetChange}
                        onOpenSettings={openHeatmapSettings}
                    />
                )}

                {/* Grid preset selector — heatmap tab */}
                {activeTab === 'heatmap' && (
                    <div className="px-4 py-2 border-b bg-slate-50 flex items-center gap-3">
                        <span className="text-xs text-gray-500">Malla</span>
                        <div className="flex items-center gap-1 border border-gray-200 rounded bg-white p-0.5">
                            {GRID_PRESETS.map(preset => (
                                <button
                                    key={preset.label}
                                    type="button"
                                    onClick={() => handleGridPresetChange(preset)}
                                    className={cn(
                                        'px-2.5 py-1 text-xs font-medium rounded transition-colors',
                                        activeGridPreset === preset.label
                                            ? 'bg-blue-600 text-white'
                                            : 'text-gray-600 hover:bg-gray-100',
                                    )}
                                >
                                    {preset.label}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Gaze route toggles */}
                {!isVideo && layers.gaze && gazeRoutes.length > 0 && activeTab === 'gaze-paths' && (
                    <GazeRouteBar
                        gazeRoutes={gazeRoutes}
                        gazeMode={gazeMode}
                        visibleRoutes={visibleRoutes}
                        hasHeatmap={hasHeatmap}
                        onGazeModeChange={setGazeMode}
                        onToggleRoute={toggleGazeRoute}
                    />
                )}

                {/* AOI Editor toolbar */}
                {isAoiEditMode && (
                    <AoiEditorToolbar
                        drawingAoi={drawingAoi}
                        onToggleDrawing={() => setDrawingAoi(prev => !prev)}
                        aoiSkipped={aoiSkipped}
                        aoiList={aoiList}
                        onAoiSkippedChange={onAoiSkippedChange}
                        onShowSkipConfirm={() => { setSkipConfirmAction('gate-only'); setShowSkipConfirm(true); }}
                        griddedAOIs={griddedAOIs}
                        computedAois={computedAois}
                        isSavingAois={isSavingAois}
                        onImportGridded={(imported) => { setAoiList(imported); void persistAois(imported); }}
                        isVideo={isVideo}
                        activeGridPreset={activeGridPreset}
                        onGridPresetChange={handleGridPresetChange}
                    />
                )}

                {/* Content — flex viewport */}
                <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-4" ref={tabContentRef}>
                    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                        {/* Video layout — original and heatmap tabs */}
                        {isVideo && activeTab !== 'aoi-editor' && (
                            <div className="relative flex h-full min-h-0 flex-1 items-center justify-center overflow-hidden rounded-lg border bg-black">
                                    <video
                                        src={imageUrl}
                                        controls={activeTab === 'original'}
                                        muted
                                        playsInline
                                        preload="metadata"
                                        className="max-w-full max-h-full block"
                                        style={{ display: (activeTab === 'heatmap' && (heatmapVideoUrl || videoFrames.length > 0)) ? 'none' : 'block' }}
                                    />
                                    {activeTab === 'heatmap' && heatmapVideoUrl && (
                                        <video
                                            src={resolveMediaUrl(heatmapVideoUrl)}
                                            controls
                                            muted
                                            playsInline
                                            preload="auto"
                                            className="max-w-full max-h-full block"
                                            data-testid="heatmap-video"
                                        />
                                    )}
                                    {activeTab === 'heatmap' && !heatmapVideoUrl && (
                                        <VideoThermalGrid
                                            heatmapData={heatmapData}
                                            videoUrl={imageUrl}
                                            videoFrames={videoFrames}
                                            thermalMap={thermalMap}
                                            thermalMapWidth={thermalMapWidth}
                                            thermalMapHeight={thermalMapHeight}
                                        />
                                    )}
                            </div>
                        )}

                        {/* Image layout — unified viewport (also used for video AOI editor) */}
                        {(!isVideo || (isVideo && activeTab === 'aoi-editor' && videoThumbnailUrl)) && (
                            <div className="flex h-full min-h-0 flex-1 items-center justify-center overflow-hidden">
                                <TransformWrapper
                                    minScale={1}
                                    maxScale={5}
                                    wheel={{ step: 0.15 }}
                                    centerOnInit
                                    limitToBounds
                                    panning={{ disabled: isAoiEditMode && drawingAoi }}
                                >
                                    <div className={cn(
                                        'rounded-lg border overflow-hidden relative',
                                        layers.gaze ? 'bg-gray-900' : 'bg-gray-100',
                                    )}>
                                        <ZoomControls />
                                        <TransformComponent
                                            wrapperStyle={{ width: '100%' }}
                                            contentStyle={STIMULUS_TRANSFORM_CONTENT_STYLE}
                                        >
                                            <StimulusOverlayFrame
                                                containerRef={isAoiEditMode ? aoiContainerRef : undefined}
                                                maxDisplayHeightPx={stableMaxHeight}
                                                onMouseDown={isAoiEditMode && drawingAoi ? (e) => {
                                                    e.preventDefault();
                                                    const container = aoiContainerRef.current;
                                                    if (!container) return;
                                                    const pos = getMousePercent(e, container);
                                                    setAoiStart(pos);
                                                    setAoiCurrent({ x: pos.x, y: pos.y, w: 0, h: 0 });
                                                } : undefined}
                                                className={isAoiEditMode && drawingAoi ? 'cursor-crosshair' : undefined}
                                                dimOverlay={layers.gaze && gazeMode === 'static'}
                                            >
                                                {showBaseImage && (
                                                    <>
                                                        <img src={viewportImageUrl} alt={title} className={STIMULUS_MEDIA_FIT_FLEX_CLASS} />
                                                        {isPredicting && (
                                                            <div className="absolute inset-0 flex items-center justify-center bg-black/40 pointer-events-none animate-pulse">
                                                                <p className="text-white text-sm bg-black/60 px-4 py-2 rounded-lg">
                                                                    Generando heatmap… {predictElapsed}s
                                                                </p>
                                                            </div>
                                                        )}
                                                        {!isPredicting && layers.heatmap && !hasHeatmap && (
                                                            <div className="absolute inset-0 flex items-center justify-center bg-black/30 pointer-events-none">
                                                                <p className="text-white text-sm bg-black/50 px-4 py-2 rounded-lg">
                                                                    Genera el heatmap para ver la predicción TranSalNet
                                                                </p>
                                                            </div>
                                                        )}
                                                    </>
                                                )}

                                                {hasHeatmap && (
                                                    <div
                                                        key={effectiveMapMode}
                                                        className={showHeatmapLayer ? 'block' : 'hidden'}
                                                        aria-hidden={!showHeatmapLayer}
                                                    >
                                                        {effectiveMapMode === 'spotlight' ? (
                                                            <SpotlightRenderer
                                                                imageUrl={viewportImageUrl} data={heatmapData}
                                                                blur={spotlightSettings.blur} reveal={spotlightSettings.reveal}
                                                                dim={spotlightSettings.dim} threshold={heatmapThreshold}
                                                                borderless fitMaxHeightPx={stableMaxHeight}
                                                                canvasClassName={STIMULUS_MEDIA_FIT_FLEX_CLASS}
                                                            />
                                                        ) : effectiveMapMode === 'cold' ? (
                                                            <ColdMapRenderer
                                                                imageUrl={viewportImageUrl} data={heatmapData}
                                                                intensity={coldSettings.intensity} blur={coldSettings.blur}
                                                                threshold={coldSettings.threshold}
                                                                borderless fitMaxHeightPx={stableMaxHeight}
                                                                canvasClassName={STIMULUS_MEDIA_FIT_FLEX_CLASS}
                                                            />
                                                        ) : (
                                                            <HeatmapRenderer
                                                                imageUrl={viewportImageUrl} data={heatmapData}
                                                                blur={heatmapBlur} opacity={heatmapOpacity}
                                                                threshold={heatmapThreshold}
                                                                granularity={heatmapGranularity}
                                                                visualProfile={heatmapVisualProfile}
                                                                borderless fitMaxHeightPx={stableMaxHeight}
                                                                canvasClassName={STIMULUS_MEDIA_FIT_FLEX_CLASS}
                                                            />
                                                        )}
                                                    </div>
                                                )}

                                                {layers.aiAois && displayAutoAois.length > 0 && (
                                                    <AiAoiOverlay autoAois={displayAutoAois} importedLabels={importedAiLabels} />
                                                )}

                                                {layers.manualAois && computedAois.map((aoi, i) => {
                                                    const color = AOI_COLORS[i % AOI_COLORS.length];
                                                    if (isAoiEditMode) {
                                                        return (
                                                            <AoiRectEditor
                                                                key={aoi.id} aoi={aoi} color={color}
                                                                percentage={aoi.percentage}
                                                                selected={selectedAoiId === aoi.id}
                                                                onSelect={() => setSelectedAoiId(aoi.id)}
                                                                onChange={updateAoi}
                                                                containerRef={aoiContainerRef}
                                                            />
                                                        );
                                                    }
                                                    return (
                                                        <div
                                                            key={aoi.id}
                                                            className="absolute pointer-events-none border-2 rounded-sm"
                                                            style={{
                                                                left: `${aoi.x}%`, top: `${aoi.y}%`,
                                                                width: `${aoi.width}%`, height: `${aoi.height}%`,
                                                                borderColor: color, backgroundColor: `${color}22`,
                                                            }}
                                                        />
                                                    );
                                                })}

                                                {isAoiEditMode && aoiCurrent && aoiCurrent.w > 0 && (
                                                    <div
                                                        className="absolute pointer-events-none border-2 border-dashed border-blue-500"
                                                        style={{
                                                            left: `${aoiCurrent.x}%`, top: `${aoiCurrent.y}%`,
                                                            width: `${aoiCurrent.w}%`, height: `${aoiCurrent.h}%`,
                                                            backgroundColor: 'rgba(59, 130, 246, 0.15)',
                                                        }}
                                                    />
                                                )}

                                                {layers.gaze && gazeMode === 'static' && gazeRoutes.map(route => (
                                                    <GazePathOverlay
                                                        key={route.id}
                                                        gazePath={route.fixations}
                                                        visible={visibleRoutes.has(route.id)}
                                                        routeColor={ROUTE_COLORS[route.id] ?? '#8B5CF6'}
                                                        markerId={route.id}
                                                    />
                                                ))}

                                                {layers.gaze && gazeMode === 'animated' && animatedGazePath.length > 0 && (
                                                    <GazeScanpathPlayer
                                                        imageUrl={imageUrl}
                                                        gazePath={animatedGazePath}
                                                        duration={5}
                                                        routeColor={ROUTE_COLORS[primaryGazeRoute?.id ?? 'typical-scan']}
                                                        className="absolute inset-0 w-full h-full"
                                                        transparent
                                                    />
                                                )}
                                            </StimulusOverlayFrame>
                                        </TransformComponent>
                                    </div>
                                </TransformWrapper>
                            </div>
                        )}
                    </div>

                    {isAoiEditMode && isPredicting && (
                        <p className="mt-2 shrink-0 text-xs text-indigo-600">
                            Regenerando heatmap ({predictElapsed}s). Los % se actualizan al mover zonas; el mapa se refrescará al terminar.
                        </p>
                    )}
                    {isAoiEditMode && computedAois.length > 0 && (
                        <AoiChipList
                            computedAois={computedAois}
                            selectedAoiId={selectedAoiId}
                            editingLabelId={editingLabelId}
                            editingLabelValue={editingLabelValue}
                            onSelect={setSelectedAoiId}
                            onStartEdit={(id, label) => { setEditingLabelId(id); setEditingLabelValue(label); }}
                            onEditChange={setEditingLabelValue}
                            onCommitEdit={updateAoiLabel}
                            onCancelEdit={() => setEditingLabelId(null)}
                            onRemove={removeAoi}
                        />
                    )}

                    {/* Video AOI timeline — only for manual AOIs, not grid presets */}
                    {isVideo && aoiList.some(a => a.source !== 'imported-grid') && (activeTab === 'aoi-editor' || activeTab === 'heatmap') && videoDuration > 0 && (
                        <div className="shrink-0 max-h-40 overflow-y-auto border-t border-gray-100">
                            <AoiTimelineBar
                                aois={aoiList.filter(a => a.source !== 'imported-grid')}
                                videoDuration={videoDuration}
                                onChange={handleAoiTimeRangeChange}
                                frameTimestamps={videoFrames.map(f => f.timestamp)}
                            />
                        </div>
                    )}
                </div>
            </div>

            {showNameModal && createPortal(
                <AoiNameModal
                    label={pendingLabel}
                    onLabelChange={setPendingLabel}
                    onConfirm={confirmPendingAoi}
                    onCancel={() => { setShowNameModal(false); setPendingRect(null); }}
                />,
                document.body,
            )}

            {showSkipConfirm && createPortal(
                <SkipAoiConfirmModal
                    onCancel={() => setShowSkipConfirm(false)}
                    onConfirm={() => {
                        setShowSkipConfirm(false);
                        onAoiSkippedChange?.(true);
                        if (skipConfirmAction === 'predict') onRunPrediction?.(aoiList);
                    }}
                />,
                document.body,
            )}

            {showSettings && createPortal(
                <HeatmapSettingsModal
                    imageUrl={imageUrl}
                    heatmapData={heatmapData}
                    settings={settings}
                    mapMode={mapMode}
                    spotlightSettings={spotlightSettings}
                    coldSettings={coldSettings}
                    onLiveChange={applyHeatmapViewSettings}
                    onConfirm={confirmHeatmapSettings}
                    onCancel={cancelHeatmapSettings}
                />,
                document.body,
            )}

            {showFullscreen && !isVideo && createPortal(
                <StimulusFullscreenModal
                    imageUrl={imageUrl}
                    title={title}
                    heatmapData={heatmapData}
                    settings={settings}
                    mapMode={mapMode}
                    spotlightSettings={spotlightSettings}
                    coldSettings={coldSettings}
                    showHeatmap={activeTab === 'heatmap' && layers.heatmap}
                    onClose={() => setShowFullscreen(false)}
                />,
                document.body,
            )}
        </>
    );
};

/* ═══════════════════════════════════════════════════════════════
   Private sub-components — extracted to flatten the main render
   ═══════════════════════════════════════════════════════════════ */

const CardHeader = ({
    title: _title, onAddMore, onDelete, isDeleting, headerExtra,
    onRunPrediction, isPredicting, predictElapsed, videoProgressMessage, hasHeatmap,
    predictionGateOpen, onPredictClick, heatmapStale,
    onRunAnalysis, isAnalyzing, analyzeElapsed, analysisGateOpen, aiAnalysis, onAnalysisClick,
    heatmapVideoUrl, overlayOnlyUrl, imageUrl, downloadVideo,
}: {
    title: string;
    onAddMore?: () => void;
    onDelete?: () => void;
    isDeleting: boolean;
    headerExtra?: ReactNode;
    onRunPrediction?: (aois: ManualAOI[]) => void;
    isPredicting: boolean;
    predictElapsed: number;
    videoProgressMessage?: string;
    hasHeatmap: boolean;
    predictionGateOpen: boolean;
    onPredictClick: () => void;
    heatmapStale: boolean;
    onRunAnalysis?: (aois: ManualAOI[]) => void;
    isAnalyzing: boolean;
    analyzeElapsed: number;
    analysisGateOpen: boolean;
    aiAnalysis?: AiAnalysisResult;
    onAnalysisClick: () => void;
    heatmapVideoUrl?: string;
    overlayOnlyUrl?: string;
    imageUrl?: string;
    downloadVideo?: (url: string, filename: string) => void;
}) => (
    <div className="p-4 border-b flex flex-wrap items-center gap-2">
        <div className="min-w-0 shrink-0">
            <p className="text-sm text-gray-500">Prediction of visual attention</p>
        </div>
        <div className="flex flex-wrap items-center gap-1 ml-auto">
            {onAddMore && (
                <button type="button" onClick={onAddMore} className="p-1.5 text-gray-400 hover:text-blue-600 transition-colors" title="Add more images or videos">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                </button>
            )}
            {onDelete && (
                <button type="button" onClick={onDelete} disabled={isDeleting} className="p-1.5 text-gray-400 hover:text-red-600 transition-colors disabled:opacity-50" title="Remove stimulus">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                </button>
            )}
            {headerExtra}
            {onRunPrediction && (
                <button
                    type="button"
                    onClick={onPredictClick}
                    disabled={isPredicting}
                    className={cn(
                        'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors',
                        heatmapStale
                            ? 'text-white bg-amber-500 hover:bg-amber-600'
                            : hasHeatmap ? 'text-gray-600 bg-gray-100 hover:bg-gray-200' : 'text-white bg-indigo-600 hover:bg-indigo-700',
                        isPredicting && 'opacity-50 cursor-not-allowed',
                    )}
                    title={!predictionGateOpen ? 'Define al menos una zona o continúa sin zonas' : hasHeatmap ? 'Regenerar heatmap TranSalNet' : 'Generar heatmap TranSalNet'}
                >
                    {isPredicting
                        ? (videoProgressMessage || `Generando heatmap... ${predictElapsed}s`)
                        : heatmapStale
                            ? 'Recalcular con zonas actuales'
                            : hasHeatmap ? 'Regenerar heatmap' : 'Generar heatmap'}
                </button>
            )}
            {heatmapVideoUrl && downloadVideo && imageUrl && (
                <>
                    <button
                        type="button"
                        onClick={() => downloadVideo(resolveMediaUrl(imageUrl), 'video-original')}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-gray-200 bg-white text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
                    >
                        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v12m0 0l-4-4m4 4l4-4M4 18h16" /></svg>
                        Video original
                    </button>
                    <button
                        type="button"
                        onClick={() => downloadVideo(resolveMediaUrl(overlayOnlyUrl || heatmapVideoUrl), 'video-heatmap')}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-blue-200 bg-blue-50 text-blue-700 shadow-sm transition-colors hover:bg-blue-100"
                    >
                        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v12m0 0l-4-4m4 4l4-4M4 18h16" /></svg>
                        Video heatmap
                    </button>
                </>
            )}
            {onRunAnalysis && (
                <button
                    type="button"
                    onClick={onAnalysisClick}
                    disabled={isAnalyzing || !analysisGateOpen}
                    className={cn(
                        'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors',
                        aiAnalysis ? 'text-gray-600 bg-gray-100 hover:bg-gray-200' : 'text-white bg-blue-600 hover:bg-blue-700',
                        (isAnalyzing || !analysisGateOpen) && 'opacity-50 cursor-not-allowed',
                    )}
                    title={!analysisGateOpen ? (!hasHeatmap ? 'Genera el heatmap antes del análisis IA' : 'Define al menos una zona o continúa sin zonas') : aiAnalysis ? 'Re-ejecutar análisis IA' : 'Ejecutar análisis IA'}
                >
                    <svg className={cn("h-3.5 w-3.5", isAnalyzing && "animate-spin")} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        {isAnalyzing
                            ? <><circle className="opacity-25" cx="12" cy="12" r="10" /><path className="opacity-75" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" fill="currentColor" stroke="none" /></>
                            : <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                        }
                    </svg>
                    {isAnalyzing ? `Analizando... ${analyzeElapsed}s` : aiAnalysis ? 'Re-analizar' : 'Análisis IA'}
                </button>
            )}
        </div>
    </div>
);

const LayerToggles = ({
    layers, hasHeatmap, displayAutoAois, computedAois, gazeRoutes,
    onToggleLayer, onApplyComposite,
}: {
    layers: StimulusLayers;
    hasHeatmap: boolean;
    displayAutoAois: unknown[];
    computedAois: unknown[];
    gazeRoutes: unknown[];
    onToggleLayer: (key: keyof StimulusLayers) => void;
    onApplyComposite: () => void;
}) => (
    <div className="px-4 py-2 border-b bg-white flex flex-wrap items-center gap-x-4 gap-y-1">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mr-1">Capas</span>
        <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer">
            <input type="checkbox" checked={layers.heatmap} disabled={!hasHeatmap} onChange={() => onToggleLayer('heatmap')} className="rounded border-gray-300" />
            Heatmap
        </label>
        {displayAutoAois.length > 0 && (
            <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer">
                <input type="checkbox" checked={layers.aiAois} onChange={() => onToggleLayer('aiAois')} className="rounded border-gray-300" />
                Zonas IA
            </label>
        )}
        {computedAois.length > 0 && (
            <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer">
                <input type="checkbox" checked={layers.manualAois} onChange={() => onToggleLayer('manualAois')} className="rounded border-gray-300" />
                Zonas manuales
            </label>
        )}
        {gazeRoutes.length > 0 && (
            <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer">
                <input type="checkbox" checked={layers.gaze} onChange={() => onToggleLayer('gaze')} className="rounded border-gray-300" />
                Rutas de mirada
            </label>
        )}
        {(hasHeatmap || gazeRoutes.length > 0) && (
            <button type="button" onClick={onApplyComposite} className="ml-1 px-2 py-0.5 text-[11px] font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded hover:bg-blue-100 transition-colors">
                Vista completa
            </button>
        )}
    </div>
);

const GazeRouteBar = ({
    gazeRoutes, gazeMode, visibleRoutes, hasHeatmap,
    onGazeModeChange, onToggleRoute,
}: {
    gazeRoutes: Array<{ id: string; name: string; description: string; fixations: unknown[] }>;
    gazeMode: 'static' | 'animated';
    visibleRoutes: Set<string>;
    hasHeatmap: boolean;
    onGazeModeChange: (m: 'static' | 'animated') => void;
    onToggleRoute: (id: string) => void;
}) => (
    <div className="px-4 py-2 border-b bg-slate-50 flex items-center gap-2 flex-wrap">
        {hasHeatmap && (
            <div className="flex items-center gap-1 mr-2">
                {(['static', 'animated'] as const).map(m => (
                    <button
                        key={m} type="button"
                        onClick={() => onGazeModeChange(m)}
                        className={cn(
                            'px-2.5 py-1 text-xs font-medium rounded transition-colors capitalize',
                            gazeMode === m ? 'bg-gray-900 text-white' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100',
                        )}
                    >
                        {m === 'static' ? 'Routes' : 'Scanpath'}
                    </button>
                ))}
            </div>
        )}
        {gazeMode === 'static' && (
            <>
                <span className="text-[10px] text-gray-400 uppercase tracking-wider mr-1">Routes:</span>
                {gazeRoutes.map(route => {
                    const color = ROUTE_COLORS[route.id] ?? '#8B5CF6';
                    const active = visibleRoutes.has(route.id);
                    return (
                        <button
                            key={route.id} type="button"
                            onClick={() => onToggleRoute(route.id)}
                            className={cn(
                                'flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full border transition-all',
                                active ? 'text-white' : 'bg-white text-gray-500 border-gray-200 opacity-50',
                            )}
                            style={active ? { backgroundColor: color, borderColor: color } : undefined}
                            title={route.description}
                        >
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: active ? '#fff' : color }} />
                            {route.name}
                        </button>
                    );
                })}
            </>
        )}
        {gazeMode === 'static' && (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 w-full sm:w-auto">
                {GAZE_ROUTE_LEGEND.filter(item => gazeRoutes.some(r => r.id === item.id)).map(item => (
                    <span key={item.id} className="flex items-center gap-1.5 text-[11px] text-gray-600">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                        {item.label}
                    </span>
                ))}
            </div>
        )}
    </div>
);

const GRID_PRESETS = [
    { label: 'Manual', cols: 0, rows: 0 },
    { label: '3×3', cols: 3, rows: 3 },
    { label: '5×5', cols: 5, rows: 5 },
] as const;

const AoiEditorToolbar = ({
    drawingAoi, onToggleDrawing, aoiSkipped, aoiList, onAoiSkippedChange,
    onShowSkipConfirm, griddedAOIs, computedAois, isSavingAois, onImportGridded,
    isVideo, activeGridPreset, onGridPresetChange,
}: {
    drawingAoi: boolean;
    onToggleDrawing: () => void;
    aoiSkipped: boolean;
    aoiList: ManualAOI[];
    onAoiSkippedChange?: (v: boolean) => void;
    onShowSkipConfirm: () => void;
    griddedAOIs?: Array<{ label: string; x: number; y: number; width: number; height: number; attention: number; rank: number }>;
    computedAois: AOIWithStats[];
    isSavingAois: boolean;
    onImportGridded: (imported: ManualAOI[]) => void;
    isVideo?: boolean;
    activeGridPreset?: string;
    onGridPresetChange?: (preset: { label: string; cols: number; rows: number }) => void;
}) => (
    <div className="px-4 py-3 border-b bg-slate-50 space-y-3">
        <div className="flex items-center gap-3 flex-wrap">
            {isVideo && onGridPresetChange && (
                <div className="flex items-center gap-1 border border-gray-200 rounded bg-white p-0.5">
                    {GRID_PRESETS.map(preset => (
                        <button
                            key={preset.label}
                            type="button"
                            onClick={() => onGridPresetChange(preset)}
                            className={cn(
                                'px-2.5 py-1 text-xs font-medium rounded transition-colors',
                                activeGridPreset === preset.label
                                    ? 'bg-blue-600 text-white'
                                    : 'text-gray-600 hover:bg-gray-100',
                            )}
                        >
                            {preset.label}
                        </button>
                    ))}
                </div>
            )}
            <button
                type="button"
                onClick={onToggleDrawing}
                className={cn(
                    'px-3 py-1.5 text-xs font-medium rounded transition-colors',
                    drawingAoi ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200',
                )}
            >
                {drawingAoi ? 'Dibujando zona...' : '+ Crear zona manual'}
            </button>
            {!aoiSkipped && aoiList.length === 0 && onAoiSkippedChange && (
                <button type="button" onClick={onShowSkipConfirm}
                    className="px-3 py-1.5 text-xs font-medium text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded transition-colors">
                    Continuar sin zonas
                </button>
            )}
            {aoiSkipped && (
                <span className="text-xs text-amber-700 bg-amber-50 px-2 py-1 rounded border border-amber-200">Sin zonas definidas</span>
            )}
            {!isVideo && griddedAOIs && griddedAOIs.length > 0 && computedAois.length === 0 && (
                <button
                    type="button"
                    onClick={() => {
                        const imported: ManualAOI[] = griddedAOIs.map((g, i) => ({
                            id: `grid-${Date.now()}-${i}`,
                            label: g.label, x: g.x, y: g.y, width: g.width, height: g.height,
                            source: 'imported-grid' as const,
                        }));
                        onImportGridded(imported);
                    }}
                    className="px-3 py-1.5 text-xs font-medium text-green-700 bg-green-50 hover:bg-green-100 border border-green-200 rounded transition-colors"
                >
                    Importar zonas detectadas ({griddedAOIs.length})
                </button>
            )}
            {computedAois.length > 0 && (
                <span className="text-xs text-gray-500">
                    {computedAois.length} zonas definidas
                    {isSavingAois && ' — guardando...'}
                </span>
            )}
        </div>
    </div>
);

const AoiChipList = ({
    computedAois, selectedAoiId, editingLabelId, editingLabelValue,
    onSelect, onStartEdit, onEditChange, onCommitEdit, onCancelEdit, onRemove,
}: {
    computedAois: AOIWithStats[];
    selectedAoiId: string | null;
    editingLabelId: string | null;
    editingLabelValue: string;
    onSelect: (id: string) => void;
    onStartEdit: (id: string, label: string) => void;
    onEditChange: (v: string) => void;
    onCommitEdit: (id: string, label: string) => void;
    onCancelEdit: () => void;
    onRemove: (id: string) => void;
}) => (
    <div className="mt-2 flex shrink-0 flex-wrap gap-2">
        {computedAois.map((aoi, i) => {
            const color = AOI_COLORS[i % AOI_COLORS.length];
            const isEditing = editingLabelId === aoi.id;
            return (
                <div
                    key={aoi.id}
                    className={cn(
                        'flex items-center gap-2 px-2.5 py-1.5 bg-white border rounded-lg text-xs',
                        selectedAoiId === aoi.id && 'ring-2 ring-blue-400',
                    )}
                    onClick={() => onSelect(aoi.id)}
                >
                    <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: color }} />
                    {isEditing ? (
                        <input
                            value={editingLabelValue}
                            onChange={(e) => onEditChange(e.target.value)}
                            onBlur={() => onCommitEdit(aoi.id, editingLabelValue)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') onCommitEdit(aoi.id, editingLabelValue);
                                if (e.key === 'Escape') onCancelEdit();
                                if (e.key === 'Backspace' || e.key === 'Delete') e.stopPropagation();
                            }}
                            className="w-24 px-1 py-0.5 border rounded text-xs"
                            autoFocus
                            onClick={(e) => e.stopPropagation()}
                        />
                    ) : (
                        <span
                            className="font-medium text-gray-700 cursor-text"
                            onDoubleClick={(e) => { e.stopPropagation(); onStartEdit(aoi.id, aoi.label); }}
                        >
                            {aoi.label}
                        </span>
                    )}
                    <span className="font-semibold" style={{ color }} title={`~${estimateExposureTime(aoi.percentage)} exposición estimada`}>
                        {aoi.percentage}%
                    </span>
                    <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onRemove(aoi.id); }}
                        className="text-gray-400 hover:text-red-500 ml-0.5"
                    >
                        ×
                    </button>
                </div>
            );
        })}
    </div>
);

const AoiNameModal = ({
    label, onLabelChange, onConfirm, onCancel,
}: {
    label: string;
    onLabelChange: (v: string) => void;
    onConfirm: () => void;
    onCancel: () => void;
}) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
        <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Nombre de la zona</h3>
            <input
                value={label}
                onChange={(e) => onLabelChange(e.target.value)}
                className="w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-400"
                autoFocus
                onKeyDown={(e) => {
                    if (e.key === 'Enter') onConfirm();
                    if (e.key === 'Escape') onCancel();
                    if (e.key === 'Backspace' || e.key === 'Delete') e.stopPropagation();
                }}
            />
            <div className="flex justify-end gap-2 mt-4">
                <button type="button" onClick={onCancel} className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-md">Cancelar</button>
                <button type="button" onClick={onConfirm} className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md">Guardar zona</button>
            </div>
        </div>
    </div>
);

const SkipAoiConfirmModal = ({
    onCancel, onConfirm,
}: {
    onCancel: () => void;
    onConfirm: () => void;
}) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
        <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Continuar sin zonas</h3>
            <p className="text-sm text-gray-600 mb-4">
                No has definido AOIs. Puedes generar el heatmap igualmente, pero el análisis IA tendrá menos contexto espacial.
            </p>
            <div className="flex justify-end gap-2">
                <button type="button" onClick={onCancel} className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-md">Cancelar</button>
                <button type="button" onClick={onConfirm} className="px-3 py-1.5 text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 rounded-md">Continuar sin zonas</button>
            </div>
        </div>
    </div>
);
