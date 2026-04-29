/**
 * Attention Heatmap Overlay
 * Dwell-time heatmap: blue (low attention) → red (high attention).
 * Uses simpleheat with custom gradient on page screenshot.
 */

import { useEffect, useRef, useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Eye } from 'lucide-react';
import simpleheat from 'simpleheat';
import * as trackingService from '../../../services/tracking.service';
import { EmptyState } from '../../ui/EmptyState';

interface AttentionHeatmapOverlayProps {
    researchId: string;
    pageUrl?: string;
    screenshotUrl: string | null;
    device?: 'mobile' | 'tablet' | 'desktop';
}

export const AttentionHeatmapOverlay = ({
    researchId, pageUrl, screenshotUrl, device,
}: AttentionHeatmapOverlayProps) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const imgRef = useRef<HTMLImageElement | null>(null);
    const heatCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const [imageLoaded, setImageLoaded] = useState(false);
    const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 });

    const { data, isLoading } = useQuery({
        queryKey: ['tracking', researchId, 'attention', pageUrl, device],
        queryFn: () => trackingService.getAttentionHeatmap(researchId, pageUrl, device),
        staleTime: 10_000,
        enabled: !!screenshotUrl,
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

    const points = useMemo(() => {
        if (!data?.points || !naturalSize.width) return [];
        const w = naturalSize.width;
        const max = data.maxDwell || 1;
        return data.points.map(p => [
            (p.x / 100) * w,
            (p.y / 100) * w,
            p.dwell / max,
        ] as [number, number, number]);
    }, [data, naturalSize]);

    // Render
    useEffect(() => {
        if (!imageLoaded || !canvasRef.current || !imgRef.current || points.length === 0) return;

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

        // Blue tint overlay
        ctx.fillStyle = 'rgba(0, 120, 255, 0.35)';
        ctx.fillRect(0, 0, w, h);

        // Heatmap layer
        if (!heatCanvasRef.current || heatCanvasRef.current.width !== w || heatCanvasRef.current.height !== h) {
            heatCanvasRef.current = document.createElement('canvas');
            heatCanvasRef.current.width = w;
            heatCanvasRef.current.height = h;
        }
        const heatCanvas = heatCanvasRef.current;
        const heatCtx = heatCanvas.getContext('2d');
        if (heatCtx) heatCtx.clearRect(0, 0, w, h);

        const heat = simpleheat(heatCanvas);
        const r = Math.max(30, Math.round(Math.min(w, h) * 0.06));
        heat.radius(r, Math.round(r * 1.2));

        // Mouseflow-style attention gradient: blue → cyan → green → yellow → red
        heat.gradient({
            0.0: 'rgba(0,100,255,0)',
            0.15: '#0066ff',
            0.3: '#00ccff',
            0.45: '#00ff88',
            0.6: '#aaff00',
            0.75: '#ffcc00',
            0.9: '#ff4400',
            1.0: '#ff0000',
        });

        heat.data(points);
        heat.max(1);
        heat.draw(0.05);

        ctx.drawImage(heatCanvas, 0, 0);
    }, [imageLoaded, naturalSize, points]);

    if (isLoading) return <div className="h-64 bg-gray-100 rounded-lg animate-pulse" />;

    if (!screenshotUrl) {
        return (
            <div className="bg-gray-50 rounded-lg p-8 text-center">
                <Eye className="h-8 w-8 text-gray-400 mx-auto mb-3" />
                <p className="text-sm text-gray-600">Upload a screenshot to see the attention heatmap.</p>
            </div>
        );
    }

    if (!data || data.totalSessions === 0) {
        return (
            <EmptyState
                icon={<Eye className="h-8 w-8" />}
                description="No attention data yet. Enable mouse tracking to generate attention heatmaps."
            />
        );
    }

    return (
        <div>
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-slate-800">
                    Attention
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
            <div className="flex items-center gap-2 mt-2 justify-center">
                <span className="text-[10px] text-gray-500">Low attention</span>
                <div className="w-32 h-2 rounded-full" style={{
                    background: 'linear-gradient(to right, #0066ff, #00ccff, #00ff88, #ffcc00, #ff0000)',
                }} />
                <span className="text-[10px] text-gray-500">High attention</span>
            </div>
        </div>
    );
};
