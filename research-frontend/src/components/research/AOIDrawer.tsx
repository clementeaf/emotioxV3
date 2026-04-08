import React, { useState, useRef, useCallback } from 'react';
import { Trash2 } from 'lucide-react';
import { cn } from '../../lib/utils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AOI {
    id: string;
    label: string;
    x: number;      // percentage 0-100
    y: number;      // percentage 0-100
    width: number;   // percentage
    height: number;  // percentage
}

interface AOIDrawerProps {
    /** Resolved image URL to display as background */
    imageUrl: string;
    /** Current list of AOIs */
    aois: AOI[];
    /** Called when AOIs change (add/remove) */
    onChange: (aois: AOI[]) => void;
    /** Optional max height for the image container */
    maxHeight?: number;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * AOI (Areas of Interest) drawing overlay for Eye Tracking builder.
 * Displays an image with drawable rectangular regions.
 * AOIs are stored as percentages of the image dimensions.
 */
export const AOIDrawer: React.FC<AOIDrawerProps> = ({
    imageUrl,
    aois,
    onChange,
    maxHeight = 500,
}) => {
    const [drawing, setDrawing] = useState(false);
    const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
    const [dragCurrent, setDragCurrent] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const getMousePercent = useCallback((e: React.MouseEvent): { x: number; y: number } | null => {
        const el = containerRef.current;
        if (!el) return null;
        const rect = el.getBoundingClientRect();
        return {
            x: ((e.clientX - rect.left) / rect.width) * 100,
            y: ((e.clientY - rect.top) / rect.height) * 100,
        };
    }, []);

    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        if (!drawing) return;
        const pos = getMousePercent(e);
        if (!pos) return;
        setDragStart(pos);
        setDragCurrent({ x: pos.x, y: pos.y, w: 0, h: 0 });
    }, [drawing, getMousePercent]);

    const handleMouseMove = useCallback((e: React.MouseEvent) => {
        if (!drawing || !dragStart) return;
        const pos = getMousePercent(e);
        if (!pos) return;
        setDragCurrent({
            x: Math.min(dragStart.x, pos.x),
            y: Math.min(dragStart.y, pos.y),
            w: Math.abs(pos.x - dragStart.x),
            h: Math.abs(pos.y - dragStart.y),
        });
    }, [drawing, dragStart, getMousePercent]);

    const handleMouseUp = useCallback(() => {
        if (!dragCurrent || dragCurrent.w < 1 || dragCurrent.h < 1) {
            setDragStart(null);
            setDragCurrent(null);
            return;
        }
        const newAoi: AOI = {
            id: `aoi_${crypto.randomUUID()}`,
            label: `AOI #${aois.length + 1}`,
            x: dragCurrent.x,
            y: dragCurrent.y,
            width: dragCurrent.w,
            height: dragCurrent.h,
        };
        onChange([...aois, newAoi]);
        setDragStart(null);
        setDragCurrent(null);
        setDrawing(false);
    }, [dragCurrent, aois, onChange]);

    const removeAoi = useCallback((aoiId: string) => {
        onChange(aois.filter(a => a.id !== aoiId));
    }, [aois, onChange]);

    return (
        <div className="space-y-3">
            {/* Toolbar */}
            <div className="flex items-center gap-3">
                <button
                    type="button"
                    onClick={() => setDrawing(prev => !prev)}
                    className={cn(
                        'px-3 py-1.5 text-xs font-medium rounded transition-colors',
                        drawing
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    )}
                >
                    {drawing ? 'Drawing AOI...' : '+ Add AOI'}
                </button>
                {aois.length > 0 && (
                    <span className="text-xs text-gray-500">
                        {aois.length} AOI{aois.length !== 1 ? 's' : ''} defined
                    </span>
                )}
            </div>

            {/* Image with AOI overlay */}
            <div
                ref={containerRef}
                className={cn(
                    'relative rounded-lg overflow-hidden border bg-gray-100 w-fit',
                    drawing && 'cursor-crosshair'
                )}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
            >
                <img
                    src={imageUrl}
                    alt="Stimulus"
                    className="block"
                    style={{ maxHeight }}
                    draggable={false}
                />

                {/* AOI rectangles */}
                <svg
                    className="absolute inset-0 w-full h-full pointer-events-none"
                    viewBox="0 0 100 100"
                    preserveAspectRatio="none"
                >
                    {aois.map(aoi => (
                        <g key={aoi.id}>
                            <rect
                                x={aoi.x} y={aoi.y}
                                width={aoi.width} height={aoi.height}
                                fill="rgba(59, 130, 246, 0.1)"
                                stroke="#3B82F6"
                                strokeWidth="0.4"
                            />
                            <text
                                x={aoi.x + 0.5} y={aoi.y + 2.5}
                                fill="#1D4ED8" fontSize="2.5" fontWeight="bold"
                            >
                                {aoi.label}
                            </text>
                        </g>
                    ))}
                    {/* Drawing preview */}
                    {dragCurrent && dragCurrent.w > 0 && (
                        <rect
                            x={dragCurrent.x} y={dragCurrent.y}
                            width={dragCurrent.w} height={dragCurrent.h}
                            fill="rgba(59, 130, 246, 0.15)"
                            stroke="#3B82F6"
                            strokeWidth="0.4"
                            strokeDasharray="1,1"
                        />
                    )}
                </svg>
            </div>

            {/* AOI list */}
            {aois.length > 0 && (
                <div className="space-y-2">
                    {aois.map(aoi => (
                        <div key={aoi.id} className="flex items-center gap-3 p-2.5 bg-white border border-gray-200 rounded-lg">
                            {/* Thumbnail crop */}
                            <div className="w-14 h-10 rounded overflow-hidden flex-shrink-0 border bg-gray-50">
                                <img
                                    src={imageUrl}
                                    alt={aoi.label}
                                    className="w-full h-full"
                                    style={{
                                        objectFit: 'cover',
                                        objectPosition: `${aoi.x + aoi.width / 2}% ${aoi.y + aoi.height / 2}%`,
                                    }}
                                />
                            </div>
                            <span className="text-sm font-medium text-gray-900 flex-1 min-w-0 truncate">
                                {aoi.label}
                            </span>
                            <span className="text-xs text-gray-400">
                                {Math.round(aoi.width)}% x {Math.round(aoi.height)}%
                            </span>
                            <button
                                type="button"
                                onClick={() => removeAoi(aoi.id)}
                                className="p-1 text-red-500 hover:bg-red-50 rounded transition-colors"
                                title="Remove AOI"
                            >
                                <Trash2 className="h-3.5 w-3.5" />
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
