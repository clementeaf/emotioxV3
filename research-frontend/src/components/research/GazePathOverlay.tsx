/**
 * GazePathOverlay
 * SVG overlay that renders numbered fixation points and saccade lines
 * over an image, based on AI-predicted gaze path data.
 */

import type { AiAnalysisResult } from '../../types/aiAnalysis.types';

interface GazePathOverlayProps {
    gazePath: AiAnalysisResult['gazePath'];
    visible: boolean;
}

const DURATION_RADIUS: Record<string, number> = {
    brief: 1.8,
    moderate: 2.5,
    long: 3.2,
};

const getColor = (index: number, total: number): string => {
    const t = total <= 1 ? 0 : index / (total - 1);
    // Blue → Cyan → Green → Yellow → Red
    const r = Math.round(t < 0.5 ? 0 : (t - 0.5) * 2 * 255);
    const g = Math.round(t < 0.5 ? t * 2 * 255 : (1 - t) * 2 * 255);
    const b = Math.round(t < 0.5 ? (1 - t * 2) * 255 : 0);
    return `rgb(${r},${g},${b})`;
};

export const GazePathOverlay = ({ gazePath, visible }: GazePathOverlayProps) => {
    if (!visible || !gazePath || gazePath.length === 0) return null;

    const sorted = [...gazePath].sort((a, b) => a.order - b.order);

    return (
        <svg
            className="absolute inset-0 w-full h-full pointer-events-none"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
        >
            <defs>
                <marker
                    id="gaze-arrow"
                    markerWidth="6"
                    markerHeight="4"
                    refX="5"
                    refY="2"
                    orient="auto"
                >
                    <path d="M0,0 L6,2 L0,4 Z" fill="rgba(255,255,255,0.6)" />
                </marker>
            </defs>

            {/* Saccade lines */}
            {sorted.map((point, i) => {
                if (i === 0) return null;
                const prev = sorted[i - 1];
                return (
                    <line
                        key={`line-${i}`}
                        x1={prev.x}
                        y1={prev.y}
                        x2={point.x}
                        y2={point.y}
                        stroke="rgba(255,255,255,0.5)"
                        strokeWidth="0.3"
                        strokeDasharray="0.8,0.4"
                        markerEnd="url(#gaze-arrow)"
                    />
                );
            })}

            {/* Fixation points */}
            {sorted.map((point, i) => {
                const color = getColor(i, sorted.length);
                const radius = DURATION_RADIUS[point.duration] || 2.5;

                return (
                    <g key={`fix-${point.order}`}>
                        {/* Outer glow */}
                        <circle
                            cx={point.x}
                            cy={point.y}
                            r={radius + 0.8}
                            fill="none"
                            stroke={color}
                            strokeWidth="0.3"
                            opacity={0.4}
                        />
                        {/* Main circle */}
                        <circle
                            cx={point.x}
                            cy={point.y}
                            r={radius}
                            fill={color}
                            fillOpacity={0.75}
                            stroke="white"
                            strokeWidth="0.25"
                        />
                        {/* Number label */}
                        <text
                            x={point.x}
                            y={point.y}
                            textAnchor="middle"
                            dominantBaseline="central"
                            fill="white"
                            fontSize="1.6"
                            fontWeight="bold"
                            style={{ textShadow: '0 0 2px rgba(0,0,0,0.8)' }}
                        >
                            {point.order}
                        </text>
                    </g>
                );
            })}
        </svg>
    );
};
