/**
 * Page Snapshot Heatmap
 * Renders a captured DOM snapshot in a sandboxed iframe with a heatmap canvas overlay.
 * Scripts are stripped from the snapshot to prevent execution warnings.
 */

import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import simpleheat from 'simpleheat';
import * as trackingService from '../../../services/tracking.service';

interface PageSnapshotHeatmapProps {
    researchId: string;
    pageUrl: string;
    heatmapType: 'click' | 'scroll' | 'attention';
    device?: 'mobile' | 'tablet' | 'desktop';
}

/**
 * Strip all script-related content from HTML to prevent sandbox warnings.
 * Removes <script> tags, inline event handlers (onclick, onload, etc.), and javascript: URLs.
 */
const sanitizeSnapshot = (html: string): string => {
    let clean = html;
    // Remove <script>...</script> and <script ... />
    clean = clean.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    clean = clean.replace(/<script\b[^>]*\/>/gi, '');
    // Remove <noscript>...</noscript>
    clean = clean.replace(/<noscript\b[^<]*(?:(?!<\/noscript>)<[^<]*)*<\/noscript>/gi, '');
    // Remove inline event handlers (on*)
    clean = clean.replace(/\s+on\w+\s*=\s*"[^"]*"/gi, '');
    clean = clean.replace(/\s+on\w+\s*=\s*'[^']*'/gi, '');
    // Remove javascript: URLs
    clean = clean.replace(/href\s*=\s*"javascript:[^"]*"/gi, 'href="#"');
    clean = clean.replace(/href\s*=\s*'javascript:[^']*'/gi, "href='#'");
    return clean;
};

// Map scroll reach percentage to color (green=most viewed → red=least viewed)
const scrollPctToColor = (pct: number): string => {
    const stops = [
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
            const c = stops[i + 1].color.map((v, j) => Math.round(v + (stops[i].color[j] - v) * t));
            return `rgb(${c[0]},${c[1]},${c[2]})`;
        }
    }
    const last = stops[stops.length - 1].color;
    return `rgb(${last[0]},${last[1]},${last[2]})`;
};

