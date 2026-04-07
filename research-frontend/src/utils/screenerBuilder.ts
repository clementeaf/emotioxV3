import type { ComponentConfig } from '../types/moduleBuilder.types';

/**
 * Returns true when the Screener "Choice Type" select value is Single Choice.
 * @param selectComponent - The Choice Type select (first select in Screener header)
 * @param rawValue - Current value from componentValues
 */
export function isScreenerSingleChoiceSelection(
    selectComponent: ComponentConfig,
    rawValue: string
): boolean {
    const v = rawValue.trim();
    if (!v) {
        return false;
    }
    const opts = selectComponent.options ?? [];
    const opt = opts.find((o) => o.value === v) ?? opts.find((o) => o.label === v);
    if (opt) {
        const label = (opt.label ?? '').toLowerCase();
        const val = (opt.value ?? '').toLowerCase();
        if (label.includes('multiple') || val.includes('multiple')) {
            return false;
        }
        return (
            label.includes('single') ||
            val === 'single' ||
            val.includes('single-choice') ||
            /^single[-_]?choice$/i.test(val)
        );
    }
    const lower = v.toLowerCase();
    if (lower.includes('multiple')) {
        return false;
    }
    return lower.includes('single');
}

/**
 * Returns true when the Screener "Choice Type" select value is Multiple Choice.
 * @param selectComponent - The Choice Type select (first select in Screener header)
 * @param rawValue - Current value from componentValues
 */
export function isScreenerMultipleChoiceSelection(
    selectComponent: ComponentConfig,
    rawValue: string
): boolean {
    const v = rawValue.trim();
    if (!v) {
        return false;
    }
    const opts = selectComponent.options ?? [];
    const opt = opts.find((o) => o.value === v) ?? opts.find((o) => o.label === v);
    if (opt) {
        const label = (opt.label ?? '').toLowerCase();
        const val = (opt.value ?? '').toLowerCase();
        if (label.includes('single') && !label.includes('multiple')) {
            return false;
        }
        return (
            label.includes('multiple') ||
            val === 'multiple' ||
            val.includes('multiple-choice') ||
            /^multiple[-_]?choice$/i.test(val)
        );
    }
    const lower = v.toLowerCase();
    if (lower.includes('single') && !lower.includes('multiple')) {
        return false;
    }
    return lower.includes('multiple');
}
