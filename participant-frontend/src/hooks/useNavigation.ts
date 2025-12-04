import { useParticipantStore } from '../stores/useParticipantStore';
import { MOCK_MODULES } from '../data/mockModules';

// Define the order of steps for the mock flow
// In a real application, this would come from the backend configuration
const STEPS_ORDER = [
    'welcome',
    'csat',
    'nps',
    'short-text',
    'single-choice',
    'navigation-flow',
    'thank-you'
];

export const useNavigation = () => {
    const { currentStep, setCurrentStep } = useParticipantStore();

    const currentIndex = STEPS_ORDER.indexOf(currentStep);
    const totalSteps = STEPS_ORDER.length;

    const isFirstStep = currentIndex === 0;
    const isLastStep = currentIndex === totalSteps - 1;

    const goNext = () => {
        if (!isLastStep) {
            const nextStep = STEPS_ORDER[currentIndex + 1];
            // Verify the step exists in configuration
            if (MOCK_MODULES[nextStep]) {
                setCurrentStep(nextStep);
            } else {
                console.warn(`Step ${nextStep} not found in configuration`);
            }
        }
    };

    const goBack = () => {
        if (!isFirstStep) {
            const prevStep = STEPS_ORDER[currentIndex - 1];
            if (MOCK_MODULES[prevStep]) {
                setCurrentStep(prevStep);
            }
        }
    };

    const goToStep = (stepId: string) => {
        if (STEPS_ORDER.includes(stepId) && MOCK_MODULES[stepId]) {
            setCurrentStep(stepId);
        }
    };

    return {
        currentStep,
        isFirstStep,
        isLastStep,
        progress: ((currentIndex + 1) / totalSteps) * 100,
        goNext,
        goBack,
        goToStep,
        steps: STEPS_ORDER
    };
};
