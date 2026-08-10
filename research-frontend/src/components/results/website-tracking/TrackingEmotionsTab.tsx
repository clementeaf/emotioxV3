/**
 * TrackingEmotionsTab
 * Displays facial emotion analytics for Website Tracking sessions.
 * Layout: distribution bars + circumplex + valence/arousal timeline + session list.
 */

import { useRef, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { SmilePlus, Video } from 'lucide-react';
import * as trackingService from '../../../services/tracking.service';
import type { TrackingEmotionData } from '../../../services/tracking.service';

type EkmanEmotion = 'joy' | 'sadness' | 'surprise' | 'anger' | 'disgust' | 'fear' | 'neutral';

const EMOTION_LABELS: Record<EkmanEmotion, string> = {
    neutral: 'Neutral', joy: 'Happy', sadness: 'Sad',
    anger: 'Angry', surprise: 'Surprised', fear: 'Scared', disgust: 'Disgusted',
};

const EMOTION_COLORS: Record<EkmanEmotion, string> = {
    neutral: '#94a3b8', joy: '#22c55e', sadness: '#3b82f6',
    anger: '#ef4444', surprise: '#f59e0b', fear: '#8b5cf6', disgust: '#6366f1',
};

const ALL_EMOTIONS: EkmanEmotion[] = ['neutral', 'joy', 'sadness', 'anger', 'surprise', 'fear', 'disgust'];

const VA_MAP: Record<EkmanEmotion, { v: number; a: number }> = {
    neutral: { v: 0.0, a: 0.0 }, joy: { v: 0.8, a: 0.5 },
    sadness: { v: -0.6, a: -0.4 }, anger: { v: -0.7, a: 0.7 },
    surprise: { v: 0.2, a: 0.8 }, fear: { v: -0.8, a: 0.6 },
    disgust: { v: -0.7, a: 0.2 },
};

interface TrackingEmotionsTabProps {
    researchId: string;
    selectedPageUrl?: string;
}

export const TrackingEmotionsTab = ({ researchId, selectedPageUrl }: TrackingEmotionsTabProps) => {
    const { data: pageData, isLoading: pageLoading } = useQuery({
        queryKey: ['tracking', researchId, 'emotions', selectedPageUrl],
        queryFn: () => trackingService.getTrackingEmotions(researchId, selectedPageUrl),
    });

    // Fallback: if selected page has no data, fetch all pages combined
    const pageHasData = (pageData?.totalSamples ?? 0) > 0;
    const { data: allData, isLoading: allLoading } = useQuery({
        queryKey: ['tracking', researchId, 'emotions', '__all__'],
        queryFn: () => trackingService.getTrackingEmotions(researchId, undefined),
        enabled: !pageLoading && !pageHasData,
    });

    const data = pageHasData ? pageData : allData;
    const isLoading = pageLoading || (!pageHasData && allLoading);

    if (isLoading) {
        return (
            <div className="space-y-3">
                {[1, 2, 3].map(i => (
                    <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 animate-pulse">
                        <div className="h-4 bg-gray-200 rounded w-1/4 mb-3" />
                        <div className="h-32 bg-gray-100 rounded" />
                    </div>
                ))}
            </div>
        );
    }

    if (!data || data.totalSamples === 0) {
        return (
            <div className="bg-white rounded-xl border border-gray-200 flex items-center justify-center py-20">
                <div className="text-center">
                    <SmilePlus className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-400">No emotion data collected yet</p>
                    <p className="text-xs text-gray-300 mt-1">Enable "Capture Emotions" in tracking config</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {/* Summary cards */}
            <div className="flex gap-3">
                <SummaryCard label="Sessions" value={data.totalSessions} />
                <SummaryCard label="Samples" value={data.totalSamples.toLocaleString()} />
                <SummaryCard label="Dominant" value={EMOTION_LABELS[data.dominantEmotion]} color={EMOTION_COLORS[data.dominantEmotion]} />
                <SummaryCard label="Confidence" value={`${Math.round(data.avgConfidence * 100)}%`} />
            </div>

            {/* Main panels */}
            <div className="flex gap-3">
                {/* Distribution bars */}
                <div className="bg-white rounded-xl border border-gray-200 p-4 flex-1">
                    <h3 className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Expression Distribution</h3>
                    <p className="text-[10px] text-gray-300 mb-3">Webcam-based estimation. Best for relative comparisons across pages, not absolute measurement.</p>
                    <div className="space-y-2">
                        {ALL_EMOTIONS.map(e => (
                            <div key={e} className="flex items-center gap-2">
                                <span className="text-xs text-gray-600 w-16 text-right">{EMOTION_LABELS[e]}</span>
                                <div className="flex-1 h-5 bg-gray-100 rounded overflow-hidden">
                                    <div
                                        className="h-full rounded transition-all"
                                        style={{ width: `${data.distribution[e]}%`, backgroundColor: EMOTION_COLORS[e] }}
                                    />
                                </div>
                                <span className="text-[11px] text-gray-400 w-10 text-right">{data.distribution[e]}%</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Circumplex */}
                <div className="bg-white rounded-xl border border-gray-200 p-4" style={{ width: 280 }}>
                    <h3 className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-3">Affect Space</h3>
                    <CircumplexCanvas data={data} />
                </div>
            </div>

            {/* Timeline */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
                <h3 className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-3">Valence & Arousal Timeline</h3>
                <TimelineCanvas data={data} />
            </div>

            {/* Session list */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
                <h3 className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-3">
                    Sessions with Emotions ({data.perSession.length})
                </h3>
                <div className="space-y-1 max-h-64 overflow-y-auto">
                    {data.perSession.map(s => (
                        <div key={s.sessionId} className="flex items-center gap-3 px-2 py-1.5 rounded-lg hover:bg-gray-50 text-xs">
                            <div
                                className="w-2 h-2 rounded-full flex-shrink-0"
                                style={{ backgroundColor: EMOTION_COLORS[s.dominantEmotion] }}
                            />
                            <span className="text-gray-700 font-medium truncate flex-1">{s.pageUrl}</span>
                            <span className="text-gray-400">{EMOTION_LABELS[s.dominantEmotion]}</span>
                            <span className="text-gray-300">{s.sampleCount} samples</span>
                            {s.hasVideo && <Video className="h-3.5 w-3.5 text-blue-400" />}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

// ─── Summary Card ────────────────────────────────────────────────────

const SummaryCard = ({ label, value, color }: { label: string; value: string | number; color?: string }) => (
    <div className="bg-white rounded-xl border border-gray-200 p-3 flex-1">
        <p className="text-[10px] text-gray-400 uppercase tracking-wide">{label}</p>
        <p className="text-lg font-semibold mt-0.5" style={color ? { color } : undefined}>{value}</p>
    </div>
);

// ─── Circumplex Canvas ───────────────────────────────────────────────

const CircumplexCanvas = ({ data }: { data: TrackingEmotionData }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const draw = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        const w = canvas.width, h = canvas.height;
        const cx = w / 2, cy = h / 2, r = w / 2 - 30;

        ctx.clearRect(0, 0, w, h);

        // Concentric circles
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 1;
        for (let i = 1; i <= 4; i++) {
            ctx.beginPath();
            ctx.arc(cx, cy, r * i / 4, 0, Math.PI * 2);
            ctx.stroke();
        }

        // Axes
        ctx.strokeStyle = '#cbd5e1';
        ctx.beginPath(); ctx.moveTo(cx - r, cy); ctx.lineTo(cx + r, cy); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx, cy - r); ctx.lineTo(cx, cy + r); ctx.stroke();

        // Labels
        ctx.fillStyle = '#94a3b8';
        ctx.font = '10px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Active', cx, cy - r - 6);
        ctx.fillText('Inactive', cx, cy + r + 14);
        ctx.textAlign = 'right';
        ctx.fillText('Unpleasant', cx - r - 4, cy - 4);
        ctx.textAlign = 'left';
        ctx.fillText('Pleasant', cx + r + 4, cy - 4);

        // Plot emotion dots
        ALL_EMOTIONS.forEach(e => {
            const pct = data.distribution[e];
            if (pct < 1) return;
            const va = VA_MAP[e];
            const dx = cx + va.v * r;
            const dy = cy - va.a * r;
            const dotR = Math.max(4, Math.min(16, pct / 3));
            ctx.globalAlpha = 0.7;
            ctx.fillStyle = EMOTION_COLORS[e];
            ctx.beginPath();
            ctx.arc(dx, dy, dotR, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
        });

        // Trail from valenceArousal timeline (last 30 points)
        const trail = data.valenceArousal.slice(-30);
        if (trail.length > 1) {
            ctx.strokeStyle = 'rgba(30,41,59,0.2)';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            trail.forEach((d, i) => {
                const tx = cx + d.valence * r;
                const ty = cy - d.arousal * r;
                if (i === 0) ctx.moveTo(tx, ty); else ctx.lineTo(tx, ty);
            });
            ctx.stroke();
        }

        // Current position (last VA point)
        const last = data.valenceArousal[data.valenceArousal.length - 1];
        if (last) {
            const lx = cx + last.valence * r;
            const ly = cy - last.arousal * r;
            ctx.fillStyle = '#1e293b';
            ctx.beginPath();
            ctx.arc(lx, ly, 6, 0, Math.PI * 2);
            ctx.fill();
        }
    }, [data]);

    useEffect(() => { draw(); }, [draw]);

    return <canvas ref={canvasRef} width={440} height={440} className="w-full" style={{ maxWidth: 240, aspectRatio: '1' }} />;
};

// ─── Timeline Canvas ─────────────────────────────────────────────────

const TimelineCanvas = ({ data }: { data: TrackingEmotionData }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const draw = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        const w = canvas.width, h = canvas.height;
        const pad = { top: 15, bottom: 20, left: 35, right: 10 };
        const plotW = w - pad.left - pad.right;
        const plotH = h - pad.top - pad.bottom;

        ctx.clearRect(0, 0, w, h);

        const va = data.valenceArousal;
        if (va.length < 2) {
            ctx.fillStyle = '#94a3b8';
            ctx.font = '12px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('Not enough data for timeline', w / 2, h / 2);
            return;
        }

        // Zero line
        const zeroY = pad.top + plotH / 2;
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(pad.left, zeroY); ctx.lineTo(w - pad.right, zeroY); ctx.stroke();

        // Y labels
        ctx.fillStyle = '#94a3b8';
        ctx.font = '10px Inter, sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText('1.0', pad.left - 4, pad.top + 4);
        ctx.fillText('0', pad.left - 4, zeroY + 4);
        ctx.fillText('-1.0', pad.left - 4, pad.top + plotH + 4);

        const n = va.length;
        const xStep = plotW / Math.max(n - 1, 1);

        const drawLine = (key: 'valence' | 'arousal', color: string) => {
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            ctx.beginPath();
            va.forEach((d, i) => {
                const x = pad.left + i * xStep;
                const y = zeroY - d[key] * (plotH / 2);
                if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
            });
            ctx.stroke();
        };

        drawLine('valence', '#ef4444');
        drawLine('arousal', '#eab308');

        // Legend
        ctx.font = '11px Inter, sans-serif';
        ctx.fillStyle = '#ef4444';
        ctx.textAlign = 'left';
        ctx.fillText('Valence', pad.left, h - 2);
        ctx.fillStyle = '#eab308';
        ctx.fillText('Arousal', pad.left + 60, h - 2);
    }, [data]);

    useEffect(() => { draw(); }, [draw]);

    return <canvas ref={canvasRef} width={1200} height={200} className="w-full" style={{ height: 160 }} />;
};
