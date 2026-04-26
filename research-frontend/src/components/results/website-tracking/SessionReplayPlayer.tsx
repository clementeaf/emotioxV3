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

    const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
        setCurrentTime(Number(e.target.value));
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

                {/* Timeline */}
                <div className="flex-1 flex items-center gap-2">
                    <span className="text-xs text-gray-500 font-mono w-12">{formatMs(currentTime)}</span>
                    <input
                        type="range"
                        min={0}
                        max={duration}
                        value={currentTime}
                        onChange={handleSeek}
                        className="flex-1 h-1.5 bg-gray-200 rounded-full appearance-none cursor-pointer accent-blue-600"
                    />
                    <span className="text-xs text-gray-500 font-mono w-12">{formatMs(duration)}</span>
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
