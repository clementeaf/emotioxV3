import { useCallback } from 'react';
import { useParticipantStore } from '../stores/useParticipantStore';
import { useSessionStore } from '../stores/useSessionStore';
import { MOCK_MODULES } from '../data/mockModules';
import { useValidation } from './useValidation';

// Define the order of steps (hardcoded for now, will be dynamic later)
const STEPS_ORDER = [
    'welcome',
    // SmartVOC
    'csat', 'nps', 'ces', 'cv', 'nev', 'voc',
    // Cognitive Tasks
    'short-text', 'long-text', 'single-choice', 'multiple-choice',
    'linear-scale', 'ranking', 'navigation-flow', 'preference-test',
    'thank-you'
];

export const useNavigation = () => {
    const { currentStep, setCurrentStep } = useParticipantStore();
    const { updateMetrics, trackInteraction } = useSessionStore();
    const { validateStep } = useValidation();

    const currentIndex = STEPS_ORDER.indexOf(currentStep);
    const isFirstStep = currentIndex === 0;
    const isLastStep = currentIndex === STEPS_ORDER.length - 1;
    const progress = Math.round(((currentIndex + 1) / STEPS_ORDER.length) * 100);

    const goNext = useCallback((): { success: boolean; errors?: Array<{ message: string }> } => {
        const currentModule = MOCK_MODULES[currentStep];

        // Validate current step if it's a module
        if (currentModule) {
            const { isValid, errors } = validateStep(currentModule);
            if (!isValid) {
                console.warn('Validation failed:', errors);
                return { success: false, errors };
            }
        }

        if (currentIndex < STEPS_ORDER.length - 1) {
            const nextStep = STEPS_ORDER[currentIndex + 1];
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
    }, [currentIndex, currentStep, setCurrentStep, validateStep, trackInteraction, updateMetrics]);

    const goBack = useCallback(() => {
        if (currentIndex > 0) {
            const prevStep = STEPS_ORDER[currentIndex - 1];
            setCurrentStep(prevStep);
            
            // Track step change
            trackInteraction({
                type: 'step_change',
                target: prevStep,
                metadata: { from: currentStep, direction: 'back' },
            });
        }
    }, [currentIndex, currentStep, setCurrentStep, trackInteraction]);

    const goToStep = useCallback((stepId: string) => {
        if (STEPS_ORDER.includes(stepId)) {
            setCurrentStep(stepId);
            
            // Track step change
            trackInteraction({
                type: 'step_change',
                target: stepId,
                metadata: { from: currentStep, direction: 'direct' },
            });
        }
    }, [currentStep, setCurrentStep, trackInteraction]);

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
