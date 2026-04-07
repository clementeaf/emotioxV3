import { useCallback } from 'react';
import { useParticipantStore } from '../stores/useParticipantStore';
import { useSessionStore } from '../stores/useSessionStore';
import { useValidation } from './useValidation';
import type { Module } from '../services/public.service';

// Fallback order when no dynamic order is provided
const DEFAULT_STEPS_ORDER = [
    'welcome',
    'demographics',
    // Screener
    'screener',
    // SmartVOC
    'csat', 'nps', 'ces', 'cv', 'nev', 'voc',
    // Implicit Association (individual module types)
    'attribute-testing', 'comparing-attribute', 'objects-comparing',
    // Cognitive Tasks
    'short-text', 'long-text', 'single-choice', 'multiple-choice',
    'linear-scale', 'ranking', 'navigation-flow', 'preference-test',
    // Eye Tracking
    'eye-tracking',
    'thank-you'
];

/**
 * Checks whether a module's conditionality condition is met based on demographic
 * and/or module responses.
 * @param module - Module to check
 * @param demographicResponses - Map of demographicKey -> selected value
 * @param moduleResponses - Map of responseId (`moduleId_componentId`) -> response value
 * @returns true if module should be shown
 */
const isModuleConditionMet = (
    module: Module,
    demographicResponses: Record<string, string>,
    moduleResponses: Map<string, { value: string | number | boolean | string[] | number[] | null }>
): boolean => {
    const cfg = module.config;
    if (!cfg || typeof cfg !== 'object') return true;
    const rec = cfg as Record<string, unknown>;
    if (!rec.conditionality || !rec.conditionalityConfig) return true;

    const cc = rec.conditionalityConfig as Record<string, unknown>;
    if (!cc) return true;

    // Module condition
    if ('sourceModuleId' in cc) {
        const sourceModuleId = cc.sourceModuleId as string;
        const sourceComponentId = cc.sourceComponentId as string;
        const selectedValues = cc.selectedValues as string[];
        if (!sourceModuleId || !sourceComponentId || !selectedValues?.length) return true;

        const responseKey = `${sourceModuleId}_${sourceComponentId}`;
        const response = moduleResponses.get(responseKey);

        // If source module hasn't been answered yet, show the module
        // (will be re-evaluated after participant answers)
        if (!response) return true;

        const responseValue = response.value;

        if (Array.isArray(responseValue)) {
            // Multiple choice: any match
            return selectedValues.some(v => (responseValue as string[]).includes(v));
        }
        if (typeof responseValue === 'string') {
            // Single choice: direct match
            return selectedValues.includes(responseValue);
        }

        return true;
    }

    // Demographic condition (existing)
    const demographicKey = cc.demographicKey as string | undefined;
    const demographicValue = cc.demographicValue as string | undefined;
    if (!demographicKey || !demographicValue) return true;

    // If demographics haven't been answered yet, show the module (will be re-evaluated after demographics)
    if (Object.keys(demographicResponses).length === 0) return true;

    const answer = demographicResponses[demographicKey];
    return answer === demographicValue;
};

/**
 * Navigation hook for participant flow.
 * @param modulesByStep - Map of stepId -> module loaded from backend
 * @param demographicResponses - Map of demographicKey -> participant's selected value
 * @param moduleResponses - Map of responseId -> response (for module-based conditions)
 * @param dynamicStepsOrder - Optional ordered array of stepIds (respects backend order_index)
 */
export const useNavigation = (
    modulesByStep: Record<string, Module>,
    demographicResponses: Record<string, string> = {},
    moduleResponses: Map<string, { value: string | number | boolean | string[] | number[] | null }> = new Map(),
    dynamicStepsOrder?: string[]
) => {
    const { currentStep, setCurrentStep } = useParticipantStore();
    const { updateMetrics, trackInteraction } = useSessionStore();
    const { validateStep } = useValidation();

    const stepsOrder = dynamicStepsOrder && dynamicStepsOrder.length > 0 ? dynamicStepsOrder : DEFAULT_STEPS_ORDER;

    const enabledSteps = stepsOrder.filter((stepId) => {
        const mod = modulesByStep[stepId];
        if (!mod) return false;
        return isModuleConditionMet(mod, demographicResponses, moduleResponses);
    });
    const steps = enabledSteps.length > 0 ? enabledSteps : stepsOrder;

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
