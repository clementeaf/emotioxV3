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
    heatmapType: 'click' | 'attention';
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

        // Dark overlay — controlled by opacity slider
        ctx.fillStyle = `rgba(0, 0, 0, ${opacity / 100})`;
        ctx.fillRect(0, 0, w, h);

        // Build heatmap — radius controlled by intensity slider
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
                (c.x / 100) * w, (c.y / 100) * h, c.count,
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
                (p.x / 100) * w, (p.y / 100) * h, p.dwell / max,
            ]);
            heat.data(points);
            heat.max(1);
            heat.draw(0.05);
        }

        ctx.drawImage(heatCanvas, 0, 0);
    }, [iframeReady, dimensions, heatmapType, clickData, attentionData, intensity, opacity]);

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
            {/* Sliders */}
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
