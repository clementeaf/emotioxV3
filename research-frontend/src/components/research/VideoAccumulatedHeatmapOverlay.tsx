import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import simpleheat from 'simpleheat';
import { cn } from '../../lib/utils';
import {
    isFullFrameMapMode,
    type ColdMapSettings,
    type HeatmapMapMode,
    type SpotlightSettings,
} from '../../utils/attentionPrediction.utils';
import { renderColdMapComposite } from '../../utils/coldMapRender';
import { renderSpotlightComposite } from '../../utils/spotlightRender';
import { computeGridPercentages } from './VideoFrameScrubber';
import {
    decodeThermalMap,
    buildColorLUT,
    renderSaliencyMapDirect,
    sigmoidContrast,
    REBALANCED_THERMAL_STOPS,
} from '../../utils/thermalContrast';

interface HeatmapPoint {
    x: number;
    y: number;
    value?: number;
}

interface HeatmapSettings {
    blur: number;
    opacity: number;
    threshold: number;
    preset: string;
}

interface VideoAccumulatedHeatmapOverlayProps {
    videoUrl: string;
    heatmapData: HeatmapPoint[];
    settings: HeatmapSettings;
    mapMode: HeatmapMapMode;
    spotlightSettings: SpotlightSettings;
    coldSettings: ColdMapSettings;
    thermalMap?: string;       // base64 Uint8Array dense map
    thermalMapWidth?: number;
    thermalMapHeight?: number;
}

/* ─── Thermal blue gradient for simpleheat ─── */

const THERMAL_GRADIENT = {
    0.0: '#000033',
    0.15: '#000066',
    0.3: '#0000cc',
    0.45: '#0088ff',
    0.55: '#00cc44',
    0.65: '#88dd00',
    0.75: '#ffff00',
    0.85: '#ff8800',
    0.95: '#ff0000',
    1.0: '#ff0000',
};

const GRID_OPTIONS = [
    { label: '2×2', cols: 2, rows: 2 },
    { label: '3×3', cols: 3, rows: 3 },
    { label: '4×4', cols: 4, rows: 4 },
    { label: '5×5', cols: 5, rows: 5 },
    { label: '10×10', cols: 10, rows: 10 },
];

/**
 * Renders accumulated heatmap overlay on a video.
 * Classic mode: thermal blue heatmap + grid + split divider (like video.png reference).
 * Spotlight/Cold modes: full-frame composite overlays.
 */
// Precomputed FLIR LUT — stable reference across renders
const FLIR_LUT = buildColorLUT(REBALANCED_THERMAL_STOPS);

