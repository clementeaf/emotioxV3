import React, { useState, useMemo } from 'react';
import type { ModuleConfig } from '../../types/module';
import { Button } from '../ui/Button';
import { CHILE_REGIONS } from '../../data/chile-geography';
import { useSessionStore } from '../../stores/useSessionStore';
import { useParticipantStore } from '../../stores/useParticipantStore';
import { publicService } from '../../services/public.service';

interface DemographicsStepProps {
    module: ModuleConfig;
    onComplete: () => void;
}

export const DemographicsStep: React.FC<DemographicsStepProps> = ({ module, onComplete }) => {
    // Config comes from the synthetic module injected in ResearchPage
    const config = (module.config?.demographics || {}) as Record<string, unknown>;
    const { config: sessionConfig } = useSessionStore();
    const { updateResponse } = useParticipantStore();



    const isEnabled = (key: string) => {
        const val = config[key];
        return val === true || (typeof val === 'object' && val !== null && (val as Record<string, unknown>).enabled === true);
    };

    // State
    const [answers, setAnswers] = useState<Record<string, string>>({});
    const [submitting, setSubmitting] = useState(false);

    // Handlers
    const handleChange = (key: string, value: string) => {
        setAnswers(prev => {
            const next = { ...prev, [key]: value };
            // Reset cascading fields if country changes
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

    const isValid = () => {
        if (isEnabled('age') && !answers.age) return false;
        if (isEnabled('country') && !answers.country) return false;

        if (answers.country === 'Chile') {
            if (!answers.region) return false;
            // Only require commune if region is selected (cascading)
            if (answers.region && !answers.commune) return false;
        }

        // Check other generic fields
        const generics = ['gender', 'educationLevel', 'annualIncome', 'employmentStatus', 'dailyHoursOnline', 'technicalProficiency'];
        for (const key of generics) {
            if (isEnabled(key) && !answers[key]) return false;
        }
        return true;
    };

    const handleSubmit = async () => {
        if (!isValid() || submitting) return;
        setSubmitting(true);

        try {
            // Extract research ID from URL or session config
            // URL format: /research/:id/...
            const match = window.location.pathname.match(/\/research\/([^/]+)/);
            const researchId = match?.[1] ?? sessionConfig?.id;

            if (!researchId) {
                console.error('Research ID not found');
                onComplete();
                return;
            }

            // Server-side validation (Quota & Disqualification)
            const result = await publicService.validateDemographics(researchId, answers);

            if (!result.valid) {
                const backlinks = sessionConfig?.backlinks || {};

                if (result.reason === 'QUOTA_FULL') {
                    console.warn('Quota full:', result.details);
                    if (backlinks.overquota) {
                        window.location.href = backlinks.overquota;
                    } else {
                        alert('Esta encuesta ha alcanzado el límite de participantes para su perfil.');
                    }
                } else {
                    console.warn('Disqualified:', result.details);
                    if (backlinks.disqualified) {
                        window.location.href = backlinks.disqualified;
                    } else {
                        alert('Lo sentimos, no cumple con el perfil requerido para este estudio.');
                    }
                }
                return;
            }

            // Persist answers so handleNext picks them up via getResponsesByModule
            Object.entries(answers).forEach(([key, value]) => {
                updateResponse(module.id, key, value);
            });

            // If valid, proceed
            onComplete();
        } catch (error) {
            console.error('Validation check failed:', error);
            alert('Ocurrió un error al validar. Por favor intente nuevamente.');
        } finally {
            setSubmitting(false);
        }
    };

    // Render Helpers
    const renderSelect = (key: string, label: string, options: string[], value: string) => (
        <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">{label}</label>
            <select
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                value={value || ''}
                onChange={e => handleChange(key, e.target.value)}
            >
                <option value="">Select...</option>
                {options.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
        </div>
    );

    const availableCommunes = useMemo(() => {
        if (answers.country !== 'Chile' || !answers.region) return [];
        return CHILE_REGIONS.find(r => r.name === answers.region)?.communes.map(c => c.name) || [];
    }, [answers.country, answers.region]);

    return (
        <div className="flex flex-col items-center justify-center min-h-[400px] px-4 py-8">
            <div className="w-full max-w-lg space-y-8 bg-white p-8 rounded-lg shadow-sm border border-gray-100">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-gray-900">Information</h1>
                    <p className="mt-2 text-gray-600">Please answer the following questions to proceed.</p>
                </div>

                <div className="space-y-6">
                    {isEnabled('age') && (
                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">Age</label>
                            <input
                                type="number"
                                className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border"
                                placeholder="Enter your age"
                                value={answers.age || ''}
                                onChange={e => handleChange('age', e.target.value)}
                            />
                        </div>
                    )}

                    {isEnabled('country') && (
                        <>
                            {renderSelect('country', 'Country', ['Chile', 'Other'], answers.country)}

                            {answers.country === 'Chile' && (
                                <>
                                    {renderSelect('region', 'Region', CHILE_REGIONS.map(r => r.name), answers.region)}
                                    {answers.region && renderSelect('commune', 'Commune', availableCommunes, answers.commune)}
                                </>
                            )}
                        </>
                    )}

                    {/* Generic Fields */}
                    {['gender', 'educationLevel', 'annualIncome', 'employmentStatus', 'technicalProficiency', 'dailyHoursOnline'].map(key =>
                        isEnabled(key) && (
                            <div key={key} className="space-y-2">
                                <label className="block text-sm font-medium text-gray-700 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</label>
                                <select
                                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                                    value={answers[key] || ''}
                                    onChange={e => handleChange(key, e.target.value)}
                                >
                                    <option value="">Select...</option>
                                    <option value="Male">Male</option>
                                    <option value="Female">Female</option>
                                    <option value="Non-binary">Non-binary</option>
                                    <option value="Prefer not to say">Prefer not to say</option>
                                    <option value="Other">Other</option>
                                    {/* Ideally these options come from config or constants */}
                                </select>
                            </div>
                        )
                    )}
                </div>

                <div className="pt-4">
                    <Button
                        onClick={handleSubmit}
                        disabled={!isValid() || submitting}
                        className="w-full"
                    >
                        {submitting ? 'Validating...' : 'Continue'}
                    </Button>
                </div>
            </div>
        </div>
    );
};