export const PageSnapshotHeatmap = ({
    researchId,
    pageUrl,
    heatmapType,
    device,
}: PageSnapshotHeatmapProps) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const [iframeReady, setIframeReady] = useState(false);
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
    const [intensity, setIntensity] = useState(50);
    const [opacity, setOpacity] = useState(45);

    // Fetch snapshot HTML
    const { data: snapshotHtml } = useQuery({
        queryKey: ['tracking', researchId, 'snapshot', pageUrl],
        queryFn: () => trackingService.getPageSnapshot(researchId, pageUrl),
        staleTime: 60_000,
    });

    // Fetch heatmap data
    const { data: clickData } = useQuery({
        queryKey: ['tracking', researchId, 'heatmap', pageUrl, device || 'all'],
        queryFn: () => trackingService.getClickHeatmap(researchId, pageUrl, device),
        enabled: heatmapType === 'click' && !!snapshotHtml,
        staleTime: 10_000,
    });

    const { data: attentionData } = useQuery({
        queryKey: ['tracking', researchId, 'attention', pageUrl, device || 'all'],
        queryFn: () => trackingService.getAttentionHeatmap(researchId, pageUrl, device),
        enabled: heatmapType === 'attention' && !!snapshotHtml,
        staleTime: 10_000,
    });

    // Fetch scroll depth data
    const { data: scrollData } = useQuery({
        queryKey: ['tracking', researchId, 'scroll', pageUrl],
        queryFn: () => trackingService.getScrollDepth(researchId, pageUrl),
        enabled: heatmapType === 'scroll' && !!snapshotHtml,
        staleTime: 10_000,
    });

    // Sanitize and prepare srcdoc
    const srcdoc = useMemo(() => {
        if (!snapshotHtml) return '';
        const sanitized = sanitizeSnapshot(snapshotHtml);
        const injectStyle = `<style>
            * { pointer-events: none !important; user-select: none !important; }
            html, body { overflow: hidden !important; margin: 0 !important; }
        </style>`;
        return sanitized.replace('</head>', injectStyle + '</head>');
    }, [snapshotHtml]);

    // Measure dimensions from the iframe after load — use allow-same-origin for measurement
    const handleIframeLoad = useCallback(() => {
        const iframe = iframeRef.current;
        if (!iframe) return;
        try {
            const doc = iframe.contentDocument;
            if (doc) {
                const w = Math.max(doc.body?.scrollWidth || 0, doc.documentElement?.scrollWidth || 0);
                const h = Math.max(doc.body?.scrollHeight || 0, doc.documentElement?.scrollHeight || 0);
                if (w > 0 && h > 0) {
                    setDimensions({ width: w, height: h });
                    setIframeReady(true);
                    return;
                }
            }
        } catch {
            // Cross-origin fallback
        }
        // Fallback: use container width and 16:9 aspect ratio
        const containerW = containerRef.current?.clientWidth || 1200;
        setDimensions({ width: containerW, height: Math.round(containerW * 1.5) });
        setIframeReady(true);
    }, []);

    // Render heatmap overlay on canvas
    useEffect(() => {
        if (!iframeReady || !canvasRef.current || dimensions.width === 0) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const w = dimensions.width;
        const h = dimensions.height;
        canvas.width = w;
        canvas.height = h;

        if (heatmapType === 'scroll' && scrollData?.depths) {
            // Scroll depth: gradient bands over the snapshot
            const depths = scrollData.depths;
            if (depths.length === 0) return;
            const bandHeight = h / depths.length;

            for (let i = 0; i < depths.length; i++) {
                const d = depths[i];
                const y = i * bandHeight;
                const color = scrollPctToColor(d.percentage);
                ctx.fillStyle = color;
                ctx.globalAlpha = 0.55;
                ctx.fillRect(0, y, w, bandHeight);

                // Percentage label pill on right edge
                ctx.globalAlpha = 1;
                const label = `${d.percentage}%`;
                ctx.font = `bold ${Math.max(14, Math.round(w * 0.018))}px -apple-system, sans-serif`;
                ctx.textAlign = 'right';
                ctx.textBaseline = 'middle';
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

            // Divider lines
            ctx.globalAlpha = 0.3;
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 1;
            for (let i = 1; i < depths.length; i++) {
                const y = i * bandHeight;
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(w, y);
                ctx.stroke();
            }
            ctx.globalAlpha = 1;
            return;
        }

        // Click / Attention: dark overlay + simpleheat
        ctx.fillStyle = `rgba(0, 0, 0, ${opacity / 100})`;
        ctx.fillRect(0, 0, w, h);

        const heatCanvas = document.createElement('canvas');
        heatCanvas.width = w;
        heatCanvas.height = h;

        const heat = simpleheat(heatCanvas);
        const baseR = Math.max(20, Math.round(Math.min(w, h) * 0.04));
        const r = Math.round(baseR * (intensity / 50));
        heat.radius(r, Math.round(r * 0.9));

        if (heatmapType === 'click' && clickData?.clicks) {
            heat.gradient({
                0.15: '#0f0', 0.35: '#8f0', 0.5: '#ff0',
                0.7: '#f80', 0.85: '#f00', 1.0: '#fff',
            });
            const points: Array<[number, number, number]> = clickData.clicks.map(c => [
                (c.x / 100) * w, (c.y / 100) * w, c.count,
            ]);
            heat.data(points);
            heat.max(Math.max(3, Math.ceil(points.length * 0.05)));
            heat.draw(0.05);
        } else if (heatmapType === 'attention' && attentionData?.points) {
            heat.gradient({
                0.0: 'rgba(0,100,255,0)', 0.15: '#0066ff', 0.3: '#00ccff',
                0.45: '#00ff88', 0.6: '#aaff00', 0.75: '#ffcc00',
                0.9: '#ff4400', 1.0: '#ff0000',
            });
            const max = attentionData.maxDwell || 1;
            const points: Array<[number, number, number]> = attentionData.points.map(p => [
                (p.x / 100) * w, (p.y / 100) * w, p.dwell / max,
            ]);
            heat.data(points);
            heat.max(1);
            heat.draw(0.05);
        }

        ctx.drawImage(heatCanvas, 0, 0);
    }, [iframeReady, dimensions, heatmapType, clickData, attentionData, scrollData, intensity, opacity]);

    if (!snapshotHtml) {
        return (
            <div className="bg-gray-50 rounded-lg p-12 text-center">
                <p className="text-sm text-gray-500">No page snapshot captured yet.</p>
                <p className="text-xs text-gray-400 mt-1">Visit the tracked page to capture a DOM snapshot automatically.</p>
            </div>
        );
    }

    return (
        <div>
            {/* Sliders — not applicable for scroll overlay */}
            {heatmapType !== 'scroll' && (
            <div className="flex items-center gap-6 mb-2 px-1">
                <label className="flex items-center gap-2 text-[11px] text-slate-600">
                    Intensity
                    <input type="range" min={10} max={100} value={intensity} onChange={(e) => setIntensity(Number(e.target.value))} className="w-24 h-1 accent-blue-600" />
                </label>
                <label className="flex items-center gap-2 text-[11px] text-slate-600">
                    Opacity
                    <input type="range" min={0} max={80} value={opacity} onChange={(e) => setOpacity(Number(e.target.value))} className="w-24 h-1 accent-blue-600" />
                </label>
            </div>
            )}
        <div
            ref={containerRef}
            className="relative overflow-auto rounded-lg border border-gray-200 bg-gray-900"
            style={{ maxHeight: '70vh' }}
        >
            <iframe
                ref={iframeRef}
                srcDoc={srcdoc}
                sandbox="allow-same-origin allow-scripts"
                onLoad={handleIframeLoad}
                className="w-full border-0"
                style={{
                    height: dimensions.height > 0 ? dimensions.height : '100vh',
                    pointerEvents: 'none',
                }}
                title="Page snapshot"
            />

            {iframeReady && (
                <canvas
                    ref={canvasRef}
                    className="absolute top-0 left-0 pointer-events-none"
                    style={{ width: dimensions.width, height: dimensions.height }}
                />
            )}

            {!iframeReady && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                    <span className="text-gray-400 text-sm">Loading page snapshot...</span>
                </div>
            )}
        </div>
        </div>
    );
};
