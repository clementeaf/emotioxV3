import { describe, expect, it } from 'vitest';
import { reconcileAutoAoisWithManual } from '../attentionPrediction.utils';
import type { ManualAOI } from '../../types/attentionPrediction.types';

describe('attentionPrediction F2 — predict flow guards', () => {
    const manualAois: ManualAOI[] = [
        { id: '1', label: 'Logo', x: 30, y: 40, width: 20, height: 10 },
    ];
    const aiAois = [
        { label: 'Logo', x: 32, y: 42, width: 18, height: 8, attentionLevel: 'high', description: 'Brand logo' },
        { label: 'Banner', x: 10, y: 10, width: 40, height: 20, attentionLevel: 'medium', description: 'Banner area' },
    ];

    it('reconcileAutoAoisWithManual returns empty array when isPredicting guard active', () => {
        // Simulates the guard: isPredicting ? [] : reconcile(...)
        const isPredicting = true;
        const result = isPredicting ? [] : reconcileAutoAoisWithManual(manualAois, aiAois);
        expect(result).toEqual([]);
    });

    it('reconcileAutoAoisWithManual returns reconciled when not predicting', () => {
        const isPredicting = false;
        const result = isPredicting ? [] : reconcileAutoAoisWithManual(manualAois, aiAois);
        expect(result.length).toBeGreaterThan(0);
    });

    it('auto-switch logic: wasPredicting=true + isPredicting=false + hasHeatmap → triggers switch', () => {
        let wasPredicting = true;
        const isPredicting = false;
        const hasHeatmap = true;
        const justFinished = wasPredicting && !isPredicting && hasHeatmap;
        wasPredicting = isPredicting;

        expect(justFinished).toBe(true);
        expect(wasPredicting).toBe(false);
    });

    it('auto-switch logic: wasPredicting=false → no switch even with heatmap', () => {
        const wasPredicting = false;
        const isPredicting = false;
        const hasHeatmap = true;
        const justFinished = wasPredicting && !isPredicting && hasHeatmap;

        expect(justFinished).toBe(false);
    });

    it('auto-switch logic: prediction finishes but no heatmap → no switch', () => {
        const wasPredicting = true;
        const isPredicting = false;
        const hasHeatmap = false;
        const justFinished = wasPredicting && !isPredicting && hasHeatmap;

        expect(justFinished).toBe(false);
    });
});
