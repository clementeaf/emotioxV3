import type { ReactElement } from 'react';
import type { AiAnalysisResult } from '../../types/aiAnalysis.types';

interface AiAoiOverlayProps {
    autoAois: AiAnalysisResult['autoAois'];
    importedLabels?: Set<string>;
}

/**
 * Renders dashed preview rectangles for AI-detected AOIs (non-interactive).
 * @param props - autoAois list and optional imported label set to hide duplicates
 * @returns Overlay layer for heatmap or AOI editor
 */
export function AiAoiOverlay({ autoAois, importedLabels }: AiAoiOverlayProps): ReactElement | null {
    if (!autoAois?.length) return null;

    const levelColors: Record<string, string> = {
        high: '#EF4444',
        medium: '#F59E0B',
        low: '#94A3B8',
    };

    return (
        <>
            {autoAois.map((aoi, i) => {
                if (importedLabels?.has(aoi.label)) return null;
                const color = levelColors[aoi.attentionLevel] ?? '#94A3B8';
                const borderStyle = aoi.lowConfidence ? 'dotted' : 'dashed';
                return (
                    <div
                        key={`auto-${i}`}
                        className="absolute pointer-events-none z-10"
                        style={{
                            left: `${aoi.x}%`,
                            top: `${aoi.y}%`,
                            width: `${aoi.width}%`,
                            height: `${aoi.height}%`,
                            border: `2px ${borderStyle} ${color}`,
                            backgroundColor: `${color}18`,
                        }}
                    >
                        <span
                            className="absolute -top-5 left-0 text-[10px] font-semibold px-1.5 py-0.5 rounded whitespace-nowrap"
                            style={{ color: '#fff', backgroundColor: color }}
                        >
                            {aoi.label}
                            {aoi.lowConfidence ? ' (aprox.)' : ''}
                        </span>
                    </div>
                );
            })}
        </>
    );
}
