/**
 * Detects whether the app is running on localhost.
 * @returns true when hostname is localhost or 127.0.0.1
 */
export const isLocalhost = (): boolean => {
    if (typeof window === 'undefined') return false;
    const host = window.location.hostname;
    return host === 'localhost' || host === '127.0.0.1';
};


