import { describe, expect, it } from 'vitest';
import { buildAttentionLayerPreset } from '../attentionPrediction.utils';

const fullContext = {
    hasHeatmap: true,
    hasGazeRoutes: true,
    hasManualAois: true,
    hasAutoAois: true,
};

describe('attentionPrediction P6 — composite visualization', () => {
    it('enables all available overlays on Original tab', () => {
        expect(buildAttentionLayerPreset('original', fullContext)).toEqual({
            heatmap: true,
            aiAois: true,
            manualAois: true,
            gaze: true,
        });
    });

    it('enables composite overlays on Gaze Paths tab', () => {
        expect(buildAttentionLayerPreset('gaze-paths', fullContext)).toEqual({
            heatmap: true,
            aiAois: true,
            manualAois: true,
            gaze: true,
        });
    });

    it('keeps Heatmap tab focused on heatmap only', () => {
        expect(buildAttentionLayerPreset('heatmap', fullContext)).toEqual({
            heatmap: true,
            aiAois: false,
            manualAois: false,
            gaze: false,
        });
    });

    it('keeps AOI Editor focused on manual zones', () => {
        expect(buildAttentionLayerPreset('aoi-editor', fullContext)).toEqual({
            heatmap: true,
            aiAois: false,
            manualAois: true,
            gaze: false,
        });
    });

    it('disables unavailable overlays on Original tab', () => {
        expect(buildAttentionLayerPreset('original', {
            hasHeatmap: false,
            hasGazeRoutes: false,
            hasManualAois: false,
            hasAutoAois: false,
        })).toEqual({
            heatmap: false,
            aiAois: false,
            manualAois: false,
            gaze: false,
        });
    });
});
