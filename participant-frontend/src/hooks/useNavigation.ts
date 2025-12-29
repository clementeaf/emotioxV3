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
 * Navigation hook for participant flow.
 * @param modulesByStep - Map of stepId -> module loaded from backend
 */
export const useNavigation = (modulesByStep: Record<string, Module>) => {
    const { currentStep, setCurrentStep } = useParticipantStore();
    const { updateMetrics, trackInteraction } = useSessionStore();
    const { validateStep } = useValidation();

    const enabledSteps = STEPS_ORDER.filter((stepId) => Boolean(modulesByStep[stepId]));
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