export const VideoAccumulatedHeatmapOverlay = ({
    videoUrl,
    heatmapData,
    settings,
    mapMode,
    spotlightSettings,
    coldSettings,
    thermalMap,
    thermalMapWidth,
    thermalMapHeight,
}: VideoAccumulatedHeatmapOverlayProps) => {

    // Decode dense thermal map once (stable across renders)
    const decodedThermalMap = useMemo(
        () => thermalMap ? decodeThermalMap(thermalMap) : null,
        [thermalMap],
    );
    const hasDenseMap = decodedThermalMap !== null && thermalMapWidth && thermalMapHeight;
    const [splitPct, setSplitPct] = useState(50);
    const [gridSize, setGridSize] = useState(1);
    const [dragging, setDragging] = useState(false);

    const containerRef = useRef<HTMLDivElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const gridCanvasRef = useRef<HTMLCanvasElement>(null);
    const offscreenRef = useRef<HTMLCanvasElement | null>(null);
    const maskRef = useRef<HTMLCanvasElement | null>(null);
    const coldHeatCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const cachedMaskKeyRef = useRef('');
    const animRef = useRef<number | null>(null);

    const { cols, rows } = GRID_OPTIONS[gridSize];

    // ─── Divider drag ───

    const handleDividerDown = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        setDragging(true);
    }, []);

    useEffect(() => {
        if (!dragging) return;
        const onMove = (e: MouseEvent) => {
            const rect = containerRef.current?.getBoundingClientRect();
            if (!rect) return;
            setSplitPct(Math.max(10, Math.min(90, ((e.clientX - rect.left) / rect.width) * 100)));
        };
        const onUp = () => setDragging(false);
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
        return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
    }, [dragging]);

    // ─── Draw thermal grid on gridCanvasRef ───

    const drawThermalGrid = useCallback((): void => {
        const video = videoRef.current;
        const canvas = gridCanvasRef.current;
        if (!video || !canvas || !video.videoWidth) return;

        const w = video.videoWidth;
        const h = video.videoHeight;
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Layer 1: video frame
        ctx.drawImage(video, 0, 0, w, h);

        // Layer 2: thermal heatmap
        // Dense map path: direct colormap from full saliency array (FLIR style)
        // Sparse path (fallback): simpleheat from point array
        const renderDenseOverlay = hasDenseMap && decodedThermalMap && thermalMapWidth && thermalMapHeight;
        const renderSparseOverlay = !renderDenseOverlay && heatmapData.length > 0;

        // eslint-disable-next-line @typescript-eslint/no-unused-expressions -- IIFE rendering blocks
        renderDenseOverlay && (() => {
            const imgData = renderSaliencyMapDirect(
                decodedThermalMap,
                thermalMapWidth,
                thermalMapHeight,
                w,
                h,
                FLIR_LUT,
                sigmoidContrast,
                0.85,
            );
            const offscreen = document.createElement('canvas');
            offscreen.width = w;
            offscreen.height = h;
            const offCtx = offscreen.getContext('2d')!;
            offCtx.putImageData(imgData, 0, 0);
            ctx.drawImage(offscreen, 0, 0);
        })();

        // eslint-disable-next-line @typescript-eslint/no-unused-expressions -- IIFE rendering blocks
        renderSparseOverlay && (() => {
            const heatCanvas = document.createElement('canvas');
            heatCanvas.width = w;
            heatCanvas.height = h;
            const heat = simpleheat(heatCanvas);

            const r = Math.max(40, Math.round(Math.min(w, h) * 0.08));
            heat.radius(r, Math.round(r * 1.0));
            heat.gradient(THERMAL_GRADIENT);

            const points: Array<[number, number, number]> = heatmapData.map(p => [
                (p.x / 100) * w,
                (p.y / 100) * h,
                p.value ?? 0.5,
            ]);
            heat.data(points);
            heat.max(Math.max(0.3, ...heatmapData.map(p => p.value ?? 0.5)));
            heat.draw(0.15);

            ctx.globalAlpha = 0.85;
            ctx.drawImage(heatCanvas, 0, 0);
            ctx.globalAlpha = 1;
        })();

        // Layer 3: grid lines
        const cellW = w / cols;
        const cellH = h / rows;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 2;
        for (let r = 1; r < rows; r++) {
            const y = r * cellH;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(w, y);
            ctx.stroke();
        }
        for (let c = 1; c < cols; c++) {
            const x = c * cellW;
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, h);
            ctx.stroke();
        }

        // Layer 4: labels
        const pcts = computeGridPercentages(heatmapData, cols, rows);
        const fontSize = Math.max(14, Math.min(28, Math.min(cellW, cellH) * 0.18));
        ctx.font = `bold ${fontSize}px monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.shadowColor = 'rgba(0,0,0,1)';
        ctx.shadowBlur = 6;
        ctx.fillStyle = '#00ff00';
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const idx = r * cols + c;
                ctx.fillText(
                    `${String.fromCharCode(65 + c)}${r + 1}: ${pcts[idx]}%`,
                    c * cellW + cellW / 2,
                    (r + 1) * cellH - 8,
                );
            }
        }
        ctx.shadowBlur = 0;
    }, [heatmapData, cols, rows]);

    // ─── Draw spotlight/cold on canvasRef ───

    const paintOverlay = useCallback((): void => {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (!video || !canvas || !video.videoWidth) return;

        const w = video.videoWidth;
        const h = video.videoHeight;
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        if (mapMode === 'spotlight') {
            renderSpotlightComposite(ctx, video, w, h, heatmapData, {
                blurPx: spotlightSettings.blur,
                revealRadius: spotlightSettings.reveal,
                dimOpacity: spotlightSettings.dim / 100,
                threshold: settings.threshold,
            }, offscreenRef, maskRef, cachedMaskKeyRef);
            return;
        }

        if (mapMode === 'cold') {
            renderColdMapComposite(ctx, video, w, h, heatmapData, {
                intensity: coldSettings.intensity,
                blur: coldSettings.blur,
                threshold: coldSettings.threshold,
            }, coldHeatCanvasRef);
        }
    }, [mapMode, heatmapData, settings.threshold, spotlightSettings, coldSettings]);

    // ─── Draw on video load + redraw on changes ───

    const handleVideoLoaded = useCallback(() => {
        drawThermalGrid();
        paintOverlay();
    }, [drawThermalGrid, paintOverlay]);

    useEffect(() => {
        drawThermalGrid();
    }, [drawThermalGrid]);

    useEffect(() => {
        paintOverlay();
    }, [paintOverlay]);

    // Animation loop for spotlight/cold (need video frame each rAF)
    useEffect(() => {
        if (!isFullFrameMapMode(mapMode)) return;
        const loop = (): void => {
            const video = videoRef.current;
            if (video && !video.paused) paintOverlay();
            animRef.current = requestAnimationFrame(loop);
        };
        animRef.current = requestAnimationFrame(loop);
        return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
    }, [mapMode, paintOverlay]);

    const isFullFrame = isFullFrameMapMode(mapMode);
    const isClassic = mapMode === 'classic';

    // DEBUG — remove after verification
    console.log('[VideoAccumulatedHeatmapOverlay] MOUNTED', { mapMode, isClassic, heatmapPoints: heatmapData.length, cols, rows });

    return (
        <div className="flex flex-col h-full w-full">
            <div ref={containerRef} className="relative flex flex-1 min-h-0 items-center justify-center bg-black select-none">
                {/* Video — always present, visible on left side in classic */}
                <video
                    ref={videoRef}
                    src={videoUrl}
                    controls={!isClassic}
                    muted
                    playsInline
                    preload="metadata"
                    className="max-w-full max-h-full block"
                    style={{ visibility: isFullFrame ? 'hidden' : 'visible' }}
                    onLoadedData={handleVideoLoaded}
                />

                {/* Spotlight/Cold canvas — full frame modes */}
                <canvas
                    ref={canvasRef}
                    className="absolute top-0 left-0 w-full h-full pointer-events-none"
                    style={isFullFrame
                        ? { opacity: 1 }
                        : isClassic
                            ? { display: 'none' }
                            : {
                                opacity: settings.opacity / 100,
                                mixBlendMode: 'screen',
                            }}
                />

                {/* Thermal grid canvas — classic mode, clipped to right of divider */}
                {isClassic && (
                    <>
                        <canvas
                            ref={gridCanvasRef}
                            className="absolute top-0 left-0 w-full h-full pointer-events-none"
                            style={{ clipPath: `inset(0 0 0 ${splitPct}%)` }}
                        />

                        {/* Draggable divider */}
                        <div
                            className="absolute top-0 bottom-0 z-10 flex items-center"
                            style={{ left: `${splitPct}%`, transform: 'translateX(-50%)' }}
                        >
                            <div
                                className="w-5 h-full cursor-col-resize flex items-center justify-center group"
                                onMouseDown={handleDividerDown}
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
                    </>
                )}
            </div>

            {/* Grid size selector — classic mode only */}
            {isClassic && (
                <div className="flex items-center justify-center gap-1 px-3 py-1.5 bg-gray-900">
                    {GRID_OPTIONS.map((opt, i) => (
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
            )}
        </div>
    );
};
