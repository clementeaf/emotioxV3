import type { ModuleComponent } from '../types/module';

/**
 * Parsed reference from a file-upload component value (object or JSON string).
 */
export interface FileUploadMediaRef {
    url?: string;
    s3Key?: string;
}

/**
 * Extracts url/s3Key from a single file object (research-frontend upload payload).
 */
function mediaRefFromFileObject(o: Record<string, unknown>): FileUploadMediaRef | null {
    const url = typeof o.url === 'string' ? o.url.trim() : '';
    const s3Key = typeof o.s3Key === 'string' ? o.s3Key.trim() : '';
    if (url || s3Key) {
        return { ...(url ? { url } : {}), ...(s3Key ? { s3Key } : {}) };
    }
    return null;
}

/**
 * Normalizes parsed JSON (object or array of files as stored in MySQL for file-upload).
 */
function mediaRefFromParsedValue(parsed: unknown): FileUploadMediaRef | null {
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return mediaRefFromFileObject(parsed as Record<string, unknown>);
    }
    if (Array.isArray(parsed) && parsed.length > 0) {
        const first = parsed[0];
        if (first && typeof first === 'object' && !Array.isArray(first)) {
            return mediaRefFromFileObject(first as Record<string, unknown>);
        }
    }
    return null;
}

/**
 * Reads file-upload value whether stored as object, JSON string, or plain key.
 * @param component - Module component (typically type file-upload)
 * @returns URL and/or S3 key when present
 */
export function getFileUploadMediaRef(component: ModuleComponent | null | undefined): FileUploadMediaRef | null {
    if (!component || component.type !== 'file-upload') {
        return null;
    }
    const v = component.value;
    if (Array.isArray(v) && v.length > 0) {
        const ref = mediaRefFromParsedValue(v);
        if (ref) {
            return ref;
        }
    }
    if (v && typeof v === 'object' && !Array.isArray(v)) {
        const ref = mediaRefFromFileObject(v as Record<string, unknown>);
        if (ref) {
            return ref;
        }
    }
    if (typeof v === 'string' && v.trim()) {
        const s = v.trim();
        if (s.startsWith('{') || s.startsWith('[')) {
            try {
                const parsed: unknown = JSON.parse(s);
                const ref = mediaRefFromParsedValue(parsed);
                if (ref) {
                    return ref;
                }
            } catch {
                return null;
            }
        } else {
            return { s3Key: s };
        }
    }
    return null;
}

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


