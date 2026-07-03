import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import simpleheat from 'simpleheat';
import { cn } from '../../lib/utils';
import { mediaService } from '../../services/media.service';
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

// eslint-disable-next-line react-refresh/only-export-components
export const computeGridPercentages = (data: HeatmapPoint[], cols: number, rows: number): number[] => {
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

/* ─── Thermal blue heatmap (simpleheat, full coverage) ─── */

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

// eslint-disable-next-line react-refresh/only-export-components
export const paintThermalHeatmap = (
    targetCtx: CanvasRenderingContext2D,
    data: HeatmapPoint[],
    width: number,
    height: number,
): void => {
    if (data.length === 0) return;

    const heatCanvas = document.createElement('canvas');
    heatCanvas.width = width;
    heatCanvas.height = height;
    const heat = simpleheat(heatCanvas);

    // Large radius + high blur = continuous coverage, no gaps
    const r = Math.max(40, Math.round(Math.min(width, height) * 0.08));
    heat.radius(r, Math.round(r * 1.0));
    heat.gradient(THERMAL_GRADIENT);

    const points: Array<[number, number, number]> = data.map(p => [
        (p.x / 100) * width,
        (p.y / 100) * height,
        p.value ?? 0.5,
    ]);
    heat.data(points);
    heat.max(Math.max(0.3, ...data.map(p => p.value ?? 0.5)));

    // minOpacity 0.15 = cold zones show as dark blue, not transparent
    heat.draw(0.15);

    targetCtx.globalAlpha = 0.8;
    targetCtx.drawImage(heatCanvas, 0, 0);
    targetCtx.globalAlpha = 1;
};

/* ─── Renderers (pure, testeable) ─── */

// eslint-disable-next-line react-refresh/only-export-components
export const renderFrameWithHeatmap = (
    ctx: CanvasRenderingContext2D,
    frameSource: CanvasImageSource,
    data: HeatmapPoint[],
    width: number,
    height: number,
): void => {
    ctx.drawImage(frameSource, 0, 0, width, height);
    paintThermalHeatmap(ctx, data, width, height);
};

// eslint-disable-next-line react-refresh/only-export-components
export const renderGridComposite = (
    ctx: CanvasRenderingContext2D,
    frameSource: CanvasImageSource,
    data: HeatmapPoint[],
    width: number,
    height: number,
    cols: number,
    rows: number,
    pcts: number[],
): void => {
    const cellW = width / cols;
    const cellH = height / rows;

    // Frame + thermal heatmap
    renderFrameWithHeatmap(ctx, frameSource, data, width, height);

    // Grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 2;
    for (let r = 1; r < rows; r++) {
        const y = r * cellH;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
    }
    for (let c = 1; c < cols; c++) {
        const x = c * cellW;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
    }

    // Labels — scale font to cell size, dark pill background, abbreviate when tight
    const cellRef = Math.min(cellW, cellH);
    const fontSize = Math.max(10, Math.min(28, cellRef * 0.18));
    const labelPad = Math.max(4, cellRef * 0.06);
    ctx.font = `bold ${fontSize}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.shadowBlur = 0;
    const maxTextW = cellW * 0.9;
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const idx = r * cols + c;
            const full = `${String.fromCharCode(65 + c)}${r + 1}: ${pcts[idx]}%`;
            const short = `${pcts[idx]}%`;
            const label = ctx.measureText(full).width <= maxTextW ? full
                : ctx.measureText(short).width <= maxTextW ? short
                : null;
            if (!label) continue;
            const tx = c * cellW + cellW / 2;
            const ty = (r + 1) * cellH - labelPad;
            const tw = ctx.measureText(label).width;
            const pillPad = Math.max(3, fontSize * 0.25);
            // Dark pill behind text
            ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
            ctx.beginPath();
            const rx = tx - tw / 2 - pillPad;
            const ry = ty - fontSize - pillPad;
            const rw = tw + pillPad * 2;
            const rh = fontSize + pillPad * 2;
            const radius = Math.min(4, rh / 3);
            ctx.roundRect(rx, ry, rw, rh, radius);
            ctx.fill();
            // Text
            ctx.fillStyle = '#00ff00';
            ctx.fillText(label, tx, ty);
        }
    }
};

/* ─── Component ─── */

interface AoiTimeRangeIndicator {
    aoiId: string;
    color: string;
    startTime: number;
    endTime: number;
}

interface VideoFrameScrubberProps {
    videoUrl: string;
    frames: VideoFrameData[];
    settings: HeatmapSettings;
    mapMode: string;
    spotlightSettings: unknown;
    coldSettings: unknown;
    initialGridIndex?: number;
    aoiTimeRanges?: AoiTimeRangeIndicator[];
}

export const VideoFrameScrubber = ({
    videoUrl,
    frames,
    initialGridIndex,
    aoiTimeRanges,
}: VideoFrameScrubberProps) => {
    const [frameIdx, setFrameIdx] = useState(0);
    const [playing, setPlaying] = useState(false);
    const [splitPct, setSplitPct] = useState(50);
    const [gridSize, setGridSize] = useState(initialGridIndex ?? 1);
    const [dragging, setDragging] = useState(false);
    const [frameUrls, setFrameUrls] = useState<Record<string, string>>({});

    const containerRef = useRef<HTMLDivElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const gridCanvasRef = useRef<HTMLCanvasElement>(null);
    const frameImgRef = useRef<HTMLImageElement>(null);
    const playIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const activeFrame = frames[frameIdx] || frames[0];
    const frameData = useMemo(() => activeFrame?.heatmapData || [], [activeFrame]);
    const frameImageUrl = activeFrame ? (frameUrls[activeFrame.mediaId] ?? '') : '';
    const { cols, rows } = GRID_OPTIONS[gridSize];

    // ─── Resolve frame URLs ───

    useEffect(() => {
        const resolved: Record<string, string> = {};
        let cancelled = false;
        Promise.all(
            frames.map(async (f) => {
                try {
                    const { url } = await mediaService.getMediaUrl(f.mediaId);
                    resolved[f.mediaId] = url;
                } catch { /* skip */ }
            }),
        ).then(() => { if (!cancelled) setFrameUrls(resolved); });
        return () => { cancelled = true; };
    }, [frames]);

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

    // ─── Draw grid canvas ───

    const drawGrid = useCallback(() => {
        const img = frameImgRef.current;
        const canvas = gridCanvasRef.current;
        if (!img || !canvas || !img.naturalWidth) return;

        // Draw at display resolution for crisp labels on HiDPI screens
        const rect = canvas.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        const w = Math.round(rect.width * dpr) || img.naturalWidth;
        const h = Math.round(rect.height * dpr) || img.naturalHeight;
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const pcts = computeGridPercentages(frameData, cols, rows);
        renderGridComposite(ctx, img, frameData, w, h, cols, rows, pcts);
    }, [frameData, cols, rows]);

    const handleImgLoad = useCallback(() => { drawGrid(); }, [drawGrid]);
    useEffect(() => { drawGrid(); }, [drawGrid]);

    // DEBUG
    console.log('[VideoFrameScrubber] MOUNTED', {
        framesCount: frames.length,
        frameIdx,
        frameImageUrl: frameImageUrl ? frameImageUrl.substring(0, 60) : '(empty)',
        heatmapPoints: frameData.length,
        frameUrlsResolved: Object.keys(frameUrls).length,
    });

    // ─── Playback ───

    const togglePlay = useCallback(() => {
        if (playing) {
            if (playIntervalRef.current) clearInterval(playIntervalRef.current);
            playIntervalRef.current = null;
            setPlaying(false);
            return;
        }
        setPlaying(true);
        playIntervalRef.current = setInterval(() => {
            setFrameIdx(prev => {
                const next = prev + 1;
                if (next >= frames.length) {
                    if (playIntervalRef.current) clearInterval(playIntervalRef.current);
                    playIntervalRef.current = null;
                    setPlaying(false);
                    return prev;
                }
                return next;
            });
        }, 2000);
    }, [playing, frames.length]);

    useEffect(() => {
        return () => { if (playIntervalRef.current) clearInterval(playIntervalRef.current); };
    }, []);

    // ─── Sync video to current frame timestamp ───

    useEffect(() => {
        const video = videoRef.current;
        if (!video || !activeFrame) return;
        video.currentTime = activeFrame.timestamp;
    }, [frameIdx, activeFrame]);

    return (
        <div className="flex flex-col h-full">
            {/* Main viewport: left = video, right = grid+heatmap */}
            <div ref={containerRef} className="flex-1 min-h-0 relative bg-black flex items-center justify-center select-none">
                {/* Video — left side, original clean */}
                <video
                    ref={videoRef}
                    src={videoUrl}
                    className="max-w-full max-h-full block"
                    muted
                    playsInline
                    preload="metadata"
                />

                {/* Hidden img — loads frame PNG for canvas drawing */}
                {frameImageUrl && (
                    <img
                        ref={frameImgRef}
                        src={frameImageUrl}
                        alt=""
                        className="hidden"
                        onLoad={handleImgLoad}
                    />
                )}

                {/* Grid canvas — covers the video area */}
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

                <div className="flex-1 relative">
                    {aoiTimeRanges && aoiTimeRanges.length > 0 && frames.length > 1 && (() => {
                        const totalDuration = (frames[frames.length - 1]?.timestamp ?? 0) + 2;
                        return aoiTimeRanges.map((r, i) => (
                            <div
                                key={r.aoiId}
                                className="absolute rounded-sm pointer-events-none"
                                style={{
                                    left: `${(r.startTime / totalDuration) * 100}%`,
                                    width: `${((r.endTime - r.startTime) / totalDuration) * 100}%`,
                                    top: `${-4 - i * 3}px`,
                                    height: '2px',
                                    backgroundColor: r.color,
                                    opacity: 0.7,
                                }}
                            />
                        ));
                    })()}
                    <input
                        type="range"
                        min={0}
                        max={frames.length - 1}
                        value={frameIdx}
                        onChange={e => setFrameIdx(Number(e.target.value))}
                        className="w-full accent-blue-500 h-1"
                    />
                </div>

                {/* Grid size selector */}
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
