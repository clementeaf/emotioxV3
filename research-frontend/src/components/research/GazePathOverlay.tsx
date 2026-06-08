/**
 * GazePathOverlay
 * CSS-positioned overlay that renders numbered fixation points and saccade lines
 * over an image, based on AI-predicted gaze path data.
 * Uses percentage-based positioning to avoid SVG viewBox distortion on non-square images.
 */

import { useEffect, useRef, useState } from 'react';
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
    brief: 32,
    moderate: 40,
    long: 48,
};

const MIN_MARKER_PX = 28;
const MAX_MARKER_PX = 56;

/**
 * Scales marker size based on container dimensions for consistent visibility.
 * @param baseSize - Duration-based base size
 * @param containerMin - Smaller container dimension in pixels
 * @returns Scaled marker size in pixels
 */
const scaleMarkerSize = (baseSize: number, containerMin: number): number => {
    const scale = Math.max(1, Math.min(1.6, containerMin / 420));
    return Math.round(Math.max(MIN_MARKER_PX, Math.min(MAX_MARKER_PX, baseSize * scale)));
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
    strokeWidth,
}: {
    sorted: AiAnalysisResult['gazePath'];
    lineColor: string;
    arrowColor: string;
    arrowId: string;
    strokeWidth: number;
}) => (
    <svg className="absolute inset-0 h-full w-full pointer-events-none" style={{ zIndex: 1 }}>
        <defs>
            <marker id={arrowId} markerWidth="10" markerHeight="8" refX="8" refY="4" orient="auto">
                <path d="M0,0 L10,4 L0,8 Z" fill={arrowColor} />
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
                    strokeWidth={strokeWidth}
                    strokeDasharray="8,5"
                    markerEnd={`url(#${arrowId})`}
                />
            );
        })}
    </svg>
);

/**
 * Renders numbered fixation markers and saccade lines over a stimulus image.
 * @param props - Gaze path data, visibility, and optional route styling
 * @returns Overlay layer or null when hidden
 */
export const GazePathOverlay = ({ gazePath, visible, routeColor, markerId }: GazePathOverlayProps) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [containerMin, setContainerMin] = useState(480);

    useEffect(() => {
        const el = containerRef.current;
        if (!el) return undefined;

        const updateSize = (): void => {
            const rect = el.getBoundingClientRect();
            setContainerMin(Math.max(rect.width, rect.height, MIN_MARKER_PX));
        };

        updateSize();
        const observer = new ResizeObserver(updateSize);
        observer.observe(el);
        return () => observer.disconnect();
    }, []);

    if (!visible || !gazePath || gazePath.length === 0) return null;

    const sorted = [...gazePath].sort((a, b) => a.order - b.order);
    const arrowId = `gaze-arrow${markerId ? `-${markerId}` : ''}`;
    const lineColor = routeColor ? `${routeColor}b3` : 'rgba(255,255,255,0.78)';
    const arrowColor = routeColor ? `${routeColor}e6` : 'rgba(255,255,255,0.9)';
    const strokeWidth = Math.max(2.5, containerMin * 0.004);

    return (
        <div ref={containerRef} className="absolute inset-0 pointer-events-none" style={{ zIndex: 2 }}>
            <SaccadeLines
                sorted={sorted}
                lineColor={lineColor}
                arrowColor={arrowColor}
                arrowId={arrowId}
                strokeWidth={strokeWidth}
            />

            {sorted.map((point, i) => {
                const color = routeColor || getColor(i, sorted.length);
                const size = scaleMarkerSize(DURATION_SIZE[point.duration] || 40, containerMin);

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
                            filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.65))',
                        }}
                    >
                        <div
                            className="absolute rounded-full"
                            style={{
                                width: size + 10,
                                height: size + 10,
                                border: `2.5px solid ${color}`,
                                opacity: 0.55,
                            }}
                        />
                        <div
                            className="flex items-center justify-center rounded-full border-2 border-white"
                            style={{
                                width: size,
                                height: size,
                                backgroundColor: color,
                                opacity: 0.95,
                            }}
                        >
                            <span
                                className="font-bold text-white"
                                style={{
                                    fontSize: Math.max(11, size * 0.34),
                                    textShadow: '0 0 4px rgba(0,0,0,0.9)',
                                }}
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
