import { describe, expect, it } from 'vitest';
import {
    DEFAULT_COLD_MAP_SETTINGS,
    DEFAULT_SPOTLIGHT_SETTINGS,
    formatHeatmapViewSummary,
} from '../attentionPrediction.utils';

describe('attentionPrediction P4 — heatmap settings UX', () => {
    it('formats classic heatmap summary', () => {
        const summary = formatHeatmapViewSummary({
            mapMode: 'classic',
            settings: { preset: 'Precise', blur: 8, opacity: 55, threshold: 58 },
            spotlight: DEFAULT_SPOTLIGHT_SETTINGS,
            cold: DEFAULT_COLD_MAP_SETTINGS,
        });

        expect(summary).toContain('Precise');
        expect(summary).toContain('blur 8');
        expect(summary).toContain('opacidad 55%');
        expect(summary).toContain('umbral 58');
    });

    it('formats spotlight summary', () => {
        const summary = formatHeatmapViewSummary({
            mapMode: 'spotlight',
            settings: { preset: 'Custom', blur: 8, opacity: 55, threshold: 40 },
            spotlight: { blur: 16, reveal: 35, dim: 45 },
            cold: DEFAULT_COLD_MAP_SETTINGS,
        });

        expect(summary.startsWith('Spotlight')).toBe(true);
        expect(summary).toContain('reveal 35%');
    });

    it('formats cold map summary', () => {
        const summary = formatHeatmapViewSummary({
            mapMode: 'cold',
            settings: { preset: 'Custom', blur: 8, opacity: 55, threshold: 40 },
            spotlight: DEFAULT_SPOTLIGHT_SETTINGS,
            cold: { intensity: 60, blur: 12, threshold: 30 },
        });

        expect(summary.startsWith('Cold')).toBe(true);
        expect(summary).toContain('intensidad 60%');
    });
});
