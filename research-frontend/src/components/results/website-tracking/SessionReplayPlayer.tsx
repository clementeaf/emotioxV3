/**
 * Session Replay Player
 * Replays visitor sessions over a screenshot background with animated cursor and click indicators.
 * Rendered as a modal overlay.
 */

import { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useQuery } from '@tanstack/react-query';
import { Play, Pause, SkipBack, X } from 'lucide-react';
import * as trackingService from '../../../services/tracking.service';
import { resolveMediaUrl } from '../../../services/media.service';

interface SessionReplayPlayerProps {
    researchId: string;
    sessionId: string;
    onClose: () => void;
}

export const SessionReplayPlayer = ({ researchId, sessionId, onClose }: SessionReplayPlayerProps) => {
    // Load only the clicked session (single request, fast)
    const { data: sessionData, isLoading } = useQuery({
        queryKey: ['tracking', researchId, 'replay', sessionId],
        queryFn: () => trackingService.getSessionReplay(researchId, sessionId),
        staleTime: 30_000,
    });

    const session = sessionData?.session;
    const visitorId = session?.visitorId;

    // Real timeline — no compression, no filtering
    const { events, duration } = useMemo(() => {
        if (!sessionData || sessionData.events.length === 0) return {
            events: [] as Array<trackingService.SessionReplayEvent & { relativeTs: number }>,
            duration: 0,
        };

        const raw = sessionData.events;
        const startTs = raw[0].timestampMs;
        const mapped = raw.map(evt => ({ ...evt, relativeTs: evt.timestampMs - startTs }));
        const dur = mapped[mapped.length - 1].relativeTs;

        return { events: mapped, duration: Math.max(dur, 1000) };
    }, [sessionData]);

    const [playing, setPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [speed, setSpeed] = useState(4); // Default 4x — real-time is too slow for most sessions
    const animRef = useRef<number>(0);
    const lastFrameRef = useRef<number>(0);
    const containerRef = useRef<HTMLDivElement>(null);
    const [containerW, setContainerW] = useState(0);

    // Measure container width reliably via ResizeObserver
    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        const ro = new ResizeObserver((entries) => {
            for (const entry of entries) {
                setContainerW(entry.contentRect.width);
            }
        });
        ro.observe(el);
        return () => ro.disconnect();
    }, []);

    // Get screenshot URL for this session's page
    const { data: pages } = useQuery({
        queryKey: ['tracking', researchId, 'pages'],
        queryFn: () => trackingService.getTrackedPages(researchId),
        staleTime: 60_000,
        enabled: !!session,
    });

    const screenshotUrl = useMemo(() => {
        if (!session) return null;
        const page = pages?.find(p => p.pageUrl === session.pageUrl);
        const key = page?.screenshotDevices?.desktop || page?.screenshotS3Key;
        return key ? resolveMediaUrl(`/api/media/${key}`) : null;
    }, [pages, session]);

    // Check if there are any visible interaction events (mousemove/click with coords)
    const hasVisibleInteraction = useMemo(
        () => events.some(e => (e.eventType === 'click' || e.eventType === 'mousemove') && e.x != null && e.y != null),
        [events]
    );

    // Initial scroll offset — so replay starts at the top of where the burst begins
    const initialScrollY = useMemo(() => {
        const firstScroll = events.find(e => e.eventType === 'scroll' && e.scrollY != null);
        return firstScroll?.scrollY ?? 0;
    }, [events]);

    // Current cursor position and scroll
    const { cursorX, cursorY, scrollY, recentClicks } = useMemo(() => {
        // Start at the scroll position of the first scroll event so image+cursor align
        let cx = 50, cy = 10;
        let sy = initialScrollY;
        const clicks: Array<{ x: number; y: number; age: number }> = [];

        for (const evt of events) {
            if (evt.relativeTs > currentTime) break;
            if (evt.x != null && evt.y != null && (evt.eventType === 'mousemove' || evt.eventType === 'click')) {
                cx = evt.x;
                cy = evt.y;
            }
            if (evt.eventType === 'scroll' && evt.scrollY != null) {
                sy = evt.scrollY;
            }
            if (evt.eventType === 'click' && evt.x != null && evt.y != null) {
                clicks.push({ x: evt.x, y: evt.y, age: currentTime - evt.relativeTs });
            }
        }

        // Only show clicks from last 2 seconds
        const recent = clicks.filter(c => c.age < 2000);
        return { cursorX: cx, cursorY: cy, scrollY: sy, recentClicks: recent };
    }, [events, currentTime]);


    // Animation loop — simple, gaps already compressed in timeline
    const speedRef = useRef(speed);
    const durationRef = useRef(duration);
    useEffect(() => { speedRef.current = speed; }, [speed]);
    useEffect(() => { durationRef.current = duration; }, [duration]);

    useEffect(() => {
        if (!playing) { cancelAnimationFrame(animRef.current); return; }
        lastFrameRef.current = 0;
        const tick = (ts: number) => {
            if (!lastFrameRef.current) lastFrameRef.current = ts;
            const delta = (ts - lastFrameRef.current) * speedRef.current;
            lastFrameRef.current = ts;
            setCurrentTime(prev => {
                const next = prev + delta;
                if (next >= durationRef.current) { setPlaying(false); return durationRef.current; }
                return next;
            });
            animRef.current = requestAnimationFrame(tick);
        };
        animRef.current = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(animRef.current);
    }, [playing]);

    const handleRestart = () => {
        cancelAnimationFrame(animRef.current);
        lastFrameRef.current = 0;
        setCurrentTime(0);
        setPlaying(true);
    };

    const handlePlayPause = () => {
        if (playing) {
            setPlaying(false);
        } else {
            // If at the end, restart from beginning
            if (currentTime >= duration) {
                lastFrameRef.current = 0;
                setCurrentTime(0);
            }
            setPlaying(true);
        }
    };

    // Skip to the next event that has visible interaction (mousemove/click with coords)
    const handleSkipIdle = () => {
        const nextEvt = events.find(
            e => e.relativeTs > currentTime && e.x != null && e.y != null
        );
        if (nextEvt) {
            setCurrentTime(nextEvt.relativeTs);
        }
    };

    // Escape to close
    useEffect(() => {
        const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', h);
        return () => window.removeEventListener('keydown', h);
    }, [onClose]);

    // Viewport dimensions for coordinate mapping
    const vpW = session?.viewportWidth || 1440;
    const scaledScrollY = containerW > 0 ? scrollY * (containerW / vpW) : 0;

    const modalContent = (() => {
        if (isLoading) return <div className="h-96 bg-gray-100 rounded-lg animate-pulse" />;
        if (!sessionData || events.length === 0) {
            return <div className="text-center py-12 text-gray-500 text-sm">No events in this session.</div>;
        }
        if (!hasVisibleInteraction) {
            return (
                <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
                    <p className="text-sm">This session only contains scroll events</p>
                    <p className="text-xs mt-1">No mouse or click interaction was recorded</p>
                </div>
            );
        }

        return (
            <>
                {/* Replay viewport */}
                <div
                    ref={containerRef}
                    className="relative bg-gray-100 overflow-hidden flex-1 min-h-0"
                >
                    {/* Scroll wrapper — moves vertically with scroll events */}
                    <div
                        className="absolute top-0 left-0 w-full"
                        style={{ transform: `translateY(-${scaledScrollY}px)` }}
                    >
                        {/* Relative container for image + cursor + clicks positioning */}
                        <div className="relative w-full">
                            {screenshotUrl ? (
                                <img
                                    src={screenshotUrl}
                                    alt="Page screenshot"
                                    className="w-full h-auto block"
                                    draggable={false}
                                />
                            ) : (
                                <div className="w-full flex flex-col items-center justify-center bg-slate-50" style={{ height: containerW * 1.5 || 600 }}>
                                    <div className="text-slate-300 text-6xl mb-4">🌐</div>
                                    <p className="text-sm text-slate-400 font-medium">{session?.pageUrl ? new URL(session.pageUrl).hostname : 'Page'}</p>
                                    <p className="text-xs text-slate-300 mt-1 max-w-md truncate">{session?.pageUrl}</p>
                                    <p className="text-[10px] text-slate-300 mt-3">Screenshot will be captured on next visitor</p>
                                </div>
                            )}

                            {/* Cursor dot — use paddingBottom trick: coords are both as % of viewport width */}
                            <div
                                className="absolute pointer-events-none z-20 transition-all duration-100 ease-out"
                                style={{
                                    left: `${cursorX}%`,
                                    top: containerW > 0 ? (cursorY / 100) * containerW : 0,
                                    transform: 'translate(-50%, -50%)',
                                }}
                            >
                                <div className="w-8 h-8 rounded-full border-2 border-blue-500 bg-blue-500/25 shadow-lg shadow-blue-500/30" />
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-blue-600" />
                            </div>

                            {/* Click ripples */}
                            {recentClicks.map((click, i) => {
                                const opacity = Math.max(0, 1 - click.age / 2000);
                                const rippleScale = 1 + (click.age / 2000) * 2;
                                return (
                                    <div
                                        key={`click-${i}-${click.x}-${click.y}`}
                                        className="absolute pointer-events-none z-10"
                                        style={{
                                            left: `${click.x}%`,
                                            top: containerW > 0 ? (click.y / 100) * containerW : 0,
                                            transform: `translate(-50%, -50%) scale(${rippleScale})`,
                                            opacity,
                                        }}
                                    >
                                        <div className="w-10 h-10 rounded-full border-2 border-red-500 bg-red-500/40 shadow-lg shadow-red-500/30" />
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Activity timeline bar */}
                <ActivityTimeline
                    events={events}
                    startTs={events[0]?.timestampMs || 0}
                    duration={duration}
                    currentTime={currentTime}
                    onSeek={(t) => setCurrentTime(t)}
                />

                {/* Controls */}
                <div className="border-t border-gray-200 px-4 py-3 flex items-center gap-4 shrink-0">
                    <button onClick={handlePlayPause} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
                        {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    </button>
                    <button onClick={handleRestart} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
                        <SkipBack className="h-4 w-4" />
                    </button>

                    <button
                        onClick={handleSkipIdle}
                        className="px-2 py-1 text-[10px] text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        title="Skip to next mouse/click event"
                    >
                        Skip idle →
                    </button>

                    <div className="flex-1 flex items-center gap-2">
                        <span className="text-xs text-gray-500 font-mono">{formatMs(currentTime)}</span>
                        <span className="text-xs text-gray-400">/</span>
                        <span className="text-xs text-gray-500 font-mono">{formatMs(duration)}</span>
                    </div>

                    <div className="flex items-center gap-3 text-[10px] text-gray-400">
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" />Click</span>
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500" />Cursor</span>
                    </div>

                    <div className="flex items-center gap-1">
                        {[1, 4, 8, 16].map((s) => (
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

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
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
                            {events.length} events &middot; {formatMs(duration)}
                        </span>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                        <X className="h-4 w-4 text-gray-500" />
                    </button>
                </div>

                {modalContent}
            </div>
        </div>,
        document.body
    );
};

const formatMs = (ms: number): string => {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    return `${m}:${String(s % 60).padStart(2, '0')}`;
};

// ─── Activity Timeline Bar ──────────────────────────────────────────

interface ActivityTimelineProps {
    events: Array<{ eventType: string; timestampMs: number; relativeTs?: number }>;
    startTs: number;
    duration: number;
    currentTime: number;
    onSeek: (time: number) => void;
}

type SegmentType = 'click' | 'move' | 'idle';

const SEGMENT_COLORS: Record<SegmentType, string> = {
    click: '#EF4444',
    move: '#93C5FD',  // blue-300 (cursor activity)
    idle: '#1F2937',
};

const IDLE_THRESHOLD_MS = 2000;

const ActivityTimeline = ({ events, startTs, duration, currentTime, onSeek }: ActivityTimelineProps) => {
    const barRef = useRef<HTMLDivElement>(null);

    const segments = useMemo(() => {
        if (duration <= 0 || events.length === 0) return [];

        const BUCKET_COUNT = Math.min(500, Math.max(100, Math.round(duration / 100)));
        const bucketMs = duration / BUCKET_COUNT;
        const buckets: SegmentType[] = new Array(BUCKET_COUNT).fill('idle');

        for (const evt of events) {
            const relTime = evt.relativeTs ?? (evt.timestampMs - startTs);
            const idx = Math.min(BUCKET_COUNT - 1, Math.max(0, Math.floor(relTime / bucketMs)));

            if (evt.eventType === 'click') {
                buckets[idx] = 'click';
                if (idx > 0 && buckets[idx - 1] !== 'click') buckets[idx - 1] = 'click';
                if (idx < BUCKET_COUNT - 1) buckets[idx + 1] = 'click';
            } else if (evt.eventType === 'mousemove' || evt.eventType === 'scroll') {
                if (buckets[idx] !== 'click') buckets[idx] = 'move';
            }
        }

        let lastEventBucket = 0;
        for (let i = 0; i < BUCKET_COUNT; i++) {
            if (buckets[i] !== 'idle') lastEventBucket = i;
            else if ((i - lastEventBucket) * bucketMs > IDLE_THRESHOLD_MS) buckets[i] = 'idle';
        }

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
                if (i < BUCKET_COUNT) { segStart = i; segType = buckets[i]; }
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
        <div className="px-4 pt-3 shrink-0">
            <div
                ref={barRef}
                className="relative h-3 rounded-full overflow-hidden cursor-pointer"
                style={{ backgroundColor: '#1F2937' }}
                onClick={handleBarClick}
            >
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
                <div
                    className="absolute top-0 h-full w-0.5 bg-white shadow-sm"
                    style={{ left: `${playheadPct}%`, zIndex: 10 }}
                />
            </div>
        </div>
    );
};
