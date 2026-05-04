/**
 * GazePathOverlay
 * CSS-positioned overlay that renders numbered fixation points and saccade lines
 * over an image, based on AI-predicted gaze path data.
 * Uses percentage-based positioning to avoid SVG viewBox distortion on non-square images.
 */

import type { AiAnalysisResult } from '../../types/aiAnalysis.types';

interface GazePathOverlayProps {
    gazePath: AiAnalysisResult['gazePath'];
    visible: boolean;
    /** Fixed color for all points (overrides gradient). Use for multi-route views. */
    routeColor?: string;
    /** Unique ID suffix for SVG markers to avoid conflicts with multiple overlays */
    markerId?: string;
}

const DURATION_SIZE: Record<string, number> = {
    brief: 24,
    moderate: 32,
    long: 40,
};

const getColor = (index: number, total: number): string => {
    const t = total <= 1 ? 0 : index / (total - 1);
    const r = Math.round(t < 0.5 ? 0 : (t - 0.5) * 2 * 255);
    const g = Math.round(t < 0.5 ? t * 2 * 255 : (1 - t) * 2 * 255);
    const b = Math.round(t < 0.5 ? (1 - t * 2) * 255 : 0);
    return `rgb(${r},${g},${b})`;
};

/** SVG line layer connecting fixation points — uses viewBox matching container aspect. */
const SaccadeLines = ({
    sorted,
    lineColor,
    arrowColor,
    arrowId,
}: {
    sorted: AiAnalysisResult['gazePath'];
    lineColor: string;
    arrowColor: string;
    arrowId: string;
}) => (
    <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 1 }}>
        <defs>
            <marker id={arrowId} markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
                <path d="M0,0 L8,3 L0,6 Z" fill={arrowColor} />
            </marker>
        </defs>
        {sorted.map((point, i) => {
            if (i === 0) return null;
            const prev = sorted[i - 1];
            return (
                <line
                    key={`line-${i}`}
                    x1={`${prev.x}%`}
                    y1={`${prev.y}%`}
                    x2={`${point.x}%`}
                    y2={`${point.y}%`}
                    stroke={lineColor}
                    strokeWidth="2"
                    strokeDasharray="6,4"
                    markerEnd={`url(#${arrowId})`}
                />
            );
        })}
    </svg>
);

export const GazePathOverlay = ({ gazePath, visible, routeColor, markerId }: GazePathOverlayProps) => {
    if (!visible || !gazePath || gazePath.length === 0) return null;

    const sorted = [...gazePath].sort((a, b) => a.order - b.order);
    const arrowId = `gaze-arrow${markerId ? `-${markerId}` : ''}`;
    const lineColor = routeColor ? `${routeColor}80` : 'rgba(255,255,255,0.5)';
    const arrowColor = routeColor ? `${routeColor}99` : 'rgba(255,255,255,0.6)';

    return (
        <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 2 }}>
            {/* Saccade lines — SVG without viewBox uses pixel/% coordinates directly */}
            <SaccadeLines sorted={sorted} lineColor={lineColor} arrowColor={arrowColor} arrowId={arrowId} />

            {/* Fixation points — CSS positioned, always circular */}
            {sorted.map((point, i) => {
                const color = routeColor || getColor(i, sorted.length);
                const size = DURATION_SIZE[point.duration] || 32;

                return (
                    <div
                        key={`fix-${point.order}`}
                        className="absolute flex items-center justify-center"
                        style={{
                            left: `${point.x}%`,
                            top: `${point.y}%`,
                            width: size,
                            height: size,
                            transform: 'translate(-50%, -50%)',
                            zIndex: 3,
                        }}
                    >
                        {/* Outer glow */}
                        <div
                            className="absolute rounded-full"
                            style={{
                                width: size + 8,
                                height: size + 8,
                                border: `2px solid ${color}`,
                                opacity: 0.4,
                            }}
                        />
                        {/* Main circle */}
                        <div
                            className="rounded-full flex items-center justify-center border-2 border-white"
                            style={{
                                width: size,
                                height: size,
                                backgroundColor: color,
                                opacity: 0.85,
                            }}
                        >
                            <span
                                className="text-white font-bold text-xs"
                                style={{ textShadow: '0 0 3px rgba(0,0,0,0.8)' }}
                            >
                                {point.order}
                            </span>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};
