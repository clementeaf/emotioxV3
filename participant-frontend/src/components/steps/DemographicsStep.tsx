import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import type { ModuleConfig } from '../../types/module';
import { useParticipantStore } from '../../stores/useParticipantStore';
import { CustomSelect, type SelectOption } from '../ui/CustomSelect';

interface DemographicsStepProps {
    module: ModuleConfig;
    onComplete: () => void;
}

type LocationGranularity = 'countryOnly' | 'countryCity';

/** Config shape from Research Configuration; backend may store validValues only (demographicsMapper output). */
interface DemographicConfig {
    enabled?: boolean;
    // Age: research UI uses validAges; backend mapper stores validValues
    validAges?: string[];
    disqualifyingAges?: string[];
    // Country: research UI uses validCountries; backend mapper stores validValues + priorityValues
    validCountries?: string[];
    priorityCountries?: string[];
    granularity?: LocationGranularity;
    disqualifyingCountries?: string[];
    // Generic: research UI uses options; backend mapper stores validValues (string[])
    options?: Array<{ value?: string; label?: string; name?: string } | string>;
    disqualified?: string[];
    // Backend/stored format (demographicsMapper): single list of allowed values
    validValues?: string[];
    /** Country + City: city chips from research UI (strings or { name, country? } since v0.40.2) */
    cities?: Array<string | { name: string; country?: string }>;
    /** Custom screening question label (only for customQuestion_* keys) */
    questionLabel?: string;
}

const DEMOGRAPHIC_ORDER = [
    'age', 'country', 'gender', 'educationLevel', 'annualIncome',
    'employmentStatus', 'dailyHoursOnline', 'technicalProficiency',
];

/**
 * Fallback options for option-based demographics when validValues is missing or empty.
 * Handles legacy researches stored as boolean `true` without validValues.
 * Must stay in sync with DEFAULT_VALID_VALUES_BY_DEMOGRAPHIC in research-frontend.
 */
const FALLBACK_OPTIONS: Record<string, string[]> = {
    gender: ['Masculino', 'Femenino', 'Prefiero no especificar'],
    educationLevel: ['Básica', 'Media', 'Universitaria', 'Maestría', 'Doctorado'],
    employmentStatus: ['Dependiente', 'Independiente', 'Cesante', 'Jubilado'],
    annualIncome: ['Menos de 20.000€', '20.000€ - 40.000€', '40.000€ - 60.000€', '60.000€ - 80.000€', 'Más de 80.000€'],
    dailyHoursOnline: ['0-2 horas', '2-4 horas', '4-6 horas', '6-8 horas', 'Más de 8 horas'],
    technicalProficiency: ['Básico', 'Intermedio', 'Profesional', 'Experto'],
};

/**
 * Normalizes a single option entry to a display string.
 * Handles backend format (validValues = string[]) and modal format (options = { value, label, name }[]).
 */
const optionToLabel = (o: string | Record<string, unknown>): string => {
    if (typeof o === 'string') return o;
    const obj = o as Record<string, unknown>;
    const label = obj.label ?? obj.value ?? obj.name;
    return typeof label === 'string' ? label : String(label ?? '');
};

/**
 * Convierte una entrada de ciudad (string o objeto desde research config) a opción de select.
 * El valor enviado al backend sigue siendo el nombre de ciudad (string), no el objeto.
 * @param entry - Ciudad como string o { name, country? }
 * @returns Opción con value/label string, o null si no es usable
 */
function cityEntryToSelectOption(entry: unknown): SelectOption | null {
    if (typeof entry === 'string') {
        const trimmed = entry.trim();
        if (!trimmed) return null;
        return { value: trimmed, label: trimmed };
    }
    if (entry !== null && typeof entry === 'object' && !Array.isArray(entry)) {
        const rec = entry as Record<string, unknown>;
        const rawName = rec.name;
        const name = typeof rawName === 'string' ? rawName.trim() : '';
        if (!name) return null;
        const rawCountry = rec.country;
        const country = typeof rawCountry === 'string' ? rawCountry.trim() : '';
        return {
            value: name,
            label: country.length > 0 ? `${name} — ${country}` : name,
        };
    }
    return null;
}

/**
 * @param entries - Lista desde validValues o country.cities
 * @returns Opciones listas para CustomSelect
 */
