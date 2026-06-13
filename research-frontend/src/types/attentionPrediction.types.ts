/**
 * Types for Attention Prediction manual AOIs and workflow flags.
 */

export type ManualAoiSource = 'manual' | 'imported-ai' | 'imported-grid';

export interface AoiTimeRange {
    startTime: number; // seconds
    endTime: number;   // seconds
}

export interface ManualAOI {
    id: string;
    label: string;
    x: number;
    y: number;
    width: number;
    height: number;
    source?: ManualAoiSource;
    timeRange?: AoiTimeRange;
}

export interface GridConfig {
    cols: number; // 2-10
    rows: number; // 2-10
}

export interface StimulusAttentionFlags {
    aoiSkipped?: boolean;
    processedAt?: string;
}
