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

    // First try component.value (direct value)
    if (component.value !== undefined && component.value !== null) {
        const fromValue = toStableString(component.value);
        if (fromValue.trim().length > 0) {
            return fromValue;
        }
    }

    // Then try component.settings.defaultValue
    if (component.settings?.defaultValue !== undefined && component.settings.defaultValue !== null) {
        const fromSettingsDefault = typeof component.settings.defaultValue === 'string' 
            ? component.settings.defaultValue 
            : toStableString(component.settings.defaultValue);
        if (fromSettingsDefault.trim().length > 0) {
            return fromSettingsDefault;
        }
    }

    // Finally try component.defaultValue (legacy)
    if (component.defaultValue !== undefined && component.defaultValue !== null) {
        const fromLegacyDefault = typeof component.defaultValue === 'string' 
            ? component.defaultValue 
            : toStableString(component.defaultValue);
        if (fromLegacyDefault.trim().length > 0) {
            return fromLegacyDefault;
        }
    }

    return '';
}


