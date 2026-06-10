import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { cn } from '../../lib/utils';
import { isFullFrameMapMode, type HeatmapMapMode, type SpotlightSettings, type ColdMapSettings } from '../../utils/attentionPrediction.utils';
import { renderColdMapComposite } from '../../utils/coldMapRender';
import { renderSpotlightComposite } from '../../utils/spotlightRender';
import type { HeatmapPoint, HeatmapSettings } from './HeatmapSettingsModal';

/* ─── Types ─── */

export interface VideoFrameData {
    mediaId: string;
    timestamp: number;
    heatmapData?: HeatmapPoint[];
}

/* ─── Grid helpers ─── */

const GRID_OPTIONS = [
    { label: '2×2', cols: 2, rows: 2 },
    { label: '3×3', cols: 3, rows: 3 },
    { label: '4×4', cols: 4, rows: 4 },
    { label: '5×5', cols: 5, rows: 5 },
];

const computeGridPercentages = (data: HeatmapPoint[], cols: number, rows: number): number[] => {
    const cells = new Array(cols * rows).fill(0);
    let total = 0;
    for (const p of data) {
        const col = Math.min(Math.floor((p.x / 100) * cols), cols - 1);
        const row = Math.min(Math.floor((p.y / 100) * rows), rows - 1);
        const val = p.value ?? 1;
        cells[row * cols + col] += val;
        total += val;
    }
    if (total === 0) return cells;
    return cells.map(v => Math.round((v / total) * 1000) / 10);
};

/* ─── Component ─── */

interface VideoFrameScrubberProps {
    videoUrl: string;
    frames: VideoFrameData[];
    settings: HeatmapSettings;
    mapMode: HeatmapMapMode;
    spotlightSettings: SpotlightSettings;
    coldSettings: ColdMapSettings;
}