function cityEntriesToSelectOptions(entries: unknown[]): SelectOption[] {
    const out: SelectOption[] = [];
    for (const entry of entries) {
        const opt = cityEntryToSelectOption(entry);
        if (opt) out.push(opt);
    }
    return out;
}

/**
 * Extracts the selectable options for a given demographic from its config.
 * Interprets both research-frontend modal shape (validAges, validCountries, options)
 * and backend/stored shape (validValues only, from demographicsMapper).
 * Falls back to FALLBACK_OPTIONS for option-based demographics when no values are configured
 * (legacy researches stored as boolean `true`).
 */
const getOptionsForDemographic = (key: string, cfg: DemographicConfig): string[] => {
    // Show ALL options (qualifying + disqualifying) so the participant sees the
    // full list. Backend checkDisqualifications() blocks disqualifying selections.
    if (key === 'age') {
        if (cfg.validValues && cfg.validValues.length > 0) return cfg.validValues;
        return [...(cfg.validAges ?? []), ...(cfg.disqualifyingAges ?? [])];
    }
    if (key === 'country') {
        if (cfg.validValues && cfg.validValues.length > 0) return cfg.validValues;
        return [...(cfg.validCountries ?? []), ...(cfg.disqualifyingCountries ?? [])];
    }
    if (cfg.options && Array.isArray(cfg.options) && cfg.options.length > 0) {
        return cfg.options.map(o => optionToLabel(o as string | Record<string, unknown>));
    }
    const values = cfg.validValues ?? [];
    if (values.length > 0) return values;
    // Fallback for legacy configs missing validValues
    return FALLBACK_OPTIONS[key] ?? [];
};

