/**
 * Safely extracts a string from an unknown value.
 * @param value - Unknown value
 * @returns String if value is a string, otherwise undefined
 */
export const toOptionalString = (value: unknown): string | undefined => {
    return typeof value === 'string' ? value : undefined;
};

/**
 * Sanitizes the serialized value of a file-upload component by removing ephemeral presigned URL fields.
 * This prevents persisting time-limited S3 URLs into module configuration.
 * @param serialized - Serialized component value (usually JSON)
 * @returns Sanitized serialized value
 */
export const sanitizeFileUploadSerializedValue = (serialized: string | undefined): string | undefined => {
    if (!serialized) {
        return serialized;
    }

    const isRecord = (value: unknown): value is Record<string, unknown> =>
        typeof value === 'object' && value !== null;

    const stripUrlFields = (value: unknown): unknown => {
        if (Array.isArray(value)) {
            return value.map(stripUrlFields);
        }
        if (!isRecord(value)) {
            return value;
        }

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { url: _url, urlExpiresAt: _urlExpiresAt, ...rest } = value;
        return rest;
    };

    try {
        const parsed = JSON.parse(serialized) as unknown;
        const sanitized = stripUrlFields(parsed);
        return JSON.stringify(sanitized);
    } catch {
        return serialized;
    }
};

/** Sync rankingConfig.items from comp.value for ranking/ranking-list components */
export const syncRankingConfig = <T extends { type: string; value?: string; rankingConfig?: { items?: unknown[] } }>(comp: T): T => {
    if ((comp.type === 'ranking' || comp.type === 'ranking-list') && comp.value) {
        try {
            const parsed = JSON.parse(comp.value);
            if (Array.isArray(parsed)) {
                return { ...comp, rankingConfig: { ...comp.rankingConfig, items: parsed } };
            }
        } catch { /* keep original */ }
    }
    return comp;
};

// Helper function to transform componentValues into structured config for Research Configuration
export const transformResearchConfigComponentValues = (values: Record<string, string>): Record<string, unknown> => {
    // Initialize structured config
    const config: Record<string, unknown> = {
        demographics: {},
        linkConfig: {},
        backlinks: {},
        participantLimit: 50,
        researchUrl: '',
        participationMode: 'panel'
    };

    // Helper to try parsing JSON or return original
    const tryParse = (val: string) => {
        if (val === 'true') return true;
        if (val === 'false') return false;
        try {
            const parsed = JSON.parse(val);
            if (typeof parsed === 'object' && parsed !== null) return parsed;
        } catch {
            // ignore
        }
        return val;
    };

    // Process each component value
    Object.entries(values).forEach(([key, value]) => {
        // Handle demographics (predefined + customQuestion_*)
        if (['age', 'country', 'gender', 'educationLevel', 'annualIncome', 'employmentStatus', 'dailyHoursOnline', 'technicalProficiency'].includes(key) || key.startsWith('customQuestion_')) {
            (config.demographics as Record<string, unknown>)[key] = tryParse(value);
        }
        // Handle link configuration
        else if (['allowMobile', 'trackLocation', 'allowMultiple'].includes(key)) {
            (config.linkConfig as Record<string, boolean>)[key] = value === 'true';
        }
        // Handle backlinks
        else if (['complete', 'disqualified', 'overquota'].includes(key)) {
            (config.backlinks as Record<string, string>)[key] = value;
        }
        // Handle research URL
        else if (key === 'researchUrl') {
            config.researchUrl = value;
        }
        // Handle participant limit
        else if (key === 'participantLimit') {
            const parsed = tryParse(value);
            if (typeof parsed === 'object' && parsed !== null && 'enabled' in parsed) {
                config.participantLimit = parsed;
            } else {
                config.participantLimit = parseInt(value) || 50;
            }
        }
        // Handle participation mode
        else if (key === 'participationMode') {
            config.participationMode = value || 'panel';
        }
        // Handle study logo
        else if (key === 'studyLogo') {
            config.studyLogo = tryParse(value);
        }
    });

    return config;
};

// Helper function to flatten nested config into componentValues
export const flattenResearchConfig = (config: Record<string, unknown>): Record<string, string> => {
    const values: Record<string, string> = {};

    if (config.demographics) {
        Object.entries(config.demographics as Record<string, unknown>).forEach(([key, value]) => {
            if (typeof value === 'object' && value !== null) {
                values[key] = JSON.stringify(value);
            } else {
                values[key] = String(value);
            }
        });
    }

    if (config.linkConfig) {
        Object.entries(config.linkConfig as Record<string, boolean>).forEach(([key, value]) => {
            values[key] = String(value);
        });
    }

    if (config.backlinks) {
        Object.entries(config.backlinks as Record<string, string>).forEach(([key, value]) => {
            values[key] = value;
        });
    }

    if (config.researchUrl) {
        values.researchUrl = String(config.researchUrl);
    }

    if (config.participantLimit !== undefined) {
        values.participantLimit = typeof config.participantLimit === 'object'
            ? JSON.stringify(config.participantLimit)
            : String(config.participantLimit);
    }

    if (config.participationMode) {
        values.participationMode = String(config.participationMode);
    }

    if (config.studyLogo) {
        values.studyLogo = typeof config.studyLogo === 'object'
            ? JSON.stringify(config.studyLogo)
            : String(config.studyLogo);
    }

    return values;
};
