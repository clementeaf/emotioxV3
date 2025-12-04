import { create } from 'zustand';

interface StepNavigationState {
    currentStep: string;
    setCurrentStep: (step: string) => void;
}

export const useStepNavigation = create<StepNavigationState>((set) => ({
    currentStep: 'welcome',
    setCurrentStep: (step) => set({ currentStep: step }),
}));
