import { useCallback, useEffect, useRef } from 'react';
import {
    isFullFrameMapMode,
    type ColdMapSettings,
    type HeatmapMapMode,
    type SpotlightSettings,
} from '../../utils/attentionPrediction.utils';
import { renderColdMapComposite } from '../../utils/coldMapRender';
import { renderSpotlightComposite } from '../../utils/spotlightRender';

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
}

/** Blue→violet radial gradient RGBA tuples for video heatmap (center → edge) */
export const VIDEO_HEATMAP_COLORS = {
    center: [170, 34, 221] as const,  // violet
    mid:    [119, 68, 238] as const,  // blue-violet
    edge:   [85, 153, 255] as const,  // blue
} as const;

/**
 * Renders accumulated heatmap overlay on a video when per-frame data is unavailable.
 */
export const VideoAccumulatedHeatmapOverlay = ({
    videoUrl,
    heatmapData,
    settings,
    mapMode,
    spotlightSettings,
    coldSettings,
}: VideoAccumulatedHeatmapOverlayProps) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const offscreenRef = useRef<HTMLCanvasElement | null>(null);
    const maskRef = useRef<HTMLCanvasElement | null>(null);
    const coldHeatCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const cachedMaskKeyRef = useRef('');
    const animRef = useRef<number | null>(null);

    const drawClassicHeatmap = useCallback((
        ctx: CanvasRenderingContext2D,
        data: HeatmapPoint[],
        canvasW: number,
        canvasH: number,
    ): void => {
        ctx.clearRect(0, 0, canvasW, canvasH);
        if (data.length === 0) {
            return;
        }

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

        for (const point of data) {
            const x = (point.x / 100) * canvasW;
            const y = (point.y / 100) * canvasH;
            const val = point.value ?? 0.5;
            if (val < minVal) {
                continue;
            }

            const grad = ctx.createRadialGradient(x, y, 0, x, y, radius);
            const centerAlpha = val * (isRefined ? (isLab ? 0.45 : 0.55) : 0.55);
            const [cr, cg, cb] = VIDEO_HEATMAP_COLORS.center;
            const [mr, mg, mb] = VIDEO_HEATMAP_COLORS.mid;
            const [er, eg, eb] = VIDEO_HEATMAP_COLORS.edge;
            grad.addColorStop(0, `rgba(${cr}, ${cg}, ${cb}, ${centerAlpha})`);
            grad.addColorStop(0.4, `rgba(${mr}, ${mg}, ${mb}, ${val * 0.25})`);
            grad.addColorStop(0.7, `rgba(${er}, ${eg}, ${eb}, ${val * 0.1})`);
            grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            ctx.fill();
        }
    }, [settings.blur, settings.threshold, settings.preset]);

    const paintOverlay = useCallback((): void => {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (!video || !canvas || !video.videoWidth) {
            return;
        }

        const w = video.videoWidth;
        const h = video.videoHeight;
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            return;
        }

        if (mapMode === 'spotlight') {
            renderSpotlightComposite(
                ctx,
                video,
                w,
                h,
                heatmapData,
                {
                    blurPx: spotlightSettings.blur,
                    revealRadius: spotlightSettings.reveal,
                    dimOpacity: spotlightSettings.dim / 100,
                    threshold: settings.threshold,
                },
                offscreenRef,
                maskRef,
                cachedMaskKeyRef,
            );
            return;
        }

        if (mapMode === 'cold') {
            renderColdMapComposite(
                ctx,
                video,
                w,
                h,
                heatmapData,
                {
                    intensity: coldSettings.intensity,
                    blur: coldSettings.blur,
                    threshold: coldSettings.threshold,
                },
                coldHeatCanvasRef,
            );
            return;
        }

        drawClassicHeatmap(ctx, heatmapData, w, h);
    }, [
        mapMode,
        heatmapData,
        settings.threshold,
        spotlightSettings,
        coldSettings,
        drawClassicHeatmap,
    ]);

    useEffect(() => {
        paintOverlay();
    }, [paintOverlay]);

    useEffect(() => {
        if (!isFullFrameMapMode(mapMode)) {
            return;
        }

        const loop = (): void => {
            const video = videoRef.current;
            if (video && !video.paused) {
                paintOverlay();
            }
            animRef.current = requestAnimationFrame(loop);
        };

        animRef.current = requestAnimationFrame(loop);
        return () => {
            if (animRef.current) {
                cancelAnimationFrame(animRef.current);
            }
        };
    }, [mapMode, paintOverlay]);

    const isFullFrame = isFullFrameMapMode(mapMode);

    return (
        <div className="relative flex h-full min-h-0 flex-1 items-center justify-center bg-black">
            <video
                ref={videoRef}
                src={videoUrl}
                controls
                muted
                playsInline
                preload="metadata"
                className="max-w-full max-h-full block"
                style={{ visibility: isFullFrame ? 'hidden' : 'visible' }}
                onLoadedData={paintOverlay}
            />
            <canvas
                ref={canvasRef}
                className="absolute top-0 left-0 w-full h-full pointer-events-none"
                style={isFullFrame
                    ? { opacity: 1 }
                    : {
                        opacity: settings.opacity / 100,
                        mixBlendMode: 'screen',
                    }}
            />
        </div>
    );
};
