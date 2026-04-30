/**
 * Session Replay Player
 * Animates cursor movement and clicks over a DOM snapshot.
 * Rendered as a modal overlay.
 */

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Play, Pause, SkipBack, X } from 'lucide-react';
import simpleheat from 'simpleheat';
import * as trackingService from '../../../services/tracking.service';

interface SessionReplayPlayerProps {
    researchId: string;
    sessionId: string;
    onClose: () => void;
}

/**
 * Strip scripts/handlers from snapshot HTML.
 */
const sanitizeSnapshot = (html: string): string => {
    let clean = html;
    clean = clean.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    clean = clean.replace(/<script\b[^>]*\/>/gi, '');
    clean = clean.replace(/<noscript\b[^<]*(?:(?!<\/noscript>)<[^<]*)*<\/noscript>/gi, '');
    clean = clean.replace(/\s+on\w+\s*=\s*"[^"]*"/gi, '');
    clean = clean.replace(/\s+on\w+\s*=\s*'[^']*'/gi, '');
    clean = clean.replace(/href\s*=\s*"javascript:[^"]*"/gi, 'href="#"');
    clean = clean.replace(/href\s*=\s*'javascript:[^']*'/gi, "href='#'");
    return clean;
};

export const SessionReplayPlayer = ({ researchId, sessionId, onClose }: SessionReplayPlayerProps) => {
    // First load the clicked session to get the visitorId
    const { data: initialData } = useQuery({
        queryKey: ['tracking', researchId, 'replay', sessionId],
        queryFn: () => trackingService.getSessionReplay(researchId, sessionId),
    });

    const visitorId = initialData?.session?.visitorId;

    // Load ALL sessions for this visitor
    const { data: visitorSessions } = useQuery({
        queryKey: ['tracking', researchId, 'visitor-sessions', visitorId],
        queryFn: async () => {
            const all = await trackingService.getSessions(researchId, 200, 0);
            return all
                .filter(s => s.visitorId === visitorId)
                .sort((a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime());
        },
        enabled: !!visitorId,
        staleTime: 30_000,
    });

    // Load events for ALL visitor sessions and merge into one timeline
    const { data: allSessionsData, isLoading } = useQuery({
        queryKey: ['tracking', researchId, 'visitor-replay-all', visitorId],
        queryFn: async () => {
            const sessionIds = visitorSessions!.map(s => s.id);
            const results = await Promise.all(
                sessionIds.map(sid => trackingService.getSessionReplay(researchId, sid))
            );
            return results;
        },
        enabled: !!visitorSessions && visitorSessions.length > 0,
        staleTime: 30_000,
    });

    // Merge all events into a single sorted timeline
    const { events, totalSessions } = useMemo(() => {
        if (!allSessionsData) return { events: [] as Array<trackingService.SessionReplayEvent & { pageUrl: string }>, totalSessions: 0 };

        const merged: Array<trackingService.SessionReplayEvent & { pageUrl: string }> = [];

        for (const sessionData of allSessionsData) {
            for (const evt of sessionData.events) {
                merged.push({ ...evt, pageUrl: sessionData.session.pageUrl });
            }
        }

        merged.sort((a, b) => a.timestampMs - b.timestampMs);

        return { events: merged, totalSessions: allSessionsData.length };
    }, [allSessionsData]);

    const session = allSessionsData?.[0]?.session;

    const [playing, setPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [speed, setSpeed] = useState(1);
    const animRef = useRef<number>(0);
    const lastFrameRef = useRef<number>(0);
    const containerRef = useRef<HTMLDivElement>(null);
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const heatCanvasRef = useRef<HTMLCanvasElement>(null);
    const [iframeReady, setIframeReady] = useState(false);

    const startTs = events.length > 0 ? events[0].timestampMs : 0;
    const endTs = events.length > 0 ? events[events.length - 1].timestampMs : 0;
    const duration = endTs - startTs;

    // Current page based on playback time
    const activePageUrl = useMemo(() => {
        if (events.length === 0 || !allSessionsData) return session?.pageUrl || '';
        const absTime = startTs + currentTime;
        for (let i = allSessionsData.length - 1; i >= 0; i--) {
            const sEvents = allSessionsData[i].events;
            if (sEvents.length > 0 && sEvents[0].timestampMs <= absTime) {
                return allSessionsData[i].session.pageUrl;
            }
        }
        return allSessionsData[0]?.session.pageUrl || '';
    }, [events, currentTime, startTs, allSessionsData, session]);

    // Fetch DOM snapshot for the active page (changes during playback if visitor navigated)
    const { data: snapshotHtml } = useQuery({
        queryKey: ['tracking', researchId, 'snapshot', activePageUrl],
        queryFn: () => trackingService.getPageSnapshot(researchId, activePageUrl),
        enabled: !!activePageUrl,
        staleTime: 60_000,
    });

    const srcdoc = useMemo(() => {
        if (!snapshotHtml) return '';
        const sanitized = sanitizeSnapshot(snapshotHtml);
        const injectStyle = `<style>
            * { pointer-events: none !important; user-select: none !important; }
            html, body { overflow: hidden !important; margin: 0 !important; }
        </style>`;
        return sanitized.replace('</head>', injectStyle + '</head>');
    }, [snapshotHtml]);

    const handleIframeLoad = useCallback(() => { setIframeReady(true); }, []);

    // Accumulated clicks up to current time — for heatmap rendering
    const accumulatedClicks = useMemo(() => {
        const absTime = startTs + currentTime;
        return events.filter(
            (e) => e.eventType === 'click' && e.timestampMs <= absTime && e.x != null && e.y != null
        );
    }, [events, currentTime, startTs]);

    // Render heatmap overlay on canvas
    useEffect(() => {
        const canvas = heatCanvasRef.current;
        const container = containerRef.current;
        if (!canvas || !container) return;

        const w = container.clientWidth;
        const h = container.clientHeight;
        if (w === 0 || h === 0) return;

        canvas.width = w;
        canvas.height = h;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Dark overlay
        ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
        ctx.fillRect(0, 0, w, h);

        if (accumulatedClicks.length === 0) return;

        // Render clicks as heatmap
        const offscreen = document.createElement('canvas');
        offscreen.width = w;
        offscreen.height = h;

        const heat = simpleheat(offscreen);
        const baseR = Math.max(20, Math.round(Math.min(w, h) * 0.05));
        heat.radius(baseR, Math.round(baseR * 0.9));
        heat.gradient({
            0.15: '#0f0', 0.35: '#8f0', 0.5: '#ff0',
            0.7: '#f80', 0.85: '#f00', 1.0: '#fff',
        });

        // Group clicks by position for count
        const clickMap = new Map<string, { x: number; y: number; count: number }>();
        for (const c of accumulatedClicks) {
            const key = `${Math.round(c.x!)}:${Math.round(c.y!)}`;
            const existing = clickMap.get(key);
            if (existing) { existing.count++; }
            else { clickMap.set(key, { x: c.x!, y: c.y!, count: 1 }); }
        }

        const points: Array<[number, number, number]> = [...clickMap.values()].map(c => [
            (c.x / 100) * w, (c.y / 100) * w, c.count,
        ]);

        heat.data(points);
        heat.max(Math.max(3, Math.ceil(points.length * 0.1)));
        heat.draw(0.05);

        ctx.drawImage(offscreen, 0, 0);
    }, [accumulatedClicks, iframeReady]);

    // Store speed/duration in refs so the animation loop doesn't need recreation
    const speedRef = useRef(speed);
    const durationRef = useRef(duration);
    useEffect(() => { speedRef.current = speed; }, [speed]);
    useEffect(() => { durationRef.current = duration; }, [duration]);

    useEffect(() => {
        if (!playing) {
            cancelAnimationFrame(animRef.current);
            return;
        }

        lastFrameRef.current = 0;

        const tick = (timestamp: number) => {
            if (!lastFrameRef.current) lastFrameRef.current = timestamp;
            const delta = (timestamp - lastFrameRef.current) * speedRef.current;
            lastFrameRef.current = timestamp;

            setCurrentTime((prev) => {
                const next = prev + delta;
                if (next >= durationRef.current) {
                    setPlaying(false);
                    return durationRef.current;
                }
                return next;
            });

            animRef.current = requestAnimationFrame(tick);
        };

        animRef.current = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(animRef.current);
    }, [playing]);

    const handleRestart = () => {
        setCurrentTime(0);
        setPlaying(true);
    };

    // Close on Escape key
    useEffect(() => {
        const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [onClose]);

    const modalContent = (() => {
        if (isLoading) {
            return <div className="h-96 bg-gray-100 rounded-lg animate-pulse" />;
        }

        if (!allSessionsData || events.length === 0) {
            return (
                <div className="text-center py-12 text-gray-500 text-sm">No events in this session.</div>
            );
        }

        return (
            <>
                {/* Replay viewport */}
                <div
                    ref={containerRef}
                    className="relative bg-gray-900 overflow-hidden flex-1 min-h-0"
                >
                    {srcdoc ? (
                        <iframe
                            ref={iframeRef}
                            srcDoc={srcdoc}
                            sandbox="allow-same-origin"
                            onLoad={handleIframeLoad}
                            className="w-full h-full border-0"
                            style={{ pointerEvents: 'none' }}
                            title="Session replay snapshot"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-500 text-sm">
                            {snapshotHtml === undefined ? 'Loading snapshot...' : 'No page snapshot available'}
                        </div>
                    )}

                    {/* Heatmap overlay — dark layer + accumulated clicks as simpleheat */}
                    <canvas
                        ref={heatCanvasRef}
                        className="absolute inset-0 w-full h-full pointer-events-none"
                    />

                </div>

                {/* Activity timeline bar */}
                <ActivityTimeline
                    events={events}
                    startTs={startTs}
                    duration={duration}
                    currentTime={currentTime}
                    onSeek={(t) => setCurrentTime(t)}
                />

                {/* Controls */}
                <div className="border-t border-gray-200 px-4 py-3 flex items-center gap-4">
                    <button
                        onClick={() => setPlaying(!playing)}
                        className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                        {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    </button>
                    <button onClick={handleRestart} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
                        <SkipBack className="h-4 w-4" />
                    </button>

                    <div className="flex-1 flex items-center gap-2">
                        <span className="text-xs text-gray-500 font-mono">{formatMs(currentTime)}</span>
                        <span className="text-xs text-gray-400">/</span>
                        <span className="text-xs text-gray-500 font-mono">{formatMs(duration)}</span>
                    </div>

                    <div className="flex items-center gap-3 text-[10px] text-gray-400">
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" />Click</span>
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-300" />Move</span>
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-800" />Idle</span>
                    </div>

                    <div className="flex items-center gap-1">
                        {[1, 2, 4].map((s) => (
                            <button
                                key={s}
                                onClick={() => setSpeed(s)}
                                className={`px-2 py-1 text-xs rounded transition-colors ${
                                    speed === s ? 'bg-blue-100 text-blue-700 font-medium' : 'text-gray-500 hover:bg-gray-100'
                                }`}
                            >
                                {s}x
                            </button>
                        ))}
                    </div>
                </div>
            </>
        );
    })();

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
            <div
                className="bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col"
                style={{ width: '90vw', maxWidth: 1200, height: '85vh' }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="border-b border-gray-200 px-4 py-3 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        <h3 className="text-sm font-semibold text-slate-800">Session Replay</h3>
                        <span className="text-xs text-gray-500 font-mono">{visitorId?.slice(0, 12)}...</span>
                        <span className="text-xs text-gray-400">
                            {totalSessions} page{totalSessions !== 1 ? 's' : ''} &middot; {events.length} events &middot; {formatMs(duration)}
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                            <X className="h-4 w-4 text-gray-500" />
                        </button>
                    </div>
                </div>

                {modalContent}
            </div>
        </div>
    );
};

const formatMs = (ms: number): string => {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    return `${m}:${String(s % 60).padStart(2, '0')}`;
};

// ─── Activity Timeline Bar ──────────────────────────────────────────
// Mouseflow-style colored bar: red=click, light gray=mousemove, dark=idle

interface ActivityTimelineProps {
    events: Array<{ eventType: string; timestampMs: number }>;
    startTs: number;
    duration: number;
    currentTime: number;
    onSeek: (time: number) => void;
}

type SegmentType = 'click' | 'move' | 'idle';

const SEGMENT_COLORS: Record<SegmentType, string> = {
    click: '#EF4444',   // red
    move: '#D1D5DB',    // gray-300
    idle: '#1F2937',    // gray-800
};

const IDLE_THRESHOLD_MS = 2000;

const ActivityTimeline = ({ events, startTs, duration, currentTime, onSeek }: ActivityTimelineProps) => {
    const barRef = useRef<HTMLDivElement>(null);

    // Build segments: classify each time slice by dominant activity
    const segments = useMemo(() => {
        if (duration <= 0 || events.length === 0) return [];

        // Quantize into N buckets
        const BUCKET_COUNT = Math.min(500, Math.max(100, Math.round(duration / 100)));
        const bucketMs = duration / BUCKET_COUNT;
        const buckets: SegmentType[] = new Array(BUCKET_COUNT).fill('idle');

        for (const evt of events) {
            const relTime = evt.timestampMs - startTs;
            const idx = Math.min(BUCKET_COUNT - 1, Math.max(0, Math.floor(relTime / bucketMs)));

            if (evt.eventType === 'click') {
                buckets[idx] = 'click';
                // Extend click visibility to adjacent buckets
                if (idx > 0 && buckets[idx - 1] !== 'click') buckets[idx - 1] = 'click';
                if (idx < BUCKET_COUNT - 1) buckets[idx + 1] = 'click';
            } else if (evt.eventType === 'mousemove' || evt.eventType === 'scroll') {
                if (buckets[idx] !== 'click') buckets[idx] = 'move';
            }
        }

        // Mark gaps > IDLE_THRESHOLD as idle (override move)
        let lastEventBucket = 0;
        for (let i = 0; i < BUCKET_COUNT; i++) {
            if (buckets[i] !== 'idle') {
                lastEventBucket = i;
            } else if ((i - lastEventBucket) * bucketMs > IDLE_THRESHOLD_MS) {
                buckets[i] = 'idle';
            }
        }

        // Merge consecutive same-type buckets into segments
        const result: Array<{ type: SegmentType; startPct: number; widthPct: number }> = [];
        let segStart = 0;
        let segType = buckets[0];

        for (let i = 1; i <= BUCKET_COUNT; i++) {
            if (i === BUCKET_COUNT || buckets[i] !== segType) {
                result.push({
                    type: segType,
                    startPct: (segStart / BUCKET_COUNT) * 100,
                    widthPct: ((i - segStart) / BUCKET_COUNT) * 100,
                });
                if (i < BUCKET_COUNT) {
                    segStart = i;
                    segType = buckets[i];
                }
            }
        }

        return result;
    }, [events, startTs, duration]);

    const handleBarClick = (e: React.MouseEvent) => {
        if (!barRef.current) return;
        const rect = barRef.current.getBoundingClientRect();
        const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        onSeek(pct * duration);
    };

    const playheadPct = duration > 0 ? (currentTime / duration) * 100 : 0;

    return (
        <div className="px-4 pt-3">
            <div
                ref={barRef}
                className="relative h-3 rounded-full overflow-hidden cursor-pointer"
                style={{ backgroundColor: '#1F2937' }}
                onClick={handleBarClick}
            >
                {/* Activity segments */}
                {segments.map((seg, i) => (
                    <div
                        key={i}
                        className="absolute top-0 h-full"
                        style={{
                            left: `${seg.startPct}%`,
                            width: `${seg.widthPct}%`,
                            backgroundColor: SEGMENT_COLORS[seg.type],
                        }}
                    />
                ))}

                {/* Playhead */}
                <div
                    className="absolute top-0 h-full w-0.5 bg-white shadow-sm"
                    style={{ left: `${playheadPct}%`, zIndex: 10 }}
                />
            </div>
        </div>
    );
};
