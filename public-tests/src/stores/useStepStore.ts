import { create } from 'zustand';

export type StepState = 'active' | 'completed' | 'disabled' | 'available';

export interface StepStateInfo {
  state: StepState;
  hasResponse: boolean;
  canAccess: boolean;
  isCurrentStep: boolean;
}

export interface Step {
  questionKey: string;
  title: string;
}

export interface StepStore {
  // 🎯 UNA SOLA FUENTE DE VERDAD
  backendResponses: unknown[];
  steps: Step[];
  currentQuestionKey: string;

  // 🎯 MÉTODOS ESENCIALES
  setCurrentQuestionKey: (questionKey: string) => void;
  setSteps: (steps: Step[]) => void;
  updateBackendResponses: (responses: unknown[]) => void;
  resetStore: () => void;

  // 🎯 CÁLCULOS DINÁMICOS
  hasBackendResponse: (questionKey: string) => boolean;
  canAccessStep: (stepIndex: number) => boolean;
  getStepState: (stepIndex: number) => StepStateInfo;
  getInitialStep: () => string;

  // 🎯 ESTADOS CALCULADOS
  getTotalResponses: () => number;
  getLastCompletedStep: () => string | null;
  getNextStep: () => string;
  getCompletedSteps: () => string[];

  // 🎯 MÉTODOS DE COMPATIBILIDAD
  getSteps: () => Step[];
  goToNextStep: () => void;
}

