/**
 * Demographics Data Mapper
 * Transforms modal output format to backend DemographicConfig format
 */

// Backend expected types
export type LocationGranularity = 'countryOnly' | 'countryCity';

interface BackendQuotaConfig {
    id: string;
    value: string;
    limit: number;
    enabled: boolean;
    enforcementMode: 'immediate' | 'post_collection';
}

interface BackendDisqualification {
    id: string;
    value: string;
    enabled: boolean;
}

interface BackendDemographicConfig {
    enabled: boolean;
    quotas?: BackendQuotaConfig[];
    disqualifications?: BackendDisqualification[];
    min?: number;
    max?: number;
    value?: string;
    granularity?: LocationGranularity;
    // Keep original data for frontend use
    validValues?: string[];
    priorityValues?: string[];
    // Preserve modal-format fields for round-trip (reopening modals)
    validAges?: string[];
    disqualifyingAges?: string[];
    validCountries?: string[];
    disqualifyingCountries?: string[];
    priorityCountries?: string[];
    options?: ModalGenericOption[];
    disqualified?: string[];
}

// Modal output types
interface ModalAgeQuota {
    id: string;
    ageRange: string;
    quota: number;
    quotaType: 'absolute' | 'percentage';
    isActive: boolean;
    enforcementMode?: 'immediate' | 'post_collection';
}

interface ModalCountryQuota {
    id: string;
    country: string;
    quota: number;
    quotaType: 'absolute' | 'percentage';
    isActive: boolean;
    enforcementMode?: 'immediate' | 'post_collection';
}

interface ModalGenderQuota {
    id: string;
    gender: string;
    quota: number;
    quotaType: 'absolute' | 'percentage';
    isActive: boolean;
    enforcementMode?: 'immediate' | 'post_collection';
}

interface ModalGenericOption {
    id: string;
    name: string;
    isQualified?: boolean;
    isDisqualifying?: boolean;
}

// Utility to generate unique IDs
const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

/**
 * Transform Age modal output to backend format
 */
export function mapAgeConfigToBackend(
    validAges: string[],
    disqualifyingAges: string[],
    quotas?: ModalAgeQuota[],
    /** All enabled options in the order defined by the researcher */
    orderedAll?: string[]
): BackendDemographicConfig {
    // Convert disqualifying ages to disqualifications
    const disqualifications: BackendDisqualification[] = disqualifyingAges.map(age => ({
        id: generateId(),
        value: age,
        enabled: true
    }));

    // Convert quotas to backend format
    const backendQuotas: BackendQuotaConfig[] = (quotas || [])
        .filter(q => q.isActive)
        .map(q => ({
            id: q.id,
            value: q.ageRange,
            limit: q.quotaType === 'percentage' ? q.quota : q.quota, // Backend handles both as limits
            enabled: true,
            enforcementMode: q.enforcementMode || 'immediate'
        }));

    // Extract min/max from age ranges if possible
    let min: number | undefined;
    let max: number | undefined;

    if (validAges.length > 0) {
        const allAges = [...validAges];
        for (const range of allAges) {
            if (range.includes('-')) {
                const [rangeMin, rangeMax] = range.split('-').map(v => parseInt(v.trim()));
                if (!isNaN(rangeMin) && (min === undefined || rangeMin < min)) min = rangeMin;
                if (!isNaN(rangeMax) && (max === undefined || rangeMax > max)) max = rangeMax;
            } else if (range.includes('+')) {
                const minVal = parseInt(range.replace('+', ''));
                if (!isNaN(minVal) && (min === undefined || minVal < min)) min = minVal;
                max = 120; // Default max for 65+ type ranges
            }
        }
    }

    // validValues includes ALL enabled options (qualifying + disqualifying)
    // so participants see the full range. Backend checkDisqualifications()
    // blocks those who pick a disqualifying option.
    // Use orderedAll (researcher's order) when available, fallback to concatenation.
    const allValues = orderedAll ?? [...validAges, ...disqualifyingAges];

    return {
        enabled: true,
        quotas: backendQuotas.length > 0 ? backendQuotas : undefined,
        disqualifications: disqualifications.length > 0 ? disqualifications : undefined,
        min,
        max,
        validValues: allValues,
        // Preserve modal fields for round-trip
        validAges,
        disqualifyingAges,
    };
}

/**
 * Transform Country modal output to backend format
 */
export function mapCountryConfigToBackend(
    validCountries: string[],
    disqualifyingCountries: string[],
    priorityCountries: string[],
    quotas?: ModalCountryQuota[],
    granularity?: LocationGranularity
): BackendDemographicConfig {
    // Convert disqualifying countries to disqualifications
    const disqualifications: BackendDisqualification[] = disqualifyingCountries.map(country => ({
        id: generateId(),
        value: country,
        enabled: true
    }));

    // Convert quotas to backend format
    const backendQuotas: BackendQuotaConfig[] = (quotas || [])
        .filter(q => q.isActive)
        .map(q => ({
            id: q.id,
            value: q.country,
            limit: q.quota,
            enabled: true,
            enforcementMode: q.enforcementMode || 'immediate'
        }));

    // validValues includes ALL enabled countries (qualifying + disqualifying)
    // so participants see the full list. Backend checkDisqualifications() blocks disqualified.
    const allValues = [...validCountries, ...disqualifyingCountries];

    return {
        enabled: true,
        quotas: backendQuotas.length > 0 ? backendQuotas : undefined,
        disqualifications: disqualifications.length > 0 ? disqualifications : undefined,
        granularity: granularity || 'countryOnly',
        validValues: allValues,
        priorityValues: priorityCountries,
        // Preserve modal fields for round-trip
        validCountries,
        disqualifyingCountries,
        priorityCountries,
    };
}

