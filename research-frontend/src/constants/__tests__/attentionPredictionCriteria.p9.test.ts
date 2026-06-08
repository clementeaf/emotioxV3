import { describe, expect, it } from 'vitest';
import {
    DEFAULT_ATTENTION_CRITERIA,
    DEFAULT_CRITERIA_LABEL,
    isAttentionCriteriaConfigured,
} from '../attentionPredictionCriteria';

describe('attentionPrediction P9 — criteria workflow step', () => {
    it('marks default prompt as not configured', () => {
        expect(isAttentionCriteriaConfigured('', '')).toBe(false);
        expect(isAttentionCriteriaConfigured(undefined, undefined)).toBe(false);
    });

    it('marks saved custom name as configured', () => {
        expect(isAttentionCriteriaConfigured('UX Data Visualization', '')).toBe(true);
        expect(isAttentionCriteriaConfigured('Personalizado', '')).toBe(true);
    });

    it('marks non-default saved prompt as configured', () => {
        expect(isAttentionCriteriaConfigured(
            '',
            'Criterio personalizado para packaging FMCG',
        )).toBe(true);
    });

    it('does not mark default label with default prompt as configured', () => {
        expect(isAttentionCriteriaConfigured(
            DEFAULT_CRITERIA_LABEL,
            DEFAULT_ATTENTION_CRITERIA,
        )).toBe(false);
    });
});
