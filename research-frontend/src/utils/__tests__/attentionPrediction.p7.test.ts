import { describe, expect, it } from 'vitest';
import {
    isEditableDomTarget,
    shouldBlockAoiKeyboardDelete,
} from '../attentionPrediction.utils';

describe('attentionPrediction P7 — AOI label editing', () => {
    it('detects input and textarea as editable targets', () => {
        const input = document.createElement('input');
        const textarea = document.createElement('textarea');

        expect(isEditableDomTarget(input)).toBe(true);
        expect(isEditableDomTarget(textarea)).toBe(true);
        expect(isEditableDomTarget(document.createElement('div'))).toBe(false);
    });

    it('blocks AOI delete while naming modal is open', () => {
        expect(shouldBlockAoiKeyboardDelete({
            showNameModal: true,
            editingLabelId: null,
            criteriaDrawerOpen: false,
            target: document.createElement('div'),
        })).toBe(true);
    });

    it('blocks AOI delete while inline label is being edited', () => {
        expect(shouldBlockAoiKeyboardDelete({
            showNameModal: false,
            editingLabelId: 'aoi-1',
            criteriaDrawerOpen: false,
            target: document.createElement('div'),
        })).toBe(true);
    });

    it('blocks AOI delete when focus is inside a text input', () => {
        const input = document.createElement('input');
        expect(shouldBlockAoiKeyboardDelete({
            showNameModal: false,
            editingLabelId: null,
            criteriaDrawerOpen: false,
            target: input,
        })).toBe(true);
    });

    it('allows AOI delete on canvas when no text control is active', () => {
        expect(shouldBlockAoiKeyboardDelete({
            showNameModal: false,
            editingLabelId: null,
            criteriaDrawerOpen: false,
            target: document.createElement('div'),
        })).toBe(false);
    });
});
