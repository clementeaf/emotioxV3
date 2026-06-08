import { describe, expect, it } from 'vitest';
import { shouldBlockAoiKeyboardDelete } from '../attentionPrediction.utils';

describe('attentionPrediction P8 — criteria drawer editing', () => {
    it('blocks AOI delete while criteria drawer is open', () => {
        expect(shouldBlockAoiKeyboardDelete({
            showNameModal: false,
            editingLabelId: null,
            criteriaDrawerOpen: true,
            target: document.createElement('div'),
        })).toBe(true);
    });

    it('blocks AOI delete for criteria textarea target', () => {
        const textarea = document.createElement('textarea');
        expect(shouldBlockAoiKeyboardDelete({
            showNameModal: false,
            editingLabelId: null,
            criteriaDrawerOpen: false,
            target: textarea,
        })).toBe(true);
    });
});
