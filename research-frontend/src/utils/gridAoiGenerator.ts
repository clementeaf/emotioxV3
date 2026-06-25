import type { ManualAOI } from '../types/attentionPrediction.types';

/**
 * Generates a grid of ManualAOI items that evenly divide the frame.
 * @param cols - Number of columns (2-5)
 * @param rows - Number of rows (2-5)
 * @param videoDuration - Optional video duration in seconds; sets timeRange on each AOI
 * @returns ManualAOI[] with percentage-based coordinates (0-100)
 */
export const generateGridAois = (
    cols: number,
    rows: number,
    videoDuration?: number,
): ManualAOI[] => {
    const clampedCols = Math.max(2, Math.min(5, Math.round(cols)));
    const clampedRows = Math.max(2, Math.min(5, Math.round(rows)));
    const cellWidth = 100 / clampedCols;
    const cellHeight = 100 / clampedRows;
    const aois: ManualAOI[] = [];

    for (let r = 0; r < clampedRows; r++) {
        for (let c = 0; c < clampedCols; c++) {
            const colLabel = String.fromCharCode(65 + c); // A, B, C...
            const rowLabel = r + 1;
            aois.push({
                id: `grid-${colLabel}${rowLabel}`,
                label: `${colLabel}${rowLabel}`,
                x: c * cellWidth,
                y: r * cellHeight,
                width: cellWidth,
                height: cellHeight,
                source: 'imported-grid',
                ...(videoDuration != null && videoDuration > 0
                    ? { timeRange: { startTime: 0, endTime: videoDuration } }
                    : {}),
            });
        }
    }

    return aois;
};