/**
 * Transform Gender modal output to backend format
 */
export function mapGenderConfigToBackend(
    options: ModalGenericOption[],
    disqualified: string[],
    quotas?: ModalGenderQuota[]
): BackendDemographicConfig {
    // Convert disqualified genders to disqualifications
    const disqualifications: BackendDisqualification[] = disqualified.map(id => {
        const option = options.find(o => o.id === id);
        return {
            id: generateId(),
            value: option?.name || id,
            enabled: true
        };
    });

    // Convert quotas to backend format
    const backendQuotas: BackendQuotaConfig[] = (quotas || [])
        .filter(q => q.isActive)
        .map(q => ({
            id: q.id,
            value: q.gender,
            limit: q.quota,
            enabled: true,
            enforcementMode: q.enforcementMode || 'immediate'
        }));

    // validValues includes ALL options so participants see the full list.
    // Backend checkDisqualifications() blocks those who pick a disqualifying option.
    const validValues = options.map(o => o.name);

    return {
        enabled: true,
        quotas: backendQuotas.length > 0 ? backendQuotas : undefined,
        disqualifications: disqualifications.length > 0 ? disqualifications : undefined,
        validValues,
        // Preserve modal fields for round-trip
        options,
        disqualified,
    };
}

/**
 * Generic mapper for simple option-based demographics
 * (Education, Employment, Income, Hours Online, Technical Proficiency)
 */
export function mapGenericOptionsToBackend(
    options: ModalGenericOption[],
    disqualified: string[],
    quotas?: Array<{ id: string; value?: string; quota: number; quotaType: string; isActive: boolean; enforcementMode?: 'immediate' | 'post_collection' }>
): BackendDemographicConfig {
    // Convert disqualified options to disqualifications
    const disqualifications: BackendDisqualification[] = disqualified.map(id => {
        const option = options.find(o => o.id === id);
        return {
            id: generateId(),
            value: option?.name || id,
            enabled: true
        };
    });

    // Convert quotas to backend format
    const backendQuotas: BackendQuotaConfig[] = (quotas || [])
        .filter(q => q.isActive)
        .map(q => ({
            id: q.id,
            value: q.value || '',
            limit: q.quota,
            enabled: true,
            enforcementMode: (q.enforcementMode || 'immediate') as 'immediate' | 'post_collection'
        }));

    // validValues includes ALL options so participants see the full list.
    // Backend checkDisqualifications() blocks those who pick a disqualifying option.
    const validValues = options.map(o => o.name);

    return {
        enabled: true,
        quotas: backendQuotas.length > 0 ? backendQuotas : undefined,
        disqualifications: disqualifications.length > 0 ? disqualifications : undefined,
        validValues,
        // Preserve modal fields for round-trip
        options,
        disqualified,
    };
}

/**
 * Main mapper function that routes to specific mappers based on demographic type
 */
export function mapModalConfigToBackend(
    demographicType: string,
    modalData: Record<string, unknown>
): BackendDemographicConfig {
    switch (demographicType) {
        case 'age':
            return mapAgeConfigToBackend(
                (modalData.validAges as string[]) || [],
                (modalData.disqualifyingAges as string[]) || [],
                modalData.quotas as ModalAgeQuota[] | undefined,
                modalData.orderedAll as string[] | undefined
            );

        case 'country':
            return mapCountryConfigToBackend(
                (modalData.validCountries as string[]) || [],
                (modalData.disqualifyingCountries as string[]) || [],
                (modalData.priorityCountries as string[]) || [],
                modalData.quotas as ModalCountryQuota[] | undefined,
                modalData.granularity as LocationGranularity | undefined
            );

        case 'gender':
            return mapGenderConfigToBackend(
                (modalData.options as ModalGenericOption[]) || [],
                (modalData.disqualified as string[]) || [],
                modalData.quotas as ModalGenderQuota[] | undefined
            );

        case 'educationLevel':
        case 'employmentStatus':
        case 'annualIncome':
        case 'dailyHoursOnline':
        case 'technicalProficiency':
            return mapGenericOptionsToBackend(
                (modalData.options as ModalGenericOption[]) || [],
                (modalData.disqualified as string[]) || [],
                modalData.quotas as Array<{ id: string; value?: string; quota: number; quotaType: string; isActive: boolean }> | undefined
            );

        default:
            // Fallback: return as-is with enabled flag
            return {
                enabled: true,
                ...modalData
            } as BackendDemographicConfig;
    }
}