export const VideoFrameScrubber = ({
    videoUrl,
    frames,
    settings,
    mapMode,
    spotlightSettings,
    coldSettings,
}: VideoFrameScrubberProps) => {
    const [frameIdx, setFrameIdx] = useState(0);
    const [playing, setPlaying] = useState(false);
    const [splitPct, setSplitPct] = useState(50);
    const [gridSize, setGridSize] = useState(1);
    const [dragging, setDragging] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    const heatCanvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const offscreenRef = useRef<HTMLCanvasElement | null>(null);
    const maskRef = useRef<HTMLCanvasElement | null>(null);
    const coldHeatCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const cachedMaskKeyRef = useRef('');
    const animRef = useRef<number | null>(null);
    const lastIdxRef = useRef(0);
    const activeFrame = frames[frameIdx] || frames[0];
    const frameData = useMemo(() => activeFrame?.heatmapData || [], [activeFrame]);
    const { cols, rows } = GRID_OPTIONS[gridSize];
    const gridPcts = useMemo(() => computeGridPercentages(frameData, cols, rows), [frameData, cols, rows]);

    // Divider drag
    const handleDividerDown = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        setDragging(true);
    }, []);

    useEffect(() => {
        if (!dragging) return;
        const onMove = (e: MouseEvent) => {
            const container = containerRef.current;
            if (!container) return;
            const rect = container.getBoundingClientRect();
            const pct = Math.max(10, Math.min(90, ((e.clientX - rect.left) / rect.width) * 100));
            setSplitPct(pct);
        };
        const onUp = () => setDragging(false);
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
        return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
    }, [dragging]);

    const findFrameIdx = useCallback((time: number) => {
        let best = 0;
        let bestDist = Math.abs(frames[0]?.timestamp - time);
        for (let i = 1; i < frames.length; i++) {
            const dist = Math.abs(frames[i].timestamp - time);
            if (dist < bestDist) { best = i; bestDist = dist; }
        }
        return best;
    }, [frames]);

    // ─── Draw methods ───

    const drawHeatmap = useCallback((data: HeatmapPoint[], canvasW: number, canvasH: number) => {
        const canvas = heatCanvasRef.current;
        if (!canvas) return;
        canvas.width = canvasW;
        canvas.height = canvasH;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.clearRect(0, 0, canvasW, canvasH);
        if (data.length === 0) return;

        const isLab = settings.preset === 'Lab';
        const isPrecise = settings.preset !== 'Smooth';
        const isRefined = isLab || settings.preset === 'Precise';
        const minDim = Math.min(canvasW, canvasH);
        const radius = isLab
            ? Math.max(10, minDim * 0.032)
            : isPrecise
                ? Math.max(14, minDim * 0.042 * Math.max(0.65, settings.blur / 10))
                : Math.max(minDim * 0.08, minDim * (settings.blur / 100) * 0.8);
        const minVal = isRefined
            ? Math.max(settings.threshold / 100, isLab ? 0.58 : 0.45)
            : settings.threshold / 100;

        for (const p of data) {
            const x = (p.x / 100) * canvasW;
            const y = (p.y / 100) * canvasH;
            const val = p.value ?? 0.5;
            if (val < minVal) continue;

            const grad = ctx.createRadialGradient(x, y, 0, x, y, radius);
            if (isRefined) {
                grad.addColorStop(0, `rgba(255, 40, 0, ${val * (isLab ? 0.45 : 0.55)})`);
                grad.addColorStop(0.4, `rgba(255, 120, 0, ${val * 0.25})`);
                grad.addColorStop(0.7, `rgba(255, 200, 0, ${val * 0.1})`);
                grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
            } else {
                grad.addColorStop(0, `rgba(255, 0, 0, ${val * 0.55})`);
                grad.addColorStop(0.35, `rgba(255, 140, 0, ${val * 0.3})`);
                grad.addColorStop(0.65, `rgba(100, 220, 0, ${val * 0.12})`);
                grad.addColorStop(1, 'rgba(0, 0, 255, 0)');
            }
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            ctx.fill();
        }
    }, [settings.blur, settings.threshold, settings.preset]);

    const drawSpotlight = useCallback((data: HeatmapPoint[], canvasW: number, canvasH: number) => {
        const canvas = heatCanvasRef.current;
        const video = videoRef.current;
        if (!canvas || !video) return;
        canvas.width = canvasW;
        canvas.height = canvasH;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        renderSpotlightComposite(ctx, video, canvasW, canvasH, data, {
            blurPx: spotlightSettings.blur,
            revealRadius: spotlightSettings.reveal,
            dimOpacity: spotlightSettings.dim / 100,
            threshold: settings.threshold,
        }, offscreenRef, maskRef, cachedMaskKeyRef);
    }, [spotlightSettings.blur, spotlightSettings.reveal, spotlightSettings.dim, settings.threshold]);

    const drawCold = useCallback((data: HeatmapPoint[], canvasW: number, canvasH: number) => {
        const canvas = heatCanvasRef.current;
        const video = videoRef.current;
        if (!canvas || !video) return;
        canvas.width = canvasW;
        canvas.height = canvasH;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        renderColdMapComposite(ctx, video, canvasW, canvasH, data, {
            intensity: coldSettings.intensity,
            blur: coldSettings.blur,
            threshold: coldSettings.threshold,
        }, coldHeatCanvasRef);
    }, [coldSettings.intensity, coldSettings.blur, coldSettings.threshold]);

    const drawOverlay = useCallback((data: HeatmapPoint[], canvasW: number, canvasH: number) => {
        if (mapMode === 'spotlight') { drawSpotlight(data, canvasW, canvasH); return; }
        if (mapMode === 'cold') { drawCold(data, canvasW, canvasH); return; }
        drawHeatmap(data, canvasW, canvasH);
    }, [mapMode, drawHeatmap, drawSpotlight, drawCold]);

    // ─── Sync loop ───

    const syncLoopRef = useRef<() => void>(() => {});
    useEffect(() => {
        syncLoopRef.current = () => {
            const video = videoRef.current;
            if (!video || video.paused) return;
            const idx = findFrameIdx(video.currentTime);
            if (idx !== lastIdxRef.current) {
                lastIdxRef.current = idx;
                setFrameIdx(idx);
            }
            const fd = frames[idx]?.heatmapData || [];
            drawOverlay(fd, video.videoWidth, video.videoHeight);
            animRef.current = requestAnimationFrame(() => syncLoopRef.current());
        };
    }, [findFrameIdx, frames, drawOverlay]);

    const togglePlay = useCallback(() => {
        const video = videoRef.current;
        if (!video) return;
        if (video.paused) {
            video.play();
            setPlaying(true);
            animRef.current = requestAnimationFrame(() => syncLoopRef.current());
        } else {
            video.pause();
            setPlaying(false);
            if (animRef.current) cancelAnimationFrame(animRef.current);
        }
    }, []);

    useEffect(() => {
        return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
    }, []);

    const handleSeek = (idx: number) => {
        setFrameIdx(idx);
        lastIdxRef.current = idx;
        const t = frames[idx]?.timestamp ?? 0;
        if (videoRef.current) videoRef.current.currentTime = t;
        const fd = frames[idx]?.heatmapData || [];
        if (videoRef.current) drawOverlay(fd, videoRef.current.videoWidth, videoRef.current.videoHeight);
    };

    const handleLoaded = () => {
        const video = videoRef.current;
        if (!video) return;
        const fd = frames[0]?.heatmapData || [];
        drawOverlay(fd, video.videoWidth, video.videoHeight);
    };

    useEffect(() => {
        const video = videoRef.current;
        if (!video || !video.videoWidth) return;
        const fd = frames[frameIdx]?.heatmapData || [];
        drawOverlay(fd, video.videoWidth, video.videoHeight);
    }, [mapMode, spotlightSettings, coldSettings, settings, frameIdx, frames, drawOverlay]);

    const isFullFrameOverlay = isFullFrameMapMode(mapMode);

    return (
        <div className="flex flex-col h-full">
            <div ref={containerRef} className="flex-1 min-h-0 relative bg-black flex items-center justify-center select-none">
                <video
                    ref={videoRef}
                    src={videoUrl}
                    className="max-w-full max-h-full block"
                    muted
                    playsInline
                    onLoadedData={handleLoaded}
                    onEnded={() => setPlaying(false)}
                    style={{ visibility: isFullFrameOverlay ? 'hidden' : 'visible' }}
                />

                <canvas
                    ref={heatCanvasRef}
                    className="absolute top-0 left-0 w-full h-full pointer-events-none"
                    style={isFullFrameOverlay
                        ? { opacity: 1 }
                        : {
                            clipPath: `inset(0 0 0 ${splitPct}%)`,
                            opacity: settings.opacity / 100,
                            mixBlendMode: 'screen',
                        }}
                />

                {mapMode === 'classic' && (
                    <>
                        {/* Dynamic grid */}
                        <div
                            className="absolute top-0 bottom-0 pointer-events-none"
                            style={{
                                left: `${splitPct}%`,
                                right: 0,
                                display: 'grid',
                                gridTemplateColumns: `repeat(${cols}, 1fr)`,
                                gridTemplateRows: `repeat(${rows}, 1fr)`,
                            }}
                        >
                            {gridPcts.map((pct, i) => (
                                <div key={i} className="border border-white/30 flex items-end justify-center pb-1">
                                    <span className="text-[11px] font-bold px-1.5 py-0.5 rounded"
                                        style={{
                                            color: '#00ff00',
                                            textShadow: '0 0 4px rgba(0,0,0,0.9), 0 0 2px rgba(0,0,0,0.7)',
                                        }}
                                    >
                                        Q{i + 1}: {pct}%
                                    </span>
                                </div>
                            ))}
                        </div>

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

            {/* Controls bar */}
            <div className="flex items-center gap-3 px-3 py-2 bg-gray-900 rounded-b-lg">
                <button
                    onClick={togglePlay}
                    className="text-white hover:text-blue-400 transition-colors flex-shrink-0"
                    title={playing ? 'Pause' : 'Play'}
                >
                    {playing ? (
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></svg>
                    ) : (
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                    )}
                </button>
                <input
                    type="range"
                    min={0}
                    max={frames.length - 1}
                    value={frameIdx}
                    onChange={e => handleSeek(Number(e.target.value))}
                    className="flex-1 accent-blue-500 h-1"
                />
                <div className="flex items-center gap-1 flex-shrink-0">
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
                <span className="text-xs text-gray-400 font-mono w-12 text-right flex-shrink-0">
                    {activeFrame ? `${activeFrame.timestamp.toFixed(1)}s` : '—'}
                </span>
            </div>
        </div>
    );
};
