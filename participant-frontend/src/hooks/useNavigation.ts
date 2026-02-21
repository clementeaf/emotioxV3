import { useCallback } from 'react';
import { useParticipantStore } from '../stores/useParticipantStore';
import { useSessionStore } from '../stores/useSessionStore';
import { useValidation } from './useValidation';
import type { Module } from '../services/public.service';

// Define the order of steps (hardcoded for now, will be dynamic later)
const STEPS_ORDER = [
    'welcome',
    'demographics',
    // SmartVOC
    'csat', 'nps', 'ces', 'cv', 'nev', 'voc',
    // Cognitive Tasks
    'short-text', 'long-text', 'single-choice', 'multiple-choice',
    'linear-scale', 'ranking', 'navigation-flow', 'preference-test',
    'thank-you'
];

/**
 * Checks whether a module's conditionality condition is met based on demographic responses.
 * @param module - Module to check
 * @param demographicResponses - Map of demographicKey -> selected value
 * @returns true if module should be shown
 */
const isModuleConditionMet = (
    module: Module,
    demographicResponses: Record<string, string>
): boolean => {
    const cfg = module.config;
    if (!cfg || typeof cfg !== 'object') return true;
    const rec = cfg as Record<string, unknown>;
    if (!rec.conditionality || !rec.conditionalityConfig) return true;

    const cc = rec.conditionalityConfig as { action?: string; demographicKey?: string; demographicValue?: string };
    if (!cc.demographicKey || !cc.demographicValue) return true;

    // If demographics haven't been answered yet, show the module (will be re-evaluated after demographics)
    if (Object.keys(demographicResponses).length === 0) return true;

    const answer = demographicResponses[cc.demographicKey];
    return answer === cc.demographicValue;
};

/**
 * Navigation hook for participant flow.
 * @param modulesByStep - Map of stepId -> module loaded from backend
 * @param demographicResponses - Map of demographicKey -> participant's selected value
 */
export const useNavigation = (
    modulesByStep: Record<string, Module>,
    demographicResponses: Record<string, string> = {}
) => {
    const { currentStep, setCurrentStep } = useParticipantStore();
    const { updateMetrics, trackInteraction } = useSessionStore();
    const { validateStep } = useValidation();

    const enabledSteps = STEPS_ORDER.filter((stepId) => {
        const mod = modulesByStep[stepId];
        if (!mod) return false;
        return isModuleConditionMet(mod, demographicResponses);
    });
    const steps = enabledSteps.length > 0 ? enabledSteps : STEPS_ORDER;

    const currentIndex = steps.indexOf(currentStep);
    const isFirstStep = currentIndex === 0;
    const isLastStep = currentIndex === steps.length - 1;
    const safeIndex = currentIndex >= 0 ? currentIndex : 0;
    const progress = Math.round(((safeIndex + 1) / steps.length) * 100);

    const goNext = useCallback((): { success: boolean; errors?: Array<{ message: string }> } => {
        const currentModule = modulesByStep[currentStep];

        // Validate current step if it's a module
        if (currentModule) {
            const { isValid, errors } = validateStep(currentModule);
            if (!isValid) {
                console.warn('Validation failed:', errors);
                return { success: false, errors };
            }
        }

        if (currentIndex >= 0 && currentIndex < steps.length - 1) {
            const nextStep = steps[currentIndex + 1];
            setCurrentStep(nextStep);

            // Track step change
            trackInteraction({
                type: 'step_change',
                target: nextStep,
                metadata: { from: currentStep, direction: 'next' },
            });

            // Update metrics
            updateMetrics({ stepChanges: currentIndex + 1 });

            return { success: true };
        }
        return { success: true };
    }, [currentIndex, currentStep, modulesByStep, setCurrentStep, steps, validateStep, trackInteraction, updateMetrics]);

    const goBack = useCallback(() => {
        if (currentIndex > 0) {
            const prevStep = steps[currentIndex - 1];
            setCurrentStep(prevStep);

            // Track step change
            trackInteraction({
                type: 'step_change',
                target: prevStep,
                metadata: { from: currentStep, direction: 'back' },
            });
        }
    }, [currentIndex, currentStep, setCurrentStep, steps, trackInteraction]);

    const goToStep = useCallback((stepId: string) => {
        if (steps.includes(stepId)) {
            setCurrentStep(stepId);

            // Track step change
            trackInteraction({
                type: 'step_change',
                target: stepId,
                metadata: { from: currentStep, direction: 'direct' },
            });
        }
    }, [currentStep, setCurrentStep, steps, trackInteraction]);

    return {
        currentStep,
        isFirstStep,
        isLastStep,
        progress,
        goNext,
        goBack,
        goToStep
    };
};
