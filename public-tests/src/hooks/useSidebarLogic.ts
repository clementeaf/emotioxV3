import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { SidebarStep, UseSidebarLogicProps, UseSidebarLogicReturn } from '../components/TestLayout/types';
import { StepConfiguration } from '../lib/types';
import { useStepStore } from '../stores/useStepStore';
import { useAvailableFormsQuery } from './useApiQueries';
import { useDeleteState } from './useDeleteState';

export const useSidebarLogic = ({
  researchId,
  onStepsReady,
  onDeleteAllResponses
}: UseSidebarLogicProps): UseSidebarLogicReturn => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedQuestionKey, setSelectedQuestionKey] = useState<string>('');
  const stepsNotifiedRef = useRef(false);
  const hasInitializedRef = useRef(false);

  // Usar el store global para currentQuestionKey
  const { currentQuestionKey, setCurrentQuestionKey } = useStepStore();

  const {
    data: formsData,
    isLoading,
    error,
    refetch: refetchForms
  } = useAvailableFormsQuery(researchId || '');

  // DELETE STATE
  const {
    isDeleting,
    buttonText: deleteButtonText,
    isButtonDisabled: isDeleteDisabled,
    handleDelete
  } = useDeleteState({
    showToasts: false
  });

  const steps = useMemo(() => {
    if (formsData?.stepsConfiguration && formsData.stepsConfiguration.length > 0) {

      // Usar TODOS los steps que llegan del backend en el orden que vienen
      const backendStepOrder = formsData.steps || [];

      // Crear un mapa de configuración por questionKey para acceso rápido
      const configMap = new Map();
      formsData.stepsConfiguration.forEach((stepConfig: StepConfiguration) => {
        configMap.set(stepConfig.questionKey, stepConfig);
      });

      // Construir steps usando el orden del backend
      const orderedSteps = backendStepOrder
        .map(questionKey => {
          const stepConfig = configMap.get(questionKey);
          if (!stepConfig) {
            console.warn('[useSidebarLogic] ⚠️ Step no encontrado en configuración:', questionKey);
            return null;
          }

          // 🎯 FILTRAR STEPS DE DEMOGRAPHICS SIN CONFIGURACIÓN
          if (questionKey === 'demographics') {
            const hasConfiguredQuestions = Object.values(stepConfig.contentConfiguration?.demographicQuestions || {}).some((q: unknown) => (q as Record<string, unknown>)?.enabled);
            if (!hasConfiguredQuestions) {
              return null;
            }
          }

          let title = '';
          switch (questionKey) {
            case 'demographics':
              title = 'Preguntas demográficas';
              break;
            case 'welcome_screen':
              title = 'Bienvenido';
              break;
            case 'thank_you_screen':
              title = 'Gracias por participar';
              break;
            case 'smartvoc_csat':
              title = String(stepConfig.contentConfiguration?.title || 'CSAT');
              break;
            case 'cognitive_navigation_flow':
              title = 'Navegación Cognitiva';
              break;
            default:
              title = String(stepConfig.contentConfiguration?.title || questionKey);
          }

          return {
            title: title,
            questionKey: stepConfig.questionKey
          };
        })
        .filter((step): step is NonNullable<typeof step> => step !== null);


      return orderedSteps;
    }
    return [];
  }, [formsData?.stepsConfiguration, formsData?.steps]);

  const totalSteps = steps.length;

  // Usar currentQuestionKey del store como fuente de verdad
  const effectiveCurrentQuestionKey = currentQuestionKey || selectedQuestionKey;

  const { getInitialStep, canAccessStep } = useStepStore();

  // SINCRONIZAR STEPS CON EL STORE
  useEffect(() => {
    if (steps.length > 0) {

      // Convertir steps al formato del store
      const storeSteps = steps.map((step) => ({
        questionKey: step.questionKey,
        title: step.title
      }));

      // Sincronizar con el store global
      const { setSteps } = useStepStore.getState();
      setSteps(storeSteps);
    }
  }, [steps]);

  const initializeActiveStep = useCallback(() => {
    if (steps.length > 0 && !effectiveCurrentQuestionKey && !hasInitializedRef.current) {
      const initialStep = getInitialStep();
      
      setSelectedQuestionKey(initialStep);
      setCurrentQuestionKey(initialStep);
      hasInitializedRef.current = true;
    }
  }, [steps, effectiveCurrentQuestionKey, getInitialStep, setCurrentQuestionKey]);

  useEffect(() => {
    if (steps.length > 0 && onStepsReady && !stepsNotifiedRef.current) {
      stepsNotifiedRef.current = true;
      const sidebarSteps: SidebarStep[] = steps.map((step) => ({
        label: step.title,
        questionKey: step.questionKey
      }));
      onStepsReady(sidebarSteps);
    }
  }, [steps, onStepsReady]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      initializeActiveStep();
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [initializeActiveStep]);

  // SINCRONIZAR currentQuestionKey CON selectedQuestionKey
  useEffect(() => {
    if (currentQuestionKey && currentQuestionKey !== selectedQuestionKey) {
      setSelectedQuestionKey(currentQuestionKey);
    }
  }, [currentQuestionKey, selectedQuestionKey]);

  // ========================================
  // 🎯 FUNCIONES DE NAVEGACIÓN (MEMOIZADAS)
  const isStepEnabled = useCallback((stepIndex: number): boolean => {
    return canAccessStep(stepIndex);
  }, [canAccessStep]);

  const handleStepClick = useCallback((questionKey: string) => {
    setCurrentQuestionKey(questionKey);
  }, [setCurrentQuestionKey]);

  // FUNCIONES DE ELIMINACIÓN
  const handleDeleteAllResponses = useCallback(async () => {
    if (!onDeleteAllResponses) {
      return;
    }

    await handleDelete(async () => {
      await onDeleteAllResponses();
    });
  }, [onDeleteAllResponses, handleDelete]);

  // FUNCIONES DEL SIDEBAR (MEMOIZADAS)
  const toggleSidebar = useCallback(() => setIsOpen(prev => !prev), []);
  const closeSidebar = useCallback(() => setIsOpen(false), []);

  return {
    formsData,
    steps,
    totalSteps,
    isLoading,
    error: error || null,
    isOpen,
    setIsOpen,
    toggleSidebar,
    closeSidebar,
    selectedQuestionKey: effectiveCurrentQuestionKey, // Usar el efectivo
    isStepEnabled,
    handleStepClick,
    handleDeleteAllResponses,
    isDeleting,
    deleteButtonText,
    isDeleteDisabled,
    refetchForms
  };
};
