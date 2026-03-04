import React, { useState, useMemo, useEffect, useCallback } from 'react';
import type { ModuleConfig } from '../../types/module';
import { CHILE_REGIONS } from '../../data/chile-geography';
import { useParticipantStore } from '../../stores/useParticipantStore';

interface DemographicsStepProps {
    module: ModuleConfig;
    onComplete: () => void;
}

type LocationGranularity = 'countryOnly' | 'countryRegion' | 'countryRegionCommune';

interface DemographicConfig {
    enabled?: boolean;
    // Age
    validAges?: string[];
    disqualifyingAges?: string[];
    // Country
    validCountries?: string[];
    disqualifyingCountries?: string[];
    priorityCountries?: string[];
    granularity?: LocationGranularity;
    // Generic (gender, educationLevel, etc.)
    options?: Array<{ value: string; label: string }>;
    disqualified?: string[];
    // Legacy
    validValues?: string[];
}

const DEMOGRAPHIC_LABELS: Record<string, string> = {
    age: 'Age',
    country: 'Country',
    gender: 'Gender',
    educationLevel: 'Education Level',
    annualIncome: 'Annual Income',
    employmentStatus: 'Employment Status',
    dailyHoursOnline: 'Daily Hours Online',
    technicalProficiency: 'Technical Proficiency',
};

const DEMOGRAPHIC_ORDER = [
    'age', 'gender', 'country', 'educationLevel', 'annualIncome',
    'employmentStatus', 'dailyHoursOnline', 'technicalProficiency',
];

/**
 * Extracts the selectable options for a given demographic from its config.
 */
const getOptionsForDemographic = (key: string, cfg: DemographicConfig): string[] => {
    if (key === 'age') {
        return cfg.validAges || cfg.validValues || [];
    }
    if (key === 'country') {
        return cfg.validCountries || cfg.validValues || [];
    }
    // Generic demographics store options as { value, label }[]
    if (cfg.options && Array.isArray(cfg.options)) {
        return cfg.options.map(o =>
            typeof o === 'string' ? o : (o.label || o.value || String(o))
        );
    }
    return cfg.validValues || [];
};

export const DemographicsStep: React.FC<DemographicsStepProps> = ({ module }) => {
    const demographics = (module.config?.demographics || {}) as Record<string, DemographicConfig | boolean>;
    const { updateResponse } = useParticipantStore();

    const [answers, setAnswers] = useState<Record<string, string>>({});
    const [validationError, setValidationError] = useState<string | null>(null);

    const isEnabled = useCallback((key: string) => {
        const val = demographics[key];
        if (val === true) return true;
        if (typeof val === 'object' && val !== null && val.enabled === true) return true;
        return false;
    }, [demographics]);

    const getConfig = useCallback((key: string): DemographicConfig => {
        const val = demographics[key];
        if (typeof val === 'object' && val !== null) return val as DemographicConfig;
        return {};
    }, [demographics]);

    const enabledKeys = useMemo(
        () => DEMOGRAPHIC_ORDER.filter(k => isEnabled(k)),
        [isEnabled]
    );

    // Persist answers to store on every change so "Guardar y continuar" picks them up
    useEffect(() => {
        Object.entries(answers).forEach(([key, value]) => {
            if (value) {
                updateResponse(module.id, key, value);
            }
        });
    }, [answers, module.id, updateResponse]);

    const handleChange = (key: string, value: string) => {
        setValidationError(null);
        setAnswers(prev => {
            const next = { ...prev, [key]: value };
            if (key === 'country' && value !== 'Chile') {
                delete next.region;
                delete next.commune;
            }
            if (key === 'region') {
                delete next.commune;
            }
            return next;
        });
    };

    const availableCommunes = useMemo(() => {
        if (answers.country !== 'Chile' || !answers.region) return [];
        return CHILE_REGIONS.find(r => r.name === answers.region)?.communes.map(c => c.name) || [];
    }, [answers.country, answers.region]);

    const renderSelect = (key: string, label: string, options: string[], value: string, placeholder = 'Select...') => (
        <div key={key} className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">{label}</label>
            <select
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md border"
                value={value || ''}
                onChange={e => handleChange(key, e.target.value)}
            >
                <option value="">{placeholder}</option>
                {options.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
        </div>
    );

    return (
        <div className="flex flex-col items-center justify-center min-h-[400px] px-4 py-8">
            <div className="w-full max-w-lg space-y-8">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-gray-900">Demographics</h1>
                    <p className="mt-2 text-gray-600">Please answer the following questions to proceed.</p>
                </div>

                <div className="space-y-6">
                    {enabledKeys.map(key => {
                        const cfg = getConfig(key);
                        const label = DEMOGRAPHIC_LABELS[key] || key;
                        const options = getOptionsForDemographic(key, cfg);

                        // Country: special cascading logic
                        if (key === 'country') {
                            return (
                                <React.Fragment key={key}>
                                    {renderSelect('country', label, options.length > 0 ? options : ['Chile', 'Other'], answers.country)}
                                    {answers.country === 'Chile' && (
                                        <>
                                            {renderSelect('region', 'Region', CHILE_REGIONS.map(r => r.name), answers.region)}
                                            {answers.region && renderSelect('commune', 'Commune', availableCommunes, answers.commune)}
                                        </>
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
                                    placeholder={`Enter your ${label.toLowerCase()}`}
                                    value={answers[key] || ''}
                                    onChange={e => handleChange(key, e.target.value)}
                                />
                            </div>
                        );
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
