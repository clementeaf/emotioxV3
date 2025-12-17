import type { ModuleComponent } from '../types/module';

/**
 * Converts an unknown value to a stable string representation.
 * @param value - Unknown value from backend config
 * @returns String representation safe for UI rendering
 */
export function toStableString(value: unknown): string {
    if (typeof value === 'string') return value;
    if (typeof value === 'number') return String(value);
    if (typeof value === 'boolean') return value ? 'true' : 'false';
    if (value === null || value === undefined) return '';
    try {
        return JSON.stringify(value);
    } catch {
        return String(value);
    }
}

/**
 * Resolves the best available text for a module component.
 * Priority: component.value -> component.settings.defaultValue -> component.defaultValue.
 * @param component - Module component
 * @returns Resolved text (may be empty string)
 */
export function getComponentText(component: ModuleComponent | null | undefined): string {
    if (!component) return '';

    const fromValue = toStableString(component.value);
    if (fromValue.trim().length > 0) return fromValue;

    const fromSettingsDefault = typeof component.settings?.defaultValue === 'string' ? component.settings.defaultValue : '';
    if (fromSettingsDefault.trim().length > 0) return fromSettingsDefault;

    const fromLegacyDefault = typeof component.defaultValue === 'string' ? component.defaultValue : '';
    if (fromLegacyDefault.trim().length > 0) return fromLegacyDefault;

    return '';
}


