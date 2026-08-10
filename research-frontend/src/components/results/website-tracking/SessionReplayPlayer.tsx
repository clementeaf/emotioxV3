/**
 * Session Replay Player (rrweb-based)
 * Replays visitor sessions using rrweb's DOM-based recording.
 * Falls back to the legacy screenshot-based replay when no rrweb data is available.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useQuery } from '@tanstack/react-query';
import { Play, Pause, SkipBack, X } from 'lucide-react';
import type { Replayer as ReplayerType } from 'rrweb';
import * as trackingService from '../../../services/tracking.service';

interface SessionReplayPlayerProps {
    researchId: string;
    sessionId: string;
    onClose: () => void;
}

export const SessionReplayPlayer = ({ researchId, sessionId, onClose }: SessionReplayPlayerProps) => {
    // Try rrweb events first
    const { data: rrwebData, isLoading: rrwebLoading } = useQuery({
        queryKey: ['tracking', researchId, 'rrweb-replay', sessionId],
        queryFn: () => trackingService.getRrwebReplay(researchId, sessionId),
        staleTime: 30_000,
    });

    // Fallback: load legacy heatmap events (for cursor overlay + timeline)
    const { data: legacyData, isLoading: legacyLoading } = useQuery({
        queryKey: ['tracking', researchId, 'replay', sessionId],
        queryFn: () => trackingService.getSessionReplay(researchId, sessionId),
        staleTime: 30_000,
    });

    const hasRrwebEvents = (rrwebData?.events?.length ?? 0) > 0;
    const isLoading = rrwebLoading || legacyLoading;
    const session = rrwebData?.session || legacyData?.session;

    const containerRef = useRef<HTMLDivElement>(null);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const replayerRef = useRef<ReplayerType | null>(null);
    const [playing, setPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [speed, setSpeed] = useState(4);
    const [ready, setReady] = useState(false);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Scale rrweb replay to fit container
    useEffect(() => {
        if (!ready || !containerRef.current || !wrapperRef.current) return;
        const wrapper = wrapperRef.current;

        // rrweb creates .rr-player > .rr-player__frame with the recorded viewport size
        const player = containerRef.current.querySelector('.rr-player') as HTMLElement | null;
        const frame = containerRef.current.querySelector('.rr-player__frame') as HTMLElement | null;
        const target = player || containerRef.current;

        const vpW = session?.viewportWidth || 1440;

        const vpH = session?.viewportHeight || 900;
        const fitScale = () => {
            const parentW = wrapper.clientWidth;
            const parentH = wrapper.clientHeight;
            if (parentW <= 0 || parentH <= 0) return;
            const scale = Math.min(parentW / vpW, parentH / vpH, 1);
            target.style.transformOrigin = 'top center';
            target.style.transform = `scale(${scale})`;
            if (frame) {
                frame.style.width = `${vpW}px`;
                frame.style.height = `${vpH}px`;
            }
        };

        fitScale();
        const ro = new ResizeObserver(fitScale);
        ro.observe(wrapper);
        return () => ro.disconnect();
    }, [ready, session?.viewportWidth, session?.viewportHeight]);

    // Initialize rrweb Replayer when data arrives
    useEffect(() => {
        if (!hasRrwebEvents || !containerRef.current || !rrwebData) return;

        // Clear previous replayer
        if (replayerRef.current) {
            try { replayerRef.current.destroy(); } catch { /* ignore */ }
            replayerRef.current = null;
        }

        // Clear container
        containerRef.current.innerHTML = '';

        // Need at least 2 rrweb events (meta + full snapshot) for Replayer
        if (rrwebData.events.length < 2) { setReady(false); return; }

        // Dynamically import rrweb + CSS (lazy load ~137KB)
        let cancelled = false;
        Promise.all([
            import('rrweb'),
            import('rrweb/dist/rrweb.min.css'),
        ]).then(([rrwebModule]) => {
            if (cancelled || !containerRef.current) return;
            // rrweb ESM exports Replayer directly
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const mod = rrwebModule as any;
            const ReplayerClass = mod.Replayer || mod.default?.Replayer;
            if (!ReplayerClass) { setReady(false); return; }

            try {
                const replayer = new ReplayerClass(rrwebData.events, {
                    root: containerRef.current,
                    skipInactive: false,
                    showWarning: false,
                    showDebug: false,
                    speed,
                    mouseTail: {
                        strokeStyle: '#3B82F6',
                        lineWidth: 2,
                        lineCap: 'round',
                    },
                });

                replayerRef.current = replayer;

                const meta = replayer.getMetaData();
                setDuration(meta.totalTime || 0);
                setReady(true);
                setCurrentTime(0);
            } catch (err) {
                console.error('[rrweb] Failed to initialize replayer:', err);
                setReady(false);
            }
        }).catch(() => {
            setReady(false);
        });

        return () => {
            cancelled = true;
            if (replayerRef.current) {
                try { replayerRef.current.destroy(); } catch { /* ignore */ }
                replayerRef.current = null;
            }
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [hasRrwebEvents, rrwebData]);

    // Update speed when user changes it
    useEffect(() => {
        if (replayerRef.current) {
            replayerRef.current.setConfig({ speed });
        }
    }, [speed]);

    // Timer to update currentTime during playback
    useEffect(() => {
        if (playing && replayerRef.current) {
            timerRef.current = setInterval(() => {
                const t = replayerRef.current?.getCurrentTime() ?? 0;
                setCurrentTime(t);
                if (t >= duration) {
                    setPlaying(false);
                    if (timerRef.current) clearInterval(timerRef.current);
                }
            }, 100);
        } else {
            if (timerRef.current) clearInterval(timerRef.current);
        }
        return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }, [playing, duration]);

    const handlePlayPause = useCallback(() => {
        if (!replayerRef.current || !ready) return;
        if (playing) {
            replayerRef.current.pause();
            setPlaying(false);
        } else {
            if (currentTime >= duration) {
                replayerRef.current.play(0);
                setCurrentTime(0);
            } else {
                replayerRef.current.resume(currentTime);
            }
            setPlaying(true);
        }
    }, [playing, currentTime, duration, ready]);

    const handleRestart = useCallback(() => {
        if (!replayerRef.current || !ready) return;
        replayerRef.current.play(0);
        setCurrentTime(0);
        setPlaying(true);
    }, [ready]);

    const handleSeek = useCallback((timeMs: number) => {
        if (!replayerRef.current || !ready) return;
        replayerRef.current.pause(timeMs);
        setCurrentTime(timeMs);
        setPlaying(false);
    }, [ready]);

    // Escape to close
    useEffect(() => {
        const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', h);
        return () => window.removeEventListener('keydown', h);
    }, [onClose]);

    // Compute timeline segments from legacy events
    const legacyEvents = legacyData?.events ?? [];
    const timelineEvents = legacyEvents.map(evt => ({
        eventType: evt.eventType,
        timestampMs: evt.timestampMs,
        relativeTs: legacyEvents.length > 0 ? evt.timestampMs - legacyEvents[0].timestampMs : 0,
    }));

    const showLoading = isLoading;
    const showPreparing = !isLoading && hasRrwebEvents && !ready;
    const showNoRrweb = !isLoading && !hasRrwebEvents;

    const modalContent = (() => {
        if (showLoading) return (
            <div className="flex-1 flex flex-col items-center justify-center">
                <div className="w-10 h-10 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-3" />
                <p className="text-xs text-gray-400">Loading session data...</p>
            </div>
        );

        if (showNoRrweb) {
            return (
                <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
                    <div className="text-5xl mb-4">🎬</div>
                    <p className="text-sm font-medium text-gray-500">No DOM recording available</p>
                    <p className="text-xs mt-1">This session was recorded before rrweb migration.</p>
                </div>
            );
        }

        // Always render the container so rrweb can mount into it.
        // Spinner overlays while preparing.
        return (
            <>
                {/* rrweb replay container — always mounted */}
                <div
                    ref={wrapperRef}
                    className="relative flex-1 min-h-0 overflow-hidden bg-gray-50 cursor-pointer flex items-start justify-center"
                    onClick={handlePlayPause}
                >
                    <div
                        ref={containerRef}
                        className="origin-top"
                        style={{ flexShrink: 0 }}
                    />

                    {/* Loading overlay while rrweb initializes */}
                    {showPreparing && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50 z-40">
                            <div className="w-10 h-10 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-3" />
                            <p className="text-xs text-gray-400">Preparing DOM replay...</p>
                        </div>
                    )}

                    {/* Play/pause overlay — YouTube style */}
                    {ready && (
                    <div className={`absolute inset-0 flex items-center justify-center z-30 pointer-events-none transition-opacity duration-200 ${playing ? 'opacity-0 hover:opacity-100' : 'opacity-100'}`}>
                        <div className={`w-16 h-16 rounded-full flex items-center justify-center shadow-xl transition-all ${playing ? 'bg-black/30' : 'bg-black/50'}`}>
                            {playing
                                ? <Pause className="h-7 w-7 text-white" />
                                : <Play className="h-7 w-7 text-white ml-1" />
                            }
                        </div>
                    </div>
                    )}
                </div>

                {/* Activity timeline bar */}
                <ActivityTimeline
                    events={timelineEvents}
                    startTs={timelineEvents[0]?.timestampMs || 0}
                    duration={duration}
                    currentTime={currentTime}
                    onSeek={handleSeek}
                />

                {/* Controls */}
                <div className="border-t border-gray-200 px-4 py-3 flex items-center gap-4 shrink-0">
                    <button onClick={handlePlayPause} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
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
                style={{ width: '95vw', maxWidth: 1600, height: '90vh' }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="border-b border-gray-200 px-4 py-3 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        <h3 className="text-sm font-semibold text-slate-800">Session Replay</h3>
                        {session && (
                            <>
                                <span className="text-xs text-gray-500">{friendlyVisitorName(session.visitorId || '')}</span>
                                <span className="text-xs text-gray-400">
                                    {formatMs(duration)}
                                </span>
                                {hasRrwebEvents && (
                                    <span className="px-1.5 py-0.5 text-[10px] bg-green-100 text-green-700 rounded font-medium">DOM Replay</span>
                                )}
                            </>
                        )}
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

const ANIMALS = ['Fox', 'Owl', 'Bear', 'Wolf', 'Hawk', 'Deer', 'Lion', 'Lynx', 'Crow', 'Seal',
    'Hare', 'Dove', 'Frog', 'Wren', 'Puma', 'Ibis', 'Yak', 'Newt', 'Moth', 'Kite',
    'Swan', 'Mole', 'Crab', 'Lark', 'Pike', 'Ram', 'Orca', 'Bee', 'Jay', 'Asp'];
const COLORS = ['Blue', 'Red', 'Jade', 'Gold', 'Teal', 'Mint', 'Rose', 'Plum', 'Sage', 'Coral',
    'Amber', 'Ruby', 'Lime', 'Sky', 'Sand', 'Aqua', 'Dusk', 'Fern', 'Rust', 'Snow'];

function friendlyVisitorName(visitorId: string): string {
    let hash = 0;
    for (let i = 0; i < visitorId.length; i++) {
        hash = ((hash << 5) - hash + visitorId.charCodeAt(i)) | 0;
    }
    const h = Math.abs(hash);
    return `${COLORS[h % COLORS.length]} ${ANIMALS[(h >>> 8) % ANIMALS.length]}`;
}

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
    move: '#93C5FD',
    idle: '#1F2937',
};

const IDLE_THRESHOLD_MS = 2000;

const ActivityTimeline = ({ events, startTs, duration, currentTime, onSeek }: ActivityTimelineProps) => {
    const barRef = useRef<HTMLDivElement>(null);

    const segments = (() => {
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
    })();

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
