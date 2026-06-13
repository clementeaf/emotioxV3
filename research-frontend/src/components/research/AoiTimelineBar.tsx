import { useRef, useCallback, useEffect, useState } from 'react';
import type { ManualAOI, AoiTimeRange } from '../../types/attentionPrediction.types';

/* ─── Constants ─── */

const MIN_GAP_S = 0.5;
const HANDLE_WIDTH_PX = 8;

const AOI_COLORS = [
    '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6',
    '#EC4899', '#06B6D4', '#F97316', '#6366F1', '#14B8A6',
];

/* ─── Tick helpers ─── */

const computeTickInterval = (duration: number): number => {
    if (duration <= 10) return 1;
    if (duration <= 30) return 5;
    if (duration <= 120) return 10;
    return 30;
};

const formatTime = (s: number): string => {
    const m = Math.floor(s / 60);
    const sec = Math.round(s % 60);
    return m > 0 ? `${m}:${sec.toString().padStart(2, '0')}` : `${sec}s`;
};

/* ─── Types ─── */

interface AoiTimelineBarProps {
    aois: ManualAOI[];
    videoDuration: number;
    onChange: (aoiId: string, timeRange: AoiTimeRange) => void;
    frameTimestamps?: number[];
}

interface DragState {
    aoiId: string;
    edge: 'start' | 'end';
    startClientX: number;
    originalTime: number;
}

/* ─── Component ─── */

export const AoiTimelineBar = ({ aois, videoDuration, onChange, frameTimestamps }: AoiTimelineBarProps) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const dragRef = useRef<DragState | null>(null);
    const [, forceRender] = useState(0);

    const snapToFrame = useCallback((time: number): number => {
        if (!frameTimestamps || frameTimestamps.length === 0) return time;
        let closest = frameTimestamps[0];
        let minDist = Math.abs(time - closest);
        for (const ts of frameTimestamps) {
            const dist = Math.abs(time - ts);
            if (dist < minDist) {
                minDist = dist;
                closest = ts;
            }
        }
        return closest;
    }, [frameTimestamps]);

    const clientXToTime = useCallback((clientX: number): number => {
        const el = containerRef.current;
        if (!el) return 0;
        const rect = el.getBoundingClientRect();
        const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
        return pct * videoDuration;
    }, [videoDuration]);

    const handleDragStart = useCallback((aoiId: string, edge: 'start' | 'end', e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const aoi = aois.find(a => a.id === aoiId);
        const range = aoi?.timeRange ?? { startTime: 0, endTime: videoDuration };
        dragRef.current = {
            aoiId,
            edge,
            startClientX: e.clientX,
            originalTime: edge === 'start' ? range.startTime : range.endTime,
        };
    }, [aois, videoDuration]);

    useEffect(() => {
        const onMove = (e: MouseEvent) => {
            const drag = dragRef.current;
            if (!drag) return;
            const time = snapToFrame(clientXToTime(e.clientX));
            const aoi = aois.find(a => a.id === drag.aoiId);
            const range = aoi?.timeRange ?? { startTime: 0, endTime: videoDuration };

            if (drag.edge === 'start') {
                const clamped = Math.max(0, Math.min(range.endTime - MIN_GAP_S, time));
                onChange(drag.aoiId, { startTime: clamped, endTime: range.endTime });
            } else {
                const clamped = Math.min(videoDuration, Math.max(range.startTime + MIN_GAP_S, time));
                onChange(drag.aoiId, { startTime: range.startTime, endTime: clamped });
            }
            forceRender(v => v + 1);
        };

        const onUp = () => {
            dragRef.current = null;
        };

        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
        return () => {
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
        };
    }, [aois, videoDuration, onChange, clientXToTime, snapToFrame]);

    if (videoDuration <= 0 || aois.length === 0) return null;

    const tickInterval = computeTickInterval(videoDuration);
    const ticks: number[] = [];
    for (let t = 0; t <= videoDuration; t += tickInterval) {
        ticks.push(t);
    }

    return (
        <div className="px-4 pb-3 space-y-1">
            {/* Time axis */}
            <div className="relative h-4 ml-20" ref={containerRef}>
                {ticks.map(t => (
                    <div
                        key={t}
                        className="absolute top-0 flex flex-col items-center"
                        style={{ left: `${(t / videoDuration) * 100}%`, transform: 'translateX(-50%)' }}
                    >
                        <div className="w-px h-2 bg-gray-300" />
                        <span className="text-[9px] text-gray-400 mt-0.5">{formatTime(t)}</span>
                    </div>
                ))}
            </div>

            {/* AOI bars */}
            {aois.map((aoi, i) => {
                const color = AOI_COLORS[i % AOI_COLORS.length];
                const range = aoi.timeRange ?? { startTime: 0, endTime: videoDuration };
                const leftPct = (range.startTime / videoDuration) * 100;
                const widthPct = ((range.endTime - range.startTime) / videoDuration) * 100;

                return (
                    <div key={aoi.id} className="flex items-center gap-2 h-6">
                        {/* Label */}
                        <div className="w-18 flex-shrink-0 flex items-center gap-1.5 overflow-hidden">
                            <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: color }} />
                            <span className="text-[10px] text-gray-600 truncate font-medium">{aoi.label}</span>
                        </div>

                        {/* Track */}
                        <div className="flex-1 relative h-5 bg-gray-100 rounded-sm overflow-visible">
                            {/* Active range */}
                            <div
                                className="absolute top-0 bottom-0 rounded-sm opacity-60"
                                style={{
                                    left: `${leftPct}%`,
                                    width: `${widthPct}%`,
                                    backgroundColor: color,
                                }}
                            />

                            {/* Start handle */}
                            <div
                                className="absolute top-0 bottom-0 cursor-ew-resize z-10 flex items-center justify-center"
                                style={{
                                    left: `${leftPct}%`,
                                    width: `${HANDLE_WIDTH_PX}px`,
                                    transform: 'translateX(-50%)',
                                }}
                                onMouseDown={e => handleDragStart(aoi.id, 'start', e)}
                            >
                                <div className="w-1 h-3 rounded-full" style={{ backgroundColor: color }} />
                            </div>

                            {/* End handle */}
                            <div
                                className="absolute top-0 bottom-0 cursor-ew-resize z-10 flex items-center justify-center"
                                style={{
                                    left: `calc(${leftPct + widthPct}%)`,
                                    width: `${HANDLE_WIDTH_PX}px`,
                                    transform: 'translateX(-50%)',
                                }}
                                onMouseDown={e => handleDragStart(aoi.id, 'end', e)}
                            >
                                <div className="w-1 h-3 rounded-full" style={{ backgroundColor: color }} />
                            </div>

                            {/* Time labels */}
                            <div className="absolute inset-0 flex items-center justify-between px-1.5 pointer-events-none">
                                <span className="text-[9px] text-white font-medium drop-shadow-sm">{formatTime(range.startTime)}</span>
                                <span className="text-[9px] text-white font-medium drop-shadow-sm">{formatTime(range.endTime)}</span>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};
