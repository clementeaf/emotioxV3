/**
 * Types for Attention Prediction manual AOIs and workflow flags.
 */

export type ManualAoiSource = 'manual' | 'imported-ai' | 'imported-grid';

export interface ManualAOI {
    id: string;
    label: string;
    x: number;
    y: number;
    width: number;
    height: number;
    source?: ManualAoiSource;
}

export interface StimulusAttentionFlags {
    aoiSkipped?: boolean;
    processedAt?: string;
}
