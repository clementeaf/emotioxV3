import { describe, expect, it } from 'vitest';
import {
    CUSTOM_CRITERIA_LABEL,
    DEFAULT_ATTENTION_CRITERIA,
    DEFAULT_CRITERIA_LABEL,
    DEFAULT_CRITERIA_PRESETS,
    matchCriteriaPresetName,
    mergeDefaultCriteriaPresets,
    resolveAttentionCriteriaLabel,
    resolveCriteriaNameForSave,
} from '../attentionPredictionCriteria';

describe('attentionPrediction criteria P5', () => {
    it('returns Default when no custom prompt is saved', () => {
        expect(resolveAttentionCriteriaLabel('', '', DEFAULT_CRITERIA_PRESETS)).toBe(DEFAULT_CRITERIA_LABEL);
    });

    it('returns saved criteria name when provided', () => {
        expect(
            resolveAttentionCriteriaLabel('UX Data Visualization', 'custom body', DEFAULT_CRITERIA_PRESETS),
        ).toBe('UX Data Visualization');
    });

    it('matches preset name from exact prompt text', () => {
        const preset = DEFAULT_CRITERIA_PRESETS.find((item) => item.name === 'Landing / Web');
        expect(preset).toBeDefined();
        expect(matchCriteriaPresetName(preset!.prompt, DEFAULT_CRITERIA_PRESETS)).toBe('Landing / Web');
    });

    it('falls back to Personalizado for unknown custom prompt', () => {
        expect(
            resolveAttentionCriteriaLabel(undefined, 'totally custom criteria', DEFAULT_CRITERIA_PRESETS),
        ).toBe(CUSTOM_CRITERIA_LABEL);
    });

    it('persists preset name on save when draft matches a preset', () => {
        const preset = DEFAULT_CRITERIA_PRESETS.find((item) => item.name === 'UX Data Visualization');
        expect(preset).toBeDefined();
        expect(
            resolveCriteriaNameForSave(preset!.prompt, preset!.name, DEFAULT_CRITERIA_PRESETS),
        ).toBe('UX Data Visualization');
    });

    it('clears criteria name when saving default prompt', () => {
        expect(
            resolveCriteriaNameForSave(DEFAULT_ATTENTION_CRITERIA, DEFAULT_CRITERIA_LABEL, DEFAULT_CRITERIA_PRESETS),
        ).toBe('');
    });

    it('merges missing built-in presets into stored list', () => {
        const stored = [{ name: 'My Custom', prompt: 'custom' }];
        const merged = mergeDefaultCriteriaPresets(stored);
        expect(merged.some((item) => item.name === 'UX Data Visualization')).toBe(true);
        expect(merged.some((item) => item.name === 'My Custom')).toBe(true);
    });
});
