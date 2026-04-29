/**
 * Scroll Heatmap Overlay
 * Renders a gradient overlay on a page screenshot showing scroll depth reach.
 * Green (top, most viewed) → yellow → red/pink (bottom, least viewed).
 * Shows percentage labels per zone like Mouseflow.
 */

import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowDownUp } from 'lucide-react';
import * as trackingService from '../../../services/tracking.service';
import { EmptyState } from '../../ui/EmptyState';

interface ScrollHeatmapOverlayProps {
    researchId: string;
    pageUrl?: string;
    screenshotUrl: string | null;
}

// Interpolate between two [r,g,b] colors
const lerp3 = (a: number[], b: number[], t: number): number[] =>
    a.map((v, i) => Math.round(v + (b[i] - v) * t));

// Map percentage (100=all viewers, 0=none) to color
// 100% → green, 70% → yellow, 40% → orange, 0% → red/pink
const pctToColor = (pct: number): string => {
    const stops: Array<{ at: number; color: number[] }> = [
        { at: 100, color: [134, 239, 172] }, // green-300
        { at: 75, color: [253, 224, 71] },   // yellow-300
        { at: 50, color: [251, 146, 60] },   // orange-300
        { at: 25, color: [252, 165, 165] },  // red-300
        { at: 0, color: [253, 164, 175] },   // rose-300
    ];
    for (let i = 0; i < stops.length - 1; i++) {
        if (pct >= stops[i + 1].at) {
            const range = stops[i].at - stops[i + 1].at;
            const t = range > 0 ? (pct - stops[i + 1].at) / range : 0;
            const c = lerp3(stops[i + 1].color, stops[i].color, t);
            return `rgb(${c[0]},${c[1]},${c[2]})`;
        }
    }
    return `rgb(${stops[stops.length - 1].color.join(',')})`;
};

export const ScrollHeatmapOverlay = ({ researchId, pageUrl, screenshotUrl }: ScrollHeatmapOverlayProps) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [imageLoaded, setImageLoaded] = useState(false);
    const imgRef = useRef<HTMLImageElement | null>(null);
    const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 });

    const { data, isLoading } = useQuery({
        queryKey: ['tracking', researchId, 'scroll', pageUrl],
        queryFn: () => trackingService.getScrollDepth(researchId, pageUrl),
        staleTime: 10_000,
    });

    // Load screenshot
    useEffect(() => {
        if (!screenshotUrl) return;
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = screenshotUrl;
        img.onload = () => {
            setNaturalSize({ width: img.naturalWidth, height: img.naturalHeight });
            imgRef.current = img;
            setImageLoaded(true);
        };
        return () => { img.onload = null; img.src = ''; imgRef.current = null; setImageLoaded(false); };
    }, [screenshotUrl]);

    // Render overlay
    useEffect(() => {
        if (!imageLoaded || !canvasRef.current || !imgRef.current || !data?.depths) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const img = imgRef.current;
        const w = naturalSize.width;
        const h = naturalSize.height;
        canvas.width = w;
        canvas.height = h;

        // Draw screenshot
        ctx.drawImage(img, 0, 0);

        // Draw scroll depth bands
        const depths = data.depths;
        const bandCount = depths.length;
        if (bandCount === 0) return;

        const bandHeight = h / bandCount;

        for (let i = 0; i < bandCount; i++) {
            const d = depths[i];
            const y = i * bandHeight;
            const color = pctToColor(d.percentage);

            // Semi-transparent color band
            ctx.fillStyle = color;
            ctx.globalAlpha = 0.55;
            ctx.fillRect(0, y, w, bandHeight);

            // Percentage label on right edge
            ctx.globalAlpha = 1;
            const label = `${d.percentage}%`;
            ctx.font = `bold ${Math.max(14, Math.round(w * 0.018))}px -apple-system, sans-serif`;
            ctx.textAlign = 'right';
            ctx.textBaseline = 'middle';

            // Background pill for label
            const labelY = y + bandHeight / 2;
            const labelX = w - 12;
            const metrics = ctx.measureText(label);
            const pillW = metrics.width + 16;
            const pillH = Math.max(20, Math.round(w * 0.022));

            ctx.fillStyle = 'rgba(0,0,0,0.6)';
            ctx.beginPath();
            ctx.roundRect(labelX - pillW, labelY - pillH / 2, pillW + 4, pillH, 4);
            ctx.fill();

            ctx.fillStyle = '#fff';
            ctx.fillText(label, labelX, labelY + 1);
        }

        // Divider lines between bands
        ctx.globalAlpha = 0.3;
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        for (let i = 1; i < bandCount; i++) {
            const y = i * bandHeight;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(w, y);
            ctx.stroke();
        }
        ctx.globalAlpha = 1;

    }, [imageLoaded, naturalSize, data]);

    if (isLoading) return <div className="h-64 bg-gray-100 rounded-lg animate-pulse" />;

    if (!data || data.totalSessions === 0) {
        return (
            <EmptyState
                icon={<ArrowDownUp className="h-8 w-8" />}
                description="No scroll data yet. Enable scroll tracking in configuration."
            />
        );
    }

    if (!screenshotUrl) {
        return (
            <div className="bg-gray-50 rounded-lg p-8 text-center">
                <ArrowDownUp className="h-8 w-8 text-gray-400 mx-auto mb-3" />
                <p className="text-sm text-gray-600 mb-1">Upload a screenshot to see scroll depth overlay.</p>
                <p className="text-xs text-gray-400">{data.totalSessions} sessions with scroll data available.</p>
            </div>
        );
    }

    return (
        <div>
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-slate-800">
                    Scroll Depth
                    <span className="ml-2 text-xs font-normal text-gray-500">
                        {data.totalSessions} sessions
                    </span>
                </h3>
            </div>
            <div className="relative overflow-hidden rounded-lg shadow-sm border">
                <canvas
                    ref={canvasRef}
                    className="max-h-[70vh] w-auto max-w-full block mx-auto"
                />
                {!imageLoaded && (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                        <span className="text-gray-400">Loading image...</span>
                    </div>
                )}
            </div>
            {/* Color scale legend */}
            <div className="flex items-center gap-2 mt-2 justify-center">
                <span className="text-[10px] text-gray-500">Most viewed</span>
                <div className="w-32 h-2 rounded-full" style={{
                    background: 'linear-gradient(to right, rgb(134,239,172), rgb(253,224,71), rgb(251,146,60), rgb(253,164,175))',
                }} />
                <span className="text-[10px] text-gray-500">Least viewed</span>
            </div>
        </div>
    );
};
