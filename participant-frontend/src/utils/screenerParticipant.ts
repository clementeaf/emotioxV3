import type { ModuleComponent } from '../types/module';
import { getComponentText } from './moduleComponent';

/** Parsed option for ChoiceQuestion */
export interface ScreenerChoiceOption {
    id: string;
    label: string;
    /** Routing set by researcher: 'Qualify' keeps participant, 'Disqualify' blocks */
    eligibility?: 'Qualify' | 'Disqualify';
}

/**
 * Detects Multiple Choice from the Screener "Choice Type" select (same rules as research-frontend screenerBuilder).
 * @param selectComponent - First select in the Screener module
 * @param rawValue - Saved value for that select
 * @returns true when the participant should allow multiple selections
 */
export function isScreenerMultipleChoiceSelection(
    selectComponent: ModuleComponent,
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

/**
 * Parses choice rows from JSON stored on radio / option-list / checkbox-list (RadioChoicesEditor in research-frontend).
 * @param value - Component value (stringified JSON or already an array)
 * @returns Stable id/label pairs for ChoiceQuestion
 */
export function parseScreenerJsonChoices(value: unknown): ScreenerChoiceOption[] {
    let arr: unknown[] = [];
    if (Array.isArray(value)) {
        arr = value;
    } else if (typeof value === 'string') {
        try {
            const parsed: unknown = JSON.parse(value);
            if (Array.isArray(parsed)) {
                arr = parsed;
            }
        } catch {
            return [];
        }
    } else {
        return [];
    }
    return arr.map((item, i) => {
        if (item && typeof item === 'object' && 'id' in item) {
            const o = item as { id?: string; label?: string; value?: string; eligibility?: string };
            const opt: ScreenerChoiceOption = {
                id: String(o.id ?? `opt-${i}`),
                label: String(o.label ?? o.value ?? `Option ${i + 1}`),
            };
            if (o.eligibility === 'Qualify' || o.eligibility === 'Disqualify') {
                opt.eligibility = o.eligibility;
            }
            return opt;
        }
        return { id: `opt-${i}`, label: String(item) };
    });
}

/**
 * Reads choices from choicesConfig (legacy / Module Builder "choices" type).
 * @param component - Module component that may carry choicesConfig
 * @returns Options or empty array
 */
function parseChoicesConfig(component: ModuleComponent): ScreenerChoiceOption[] {
    const raw = component as unknown as {
        choicesConfig?: { choices?: Array<{ id: string; label?: string }> };
    };
    const choices = raw.choicesConfig?.choices;
    if (!choices?.length) {
        return [];
    }
    return choices.map((choice, i) => ({
        id: choice.id,
        label: choice.label ?? `Option ${i + 1}`,
    }));
}

/**
 * Resolves Screener title component: prefer question-title, then non-description title-like ids.
 * @param sorted - Components sorted by order
 * @returns The component that holds the main question text, if any
 */
export function resolveScreenerTitleComponent(
    sorted: ModuleComponent[]
): ModuleComponent | undefined {
    return (
        sorted.find((c) => c.id === 'question-title') ??
        sorted.find((c) => c.id.includes('title') && !c.id.toLowerCase().includes('description')) ??
        sorted.find((c) => c.id === 'screener-question') ??
        sorted.find((c) => c.id.includes('question') && !c.id.toLowerCase().includes('description'))
    );
}

/**
 * Resolves Screener description component.
 * @param sorted - Components sorted by order
 * @returns Description component if present
 */
export function resolveScreenerDescriptionComponent(
    sorted: ModuleComponent[]
): ModuleComponent | undefined {
    return (
        sorted.find((c) => c.id === 'question-description') ??
        sorted.find((c) => c.id.includes('description') && !c.id.includes('question-title'))
    );
}

const LIST_TYPES = new Set(['radio', 'option-list', 'checkbox-list']);

/**
 * Builds the list of options shown to the participant (matches how data is stored in MySQL config).
 * Priority: JSON on list components, then isChoice rows, then choicesConfig.
 * @param components - Raw module.components from API
 * @returns Options for ChoiceQuestion
 */
export function resolveScreenerChoiceOptions(components: ModuleComponent[]): ScreenerChoiceOption[] {
    const sorted = [...components].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

    for (const c of sorted) {
        const t = c.type as string;
        if (LIST_TYPES.has(t)) {
            const parsed = parseScreenerJsonChoices(c.value);
            if (parsed.length > 0) {
                return parsed;
            }
        }
    }

    const isChoiceOpts = sorted
        .filter((c) => c.settings?.isChoice || c.id.includes('choice-'))
        .map((c) => ({ id: c.id, label: getComponentText(c) }))
        .filter((o) => o.label.trim().length > 0);

    if (isChoiceOpts.length > 0) {
        return isChoiceOpts;
    }

    for (const c of sorted) {
        const fromCfg = parseChoicesConfig(c);
        if (fromCfg.length > 0) {
            return fromCfg;
        }
    }

    return [];
}

/**
 * Whether the Screener should use multi-select UI (checkbox-style in ChoiceQuestion).
 * @param components - Module components
 * @returns true for multiple-choice mode
 */
export function resolveScreenerIsMultiple(components: ModuleComponent[]): boolean {
    const sorted = [...components].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    const t = (c: ModuleComponent): string => c.type as string;
    if (sorted.some((c) => t(c) === 'checkbox-list')) {
        return true;
    }
    const select = sorted.find((c) => c.type === 'select');
    if (select) {
        const raw =
            typeof select.value === 'string'
                ? select.value
                : select.value !== undefined && select.value !== null
                  ? String(select.value)
                  : '';
        if (isScreenerMultipleChoiceSelection(select, raw)) {
            return true;
        }
    }
    return false;
}