// 🎯 NO MÁS LOCALSTORAGE - Solo memoria en runtime
export const useStepStore = create<StepStore>()(
  (set, get) => ({
      // 🎯 UNA SOLA FUENTE DE VERDAD
      backendResponses: [],
      steps: [],
      currentQuestionKey: '',

      // 🎯 MÉTODOS ESENCIALES
      setCurrentQuestionKey: (questionKey: string) => {
        set({ currentQuestionKey: questionKey });
      },

      setSteps: (newSteps: Step[]) => {
        set({ steps: newSteps });

        // 🎯 Inicializar step activo si no hay uno
        const state = get();
        if (!state.currentQuestionKey && newSteps.length > 0) {
          const initialStep = state.getInitialStep();
          set({ currentQuestionKey: initialStep });
        }
      },

      updateBackendResponses: (responses: unknown[]) => {
        const validResponses = responses.filter((response): response is { questionKey: string } =>
          response !== null && typeof response === 'object' && 'questionKey' in response
        );
        // 🎯 ENCONTRAR STEP ACTIVO basado en respuestas
        const state = get();
        const stepOrder = state.steps.map(s => s.questionKey);
        const currentKey = state.currentQuestionKey;
        let stepToActivate = '';

        // Si hay respuestas guardadas, ir a la última pregunta respondida
        if (validResponses.length > 0) {
          // Encontrar el último step completado
          const completedKeys = validResponses.map((r: { questionKey: string }) => r.questionKey);
          let lastCompletedIndex = -1;

          // Buscar el último step completado en el orden de steps
          for (let i = stepOrder.length - 1; i >= 0; i--) {
            if (completedKeys.includes(stepOrder[i])) {
              lastCompletedIndex = i;
              break;
            }
          }

          // Ir directamente a la última pregunta respondida
          if (lastCompletedIndex >= 0) {
            stepToActivate = stepOrder[lastCompletedIndex];
          } else {
            // Si no se encontró ningún step completado (no debería pasar), ir al primero
            stepToActivate = stepOrder[0] || '';
          }
        } else {
          // Si no hay respuestas, ir al primer step
          stepToActivate = stepOrder[0] || '';
        }

        // 🎯 SOLO ACTUALIZAR currentQuestionKey si:
        // 1. No hay un currentQuestionKey establecido, O
        // 2. El currentQuestionKey actual no es válido (no está en los steps), O
        // 3. El currentQuestionKey actual es la última pregunta respondida (para mantener consistencia al recargar)
        // 4. El currentQuestionKey está ANTES de la última pregunta respondida (para corregir al recargar)
        // 5. PERO NO si el usuario ya navegó a un step DESPUÉS de la última pregunta respondida (para no cancelar la navegación)
        const currentKeyIndex = stepOrder.findIndex(step => step === currentKey);
        const stepToActivateIndex = stepOrder.findIndex(step => step === stepToActivate);
        
        // Solo actualizar si:
        // - No hay currentKey establecido
        // - El currentKey no es válido (no está en los steps)
        // - El currentKey es igual al stepToActivate (estamos en la última pregunta respondida)
        // - El currentKey está ANTES del stepToActivate (para corregir posición al recargar)
        // NO actualizar si el usuario ya navegó adelante (currentKeyIndex > stepToActivateIndex)
        const shouldUpdateCurrentStep = 
          !currentKey || 
          currentKeyIndex === -1 || 
          (currentKey === stepToActivate) ||
          (currentKeyIndex >= 0 && stepToActivateIndex >= 0 && currentKeyIndex < stepToActivateIndex);

        set({
          backendResponses: validResponses,
          ...(shouldUpdateCurrentStep && { currentQuestionKey: stepToActivate })
        });
      },

      resetStore: () => {
        const state = get();
        const firstStepKey = state.steps[0]?.questionKey || '';
        set({
          backendResponses: [],
          currentQuestionKey: firstStepKey
        });
      },

      // 🎯 SOLO BACKEND - NO MÁS LOCALSTORAGE
      hasBackendResponse: (questionKey: string): boolean => {
        const state = get();
        return state.backendResponses.some((response: unknown) =>
          (response as { questionKey?: string }).questionKey === questionKey
        );
      },

      canAccessStep: (stepIndex: number): boolean => {
        const state = get();
        if (stepIndex === 0) return true;

        if (stepIndex >= state.steps.length) return false;

        const step = state.steps[stepIndex];
        if (!step) return false;

        // 🎯 PERMITIR ACCESO A TODOS LOS STEPS COMPLETADOS
        if (state.hasBackendResponse(step.questionKey)) return true;

        // 🎯 PERMITIR ACCESO SOLO SI EL STEP ANTERIOR ESTÁ COMPLETADO
        const previousStep = state.steps[stepIndex - 1];
        if (previousStep && state.hasBackendResponse(previousStep.questionKey)) {
          return true;
        }

        // 🎯 CASO ESPECIAL: SI ES welcome_screen Y demographics ESTÁ COMPLETADO LOCALMENTE
        if (step.questionKey === 'welcome_screen') {
          const demographicsCompleted = state.hasBackendResponse('demographics');
          if (demographicsCompleted) {
            return true;
          }
        }

        // 🎯 NO PERMITIR ACCESO A STEPS POSTERIORES SIN COMPLETAR EL ANTERIOR
        return false;
      },

      getStepState: (stepIndex: number): StepStateInfo => {
        const state = get();
        const step = state.steps[stepIndex];
        if (!step) return {
          state: 'disabled' as StepState,
          canAccess: false,
          hasResponse: false,
          isCurrentStep: false
        };

        const hasResponse = state.hasBackendResponse(step.questionKey);
        const canAccess = state.canAccessStep(stepIndex);
        const isCurrentStep = step.questionKey === state.currentQuestionKey;

        let stateType: StepState;
        if (isCurrentStep) {
          stateType = 'active';
        } else if (hasResponse) {
          stateType = 'completed';
        } else if (!canAccess) {
          stateType = 'disabled';
        } else {
          stateType = 'available';
        }

        return {
          state: stateType,
          hasResponse,
          canAccess,
          isCurrentStep
        };
      },

      getInitialStep: (): string => {
        const state = get();
        if (state.steps.length === 0) return '';

        // 🎯 Si hay respuestas del backend, ir a la última pregunta respondida
        if (state.backendResponses.length > 0) {
          const stepOrder = state.steps.map(s => s.questionKey);
          const completedKeys = state.backendResponses.map((r: unknown) =>
            (r as { questionKey?: string }).questionKey
          ).filter((key): key is string => typeof key === 'string');
          
          // Encontrar el último step completado en el orden de steps
          for (let i = stepOrder.length - 1; i >= 0; i--) {
            if (completedKeys.includes(stepOrder[i])) {
              return stepOrder[i];
            }
          }
        }

        // Si no hay respuestas, ir al primer step sin responder
        const firstUnansweredStep = state.steps.find(step => !state.hasBackendResponse(step.questionKey));
        return firstUnansweredStep?.questionKey || state.steps[0]?.questionKey || '';
      },

      // 🎯 ESTADOS CALCULADOS
      getTotalResponses: () => {
        return get().backendResponses.length;
      },

      getLastCompletedStep: () => {
        const state = get();
        const completedKeys = state.backendResponses.map((r: unknown) =>
          (r as { questionKey?: string }).questionKey
        ).filter((key): key is string => typeof key === 'string');
        return completedKeys.length > 0 ? completedKeys[completedKeys.length - 1] : null;
      },

      getNextStep: () => {
        const state = get();
        const stepOrder = state.steps.map(s => s.questionKey);
        const currentStep = state.currentQuestionKey;
        const currentIndex = stepOrder.findIndex(step => step === currentStep);

        // Step navigation logging removido

        // Si hay un siguiente step en el orden, retornarlo
        if (currentIndex >= 0 && currentIndex < stepOrder.length - 1) {
          const nextStep = stepOrder[currentIndex + 1];
          // Next step logging removido
          return nextStep;
        }

        // No next step logging removido
        return '';
      },

      getCompletedSteps: () => {
        return get().backendResponses.map((r: unknown) =>
          (r as { questionKey?: string }).questionKey
        ).filter((key): key is string => typeof key === 'string');
      },

      // 🎯 MÉTODOS DE COMPATIBILIDAD
      getSteps: () => {
        return get().steps;
      },

      goToNextStep: () => {
        const state = get();
        const nextStepKey = state.getNextStep();
        
        if (nextStepKey) {
          state.setCurrentQuestionKey(nextStepKey);
        } else {
          // Si no hay más steps, navegar a thank_you_screen si no estamos ya ahí
          const currentKey = state.currentQuestionKey;
          if (currentKey !== 'thank_you_screen') {
            // Verificar si thank_you_screen está en los steps
            const stepOrder = state.steps.map(s => s.questionKey);
            const hasThankYouScreen = stepOrder.includes('thank_you_screen');
            
            if (hasThankYouScreen) {
              // Si está en los steps, navegar a él
              state.setCurrentQuestionKey('thank_you_screen');
            } else {
              // Si no está en los steps, agregarlo temporalmente y navegar
              const thankYouStep: Step = {
                questionKey: 'thank_you_screen',
                title: 'Gracias por participar'
              };
              set({
                steps: [...state.steps, thankYouStep]
              });
              state.setCurrentQuestionKey('thank_you_screen');
            }
          }
        }
      }
    })
);
