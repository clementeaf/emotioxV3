export interface BackendQuota {
    id: string;
    value: string;
    limit: number;
    enabled: boolean;
    enforcementMode?: string;
    quotaType?: string;
}

/** Modal-format quota entry — dynamic field key set by DEMOGRAPHIC_QUOTA_FIELD mapping */
export interface ModalQuota {
    id: string;
    quota: number;
    quotaType: 'percentage';
    isActive: boolean;
    enforcementMode: 'immediate';
    [fieldName: string]: string | number | boolean;
}

/** Modal-format option entry used by demographic config drawers */
export interface ModalOption {
    id: string;
    name: string;
    [extra: string]: unknown;
}

/** Full demographic config object (when not just a boolean toggle) */
export interface DemographicConfigObject {
    enabled: boolean;
    validValues?: string[];
    validAges?: string[];
    options?: ModalOption[];
    disqualified?: string[];
    disqualifications?: BackendQuota[];
    quotas?: BackendQuota[];
    questionLabel?: string;
    cities?: Array<{ name: string; isDisqualifying?: boolean; country?: string }>;
    disqualifyingAges?: string[];
    [extra: string]: unknown;
}

/** Demographic config value — can be a simple boolean or a full config object */
export type DemographicConfigValue = boolean | DemographicConfigObject;

/** Full demographics config map */
export type DemographicsConfig = Record<string, DemographicConfigValue>;

/** Narrow a demographic config value to its object form (returns {} for booleans) */
export const asDemoConfig = (val: DemographicConfigValue | undefined): DemographicConfigObject =>
    (typeof val === 'object' && val !== null) ? val : { enabled: !!val };

/** Maps demographic key → quota field name used in modal-format quotas */
export const DEMOGRAPHIC_QUOTA_FIELD: Record<string, string> = {
    age: 'ageRange',
    country: 'country',
    city: 'city',
    gender: 'gender',
    educationLevel: 'educationLevel',
    employmentStatus: 'employmentStatus',
    annualIncome: 'incomeLevel',
    dailyHoursOnline: 'hoursRange',
    technicalProficiency: 'proficiencyLevel',
};

/**
 * Default validValues for option-based demographics when first enabled.
 * Ensures participants always see a selector instead of a free-text input.
 */
export const DEFAULT_VALID_VALUES_BY_DEMOGRAPHIC: Record<string, string[]> = {
    gender: ['Masculino', 'Femenino', 'Prefiero no especificar'],
    educationLevel: ['Básica', 'Media', 'Universitaria', 'Maestría', 'Doctorado'],
    employmentStatus: ['Dependiente', 'Independiente', 'Cesante', 'Jubilado'],
    annualIncome: ['Menos de 20.000€', '20.000€ - 40.000€', '40.000€ - 60.000€', '60.000€ - 80.000€', 'Más de 80.000€'],
    dailyHoursOnline: ['0-2 horas', '2-4 horas', '4-6 horas', '6-8 horas', 'Más de 8 horas'],
    technicalProficiency: ['Básico', 'Intermedio', 'Profesional', 'Experto'],
};

export const DEMOGRAPHIC_KEYS = ['age', 'country', 'gender', 'educationLevel', 'annualIncome', 'employmentStatus', 'dailyHoursOnline', 'technicalProficiency'];

export type ParticipationMode = 'kiosk' | 'panel';

export interface ResearchConfigurationProps {
    config: Record<string, unknown>;
    researchStatus?: string;
    researchName?: string;
    onChange: (config: Record<string, unknown>) => void;
}

export const mapBackendQuotasToModal = (quotas: BackendQuota[] | undefined, fieldName: string): ModalQuota[] => {
    if (!quotas || !Array.isArray(quotas)) return [];
    return quotas.map((q: BackendQuota) => ({
        id: q.id,
        [fieldName]: q.value,
        quota: q.limit,
        quotaType: 'percentage' as const,
        isActive: q.enabled,
        enforcementMode: 'immediate' as const
    }));
};

/** Reconstruct modal options from backend format when modal-format fields are missing */
export const getModalOptions = (demographics: DemographicsConfig, key: string): ModalOption[] => {
    const cfg = demographics[key];
    if (!cfg || typeof cfg !== 'object') return [];
    if (cfg.options && Array.isArray(cfg.options) && cfg.options.length > 0) return cfg.options;
    // Reconstruct from validValues
    if (cfg.validValues && Array.isArray(cfg.validValues)) {
        return cfg.validValues.map((v: string, i: number) => ({ id: `opt-${i}`, name: v }));
    }
    return [];
};

/** Reconstruct disqualified IDs from backend format when modal-format field is missing */
export const getModalDisqualified = (demographics: DemographicsConfig, key: string): string[] => {
    const cfg = demographics[key];
    if (!cfg || typeof cfg !== 'object') return [];
    if (cfg.disqualified && Array.isArray(cfg.disqualified)) return cfg.disqualified;
    // Reconstruct from disqualifications array
    if (cfg.disqualifications && Array.isArray(cfg.disqualifications)) {
        const opts = getModalOptions(demographics, key);
        return cfg.disqualifications.map((d: BackendQuota) => {
            const match = opts.find((o: { name: string; id: string }) => o.name === d.value);
            return match?.id || d.value;
        });
    }
    return [];
};

export const isQuotasEnabledCheck = (demographics: DemographicsConfig, quotasEnabledState: Record<string, boolean>, key: string): boolean => {
    return quotasEnabledState[key] ?? ((asDemoConfig(demographics[key]).quotas?.length ?? 0) > 0);
};

export interface BacklinkInputProps {
    label: string;
    value: string;
    onChange: (value: string) => void;
    error?: string;
}
