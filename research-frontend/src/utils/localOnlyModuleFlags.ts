/**
 * Detects whether the app is running on localhost.
 * @returns true when hostname is localhost or 127.0.0.1
 */
export const isLocalhost = (): boolean => {
    if (typeof window === 'undefined') return false;
    const host = window.location.hostname;
    return host === 'localhost' || host === '127.0.0.1';
};

/**
 * Builds a stable localStorage key for per-module local-only flags.
 * @param moduleId - Module id
 * @param flag - Flag name
 * @returns Storage key
 */
const buildModuleFlagKey = (moduleId: string, flag: 'hidden'): string => {
    return `emotioxv3.local.module.${moduleId}.${flag}`;
};

/**
 * Reads the local-only "hidden" flag for a module.
 * Defaults to false.
 * @param moduleId - Module id
 * @returns Hidden flag value
 */
export const getLocalModuleHidden = (moduleId: string): boolean => {
    if (!isLocalhost()) return false;
    try {
        const raw = window.localStorage.getItem(buildModuleFlagKey(moduleId, 'hidden'));
        return raw === 'true';
    } catch {
        return false;
    }
};

/**
 * Persists the local-only "hidden" flag for a module.
 * No-op outside localhost.
 * @param moduleId - Module id
 * @param hidden - Hidden flag value
 * @returns void
 */
export const setLocalModuleHidden = (moduleId: string, hidden: boolean): void => {
    if (!isLocalhost()) return;
    try {
        window.localStorage.setItem(buildModuleFlagKey(moduleId, 'hidden'), hidden ? 'true' : 'false');
    } catch {
        // ignore
    }
};