export const DemographicsStep: React.FC<DemographicsStepProps> = ({ module }) => {
    const { t } = useTranslation();
    const demographics = useMemo(
        () => (module.config?.demographics || {}) as Record<string, DemographicConfig | boolean>,
        [module.config?.demographics]
    );
    const { updateResponse, getResponsesByModule } = useParticipantStore();

    const getDemographicLabel = useCallback((key: string): string => {
        return t(`demographics.labels.${key}`, { defaultValue: key });
    }, [t]);

    // Initialize answers from store (supports review mode pre-loaded responses)
    const [answers, setAnswers] = useState<Record<string, string>>(() => {
        const stored: Record<string, string> = {};
        const responses = getResponsesByModule(module.id);
        for (const r of responses) {
            if (typeof r.value === 'string') {
                stored[r.componentId] = r.value;
            }
        }
        return stored;
    });
    const [validationError, setValidationError] = useState<string | null>(null);

    const isEnabled = useCallback((key: string) => {
        const val = demographics[key];
        if (val === true) return true;
        if (typeof val === 'object' && val !== null && !Array.isArray(val) && (val as DemographicConfig).enabled === true) return true;
        return false;
    }, [demographics]);

    /**
     * Returns normalized config for a demographic key.
     * Handles backend format (validValues), research UI format (validAges/validCountries/options),
     * and legacy array value (treated as validValues).
     */
    const getConfig = useCallback((key: string): DemographicConfig => {
        const val = demographics[key];
        if (val === true) return { enabled: true };
        if (typeof val !== 'object' || val === null) return {};
        if (Array.isArray(val)) return { enabled: true, validValues: val as unknown as string[] };
        return val as DemographicConfig;
    }, [demographics]);

    const enabledKeys = useMemo(
        () => DEMOGRAPHIC_ORDER.filter(k => isEnabled(k)),
        [isEnabled]
    );

    /** Custom screening question keys (customQuestion_*) that are enabled */
    const customQuestionKeys = useMemo(() => {
        return Object.keys(demographics).filter(k => {
            if (!k.startsWith('customQuestion_')) return false;
            const val = demographics[k];
            if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
                return (val as DemographicConfig).enabled === true;
            }
            return false;
        });
    }, [demographics]);

    // Persist answers to store on every change so "Guardar y continuar" picks them up
    useEffect(() => {
        Object.entries(answers).forEach(([key, value]) => {
            if (value) {
                updateResponse(module.id, key, value);
            }
        });
    }, [answers, module.id, updateResponse]);

    const showCity = useMemo((): boolean => {
        if (!isEnabled('country')) return false;
        const cfg = getConfig('country');
        return (cfg.granularity || 'countryOnly') === 'countryCity';
    }, [isEnabled, getConfig]);

    /** Configured city options — when present, show a select instead of text input */
    const citySelectOptions = useMemo((): SelectOption[] => {
        const raw: unknown[] = [];
        const cityDem = demographics.city;
        if (typeof cityDem === 'object' && cityDem !== null && !Array.isArray(cityDem)) {
            const cityCfg = cityDem as DemographicConfig;
            if (cityCfg.validValues && cityCfg.validValues.length > 0) {
                raw.push(...(cityCfg.validValues as unknown[]));
            }
        }
        if (raw.length === 0) {
            const countryCfg = getConfig('country') as DemographicConfig;
            const cities = countryCfg.cities;
            if (cities && cities.length > 0) raw.push(...cities);
        }
        return cityEntriesToSelectOptions(raw);
    }, [demographics.city, getConfig]);

    const handleChange = (key: string, value: string) => {
        setValidationError(null);
        setAnswers(prev => {
            const next = { ...prev, [key]: value };
            if (key === 'country') {
                delete next.city;
            }
            return next;
        });
        // Persist immediately to store (useEffect runs after render, too late if user clicks "Save" fast)
        if (value) {
            updateResponse(module.id, key, value);
        }
    };

    const renderSelect = (key: string, label: string, options: string[], value: string, placeholder?: string) => (
        <div key={key}>
            <CustomSelect
                id={key}
                label={label}
                options={options.map(o => ({ value: o, label: o }))}
                value={value || ''}
                onChange={v => handleChange(key, v)}
                placeholder={placeholder ?? t('common.select')}
            />
        </div>
    );

    const renderSelectWithOptions = (key: string, label: string, selectOptions: SelectOption[], value: string, placeholder?: string) => (
        <div key={key}>
            <CustomSelect
                id={key}
                label={label}
                options={selectOptions}
                value={value || ''}
                onChange={v => handleChange(key, v)}
                placeholder={placeholder ?? t('common.select')}
            />
        </div>
    );

    return (
        <div className="flex flex-col items-center justify-center min-h-[400px] px-4 py-8">
            <div className="w-full max-w-lg space-y-8">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-gray-900">{t('demographics.title')}</h1>
                    <p className="mt-2 text-gray-600">{t('demographics.subtitle')}</p>
                </div>

                <div className="space-y-6">
                    {enabledKeys.map(key => {
                        const cfg = getConfig(key);
                        const label = cfg.questionLabel || getDemographicLabel(key);
                        const options = getOptionsForDemographic(key, cfg);

                        // Country: optionally show city field based on granularity config
                        if (key === 'country') {
                            return (
                                <React.Fragment key={key}>
                                    {renderSelect('country', label, options.length > 0 ? options : ['Chile', 'Other'], answers.country)}
                                    {showCity && answers.country && citySelectOptions.length > 0 && (
                                        renderSelectWithOptions('city', t('demographics.city'), citySelectOptions, answers.city)
                                    )}
                                </React.Fragment>
                            );
                        }

                        // All demographics (including age) use select with configured options
                        if (options.length > 0) {
                            return renderSelect(key, label, options, answers[key]);
                        }

                        // Fallback: text input if no options configured
                        return (
                            <div key={key} className="space-y-2">
                                <label className="block text-sm font-medium text-gray-700">{label}</label>
                                <input
                                    type="text"
                                    className="focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border"
                                    placeholder={t('demographics.enterYour', { label: label.toLowerCase() })}
                                    value={answers[key] || ''}
                                    onChange={e => handleChange(key, e.target.value)}
                                />
                            </div>
                        );
                    })}

                    {/* Custom screening questions */}
                    {customQuestionKeys.map(key => {
                        const cfg = getConfig(key);
                        const label = cfg.questionLabel || key;
                        const options = getOptionsForDemographic(key, cfg);

                        if (options.length > 0) {
                            return renderSelect(key, label, options, answers[key]);
                        }
                        return null;
                    })}
                </div>

                {validationError && (
                    <div className="text-sm text-red-600 text-center bg-red-50 p-3 rounded-lg">
                        {validationError}
                    </div>
                )}
            </div>
        </div>
    );
};
