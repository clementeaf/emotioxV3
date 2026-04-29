/**
 * Session Replay Player
 * Animates cursor movement and clicks over a page screenshot.
 */

import { useState, useEffect, useRef, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Play, Pause, SkipBack } from 'lucide-react';
import * as trackingService from '../../../services/tracking.service';
import { resolveMediaUrl } from '../../../services/media.service';

interface SessionReplayPlayerProps {
    researchId: string;
    sessionId: string;
    onClose: () => void;
}

export const SessionReplayPlayer = ({ researchId, sessionId, onClose }: SessionReplayPlayerProps) => {
    const { data, isLoading } = useQuery({
        queryKey: ['tracking', researchId, 'replay', sessionId],
        queryFn: () => trackingService.getSessionReplay(researchId, sessionId),
    });

    const [playing, setPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [speed, setSpeed] = useState(1);
    const animRef = useRef<number>(0);
    const lastFrameRef = useRef<number>(0);
    const containerRef = useRef<HTMLDivElement>(null);

    const events = useMemo(() => data?.events || [], [data?.events]);
    const session = data?.session;

    const startTs = events.length > 0 ? events[0].timestampMs : 0;
    const endTs = events.length > 0 ? events[events.length - 1].timestampMs : 0;
    const duration = endTs - startTs;

    const screenshotUrl = useMemo(() => {
        if (!session?.screenshotS3Key) return null;
        return resolveMediaUrl(session.screenshotS3Key);
    }, [session]);

    // Current cursor position based on time
    const cursorState = useMemo(() => {
        if (events.length === 0) return { x: 0, y: 0, clicking: false, visible: false };

        const absTime = startTs + currentTime;
        let lastX = 0, lastY = 0;

        // Find the most recent event with coordinates
        for (let i = events.length - 1; i >= 0; i--) {
            if (events[i].timestampMs <= absTime && events[i].x != null && events[i].y != null) {
                lastX = events[i].x!;
                lastY = events[i].y!;
                break;
            }
        }

        // Check if there's a click near current time (within 200ms)
        const clicking = events.some(
            (e) => e.eventType === 'click' && Math.abs(e.timestampMs - absTime) < 200
        );

        return { x: lastX, y: lastY, clicking, visible: currentTime > 0 };
    }, [events, currentTime, startTs]);

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

    if (isLoading) {
        return <div className="h-96 bg-gray-100 rounded-lg animate-pulse" />;
    }

    if (!data || events.length === 0) {
        return (
            <div className="text-center py-12 text-gray-500 text-sm">No events in this session.</div>
        );
    }

    // Scale coordinates from page pixels to rendered container
    const vw = session?.viewportWidth || 1920;
    const vh = session?.viewportHeight || 1080;

    return (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {/* Header */}
            <div className="border-b border-gray-200 px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <h3 className="text-sm font-semibold text-slate-800">Session Replay</h3>
                    <span className="text-xs text-gray-500">{session?.pageTitle || session?.pageUrl}</span>
                    <span className="text-xs text-gray-400">
                        {events.length} events &middot; {formatMs(duration)}
                    </span>
                </div>
                <button onClick={onClose} className="text-xs text-gray-500 hover:text-gray-700">&times; Close</button>
            </div>

            {/* Replay viewport */}
            <div
                ref={containerRef}
                className="relative bg-gray-900 overflow-hidden"
                style={{ aspectRatio: `${vw}/${vh}`, maxHeight: '500px' }}
            >
                {screenshotUrl ? (
                    <img
                        src={screenshotUrl}
                        alt="Page screenshot"
                        className="w-full h-full object-contain"
                        draggable={false}
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-500 text-sm">
                        No screenshot — cursor replay only
                    </div>
                )}

                {/* Cursor */}
                {cursorState.visible && (
                    <div
                        className="absolute pointer-events-none transition-all duration-75"
                        style={{
                            left: `${(cursorState.x / vw) * 100}%`,
                            top: `${(cursorState.y / vh) * 100}%`,
                            transform: 'translate(-4px, -4px)',
                        }}
                    >
                        {/* Cursor dot */}
                        <div className={`w-4 h-4 rounded-full border-2 border-white shadow-lg transition-all ${
                            cursorState.clicking ? 'bg-red-500 scale-150' : 'bg-blue-500'
                        }`} />

                        {/* Click ripple */}
                        {cursorState.clicking && (
                            <div className="absolute inset-0 -m-3 w-10 h-10 rounded-full border-2 border-red-400 animate-ping opacity-50" />
                        )}
                    </div>
                )}
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

                {/* Time display */}
                <div className="flex-1 flex items-center gap-2">
                    <span className="text-xs text-gray-500 font-mono">{formatMs(currentTime)}</span>
                    <span className="text-xs text-gray-400">/</span>
                    <span className="text-xs text-gray-500 font-mono">{formatMs(duration)}</span>
                </div>

                {/* Legend */}
                <div className="flex items-center gap-3 text-[10px] text-gray-400">
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" />Click</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-300" />Move</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-800" />Idle</span>
                </div>

                {/* Speed */}
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
