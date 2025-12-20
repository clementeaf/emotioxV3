import { useCallback } from 'react';

/**
 * Hook for URL validation and parameter extraction
 */
export const useUrlValidation = () => {
    /**
     * Validates if a string is a valid URL format
     * @param url - URL string to validate
     * @returns Validation result with isValid flag and optional error message
     */
    const validateUrl = useCallback((url: string): { isValid: boolean; error?: string } => {
        if (!url.trim()) {
            return { isValid: false, error: 'URL is required' };
        }

        try {
            // Add https:// if protocol is missing
            const fullUrl = url.startsWith('http://') || url.startsWith('https://')
                ? url
                : `https://${url}`;
            new URL(fullUrl);
            return { isValid: true };
        } catch {
            return { isValid: false, error: 'Invalid URL format' };
        }
    }, []);

    /**
     * Extracts parameters from a URL that are in {curly braces}
     * @param url - URL string to extract parameters from
     * @returns Array of parameter names found in curly braces
     */
    const extractParameters = useCallback((url: string): string[] => {
        const params: string[] = [];
        const regex = /\{([^}]+)\}/g;
        let match;

        while ((match = regex.exec(url)) !== null) {
            params.push(match[1]);
        }

        return params;
    }, []);

    return { validateUrl, extractParameters };
};
