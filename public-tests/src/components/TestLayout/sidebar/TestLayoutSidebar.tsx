import React from 'react';
import { useDeleteAllResponsesMutation } from '../../../hooks/useApiQueries';
import { useEyeTrackingConfigQuery } from '../../../hooks/useEyeTrackingConfigQuery';
import { useSidebarLogic } from '../../../hooks/useSidebarLogic';
import { useFormDataStore } from '../../../stores/useFormDataStore';
import { useStepStore } from '../../../stores/useStepStore';
import { useTestStore } from '../../../stores/useTestStore';
import BurgerMenuButton from '../components/BurgerMenuButton';
import MobileOverlay from '../components/MobileOverlay';
import ProgressDisplay from '../components/ProgressDisplay';
import SidebarContainer from '../components/SidebarContainer';
import StepsList from '../components/StepsList';
import { Props } from '../types';

const TestLayoutSidebar: React.FC<Props> = ({
  onStepsReady,
}) => {
  const { researchId, participantId } = useTestStore();
  const {
    currentQuestionKey,
    backendResponses
  } = useStepStore();
  const { clearAllFormData } = useFormDataStore();
  const { data: eyeTrackingConfig } = useEyeTrackingConfigQuery(researchId || '');
  const shouldShowProgressFeatures = eyeTrackingConfig?.linkConfig?.showProgressBar ?? true;

  const deleteMutation = useDeleteAllResponsesMutation({
    onSuccess: () => {
      clearAllFormData();
      const { resetStore } = useStepStore.getState();
      resetStore();
    },
    onError: (error) => {
      // Error al eliminar respuestas
    }
  });

  const { steps, totalSteps, isLoading, error, isOpen, toggleSidebar, closeSidebar, isStepEnabled, handleDeleteAllResponses, isDeleting, deleteButtonText, isDeleteDisabled, refetchForms } = useSidebarLogic({
    researchId: researchId || '',
    onStepsReady,
    onDeleteAllResponses: async () => {
      if (researchId && participantId) {
        await deleteMutation.mutateAsync({ researchId, participantId });
      }
    }
  });

  const sidebarKey = `${backendResponses.length}-${currentQuestionKey}`;

  return (
    <div key={sidebarKey}>
      <BurgerMenuButton onClick={toggleSidebar} />
      <MobileOverlay isOpen={isOpen} onClose={closeSidebar} />
      <SidebarContainer isOpen={isOpen} onClose={closeSidebar}>
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-3"></div>
            <div className="text-gray-600 text-sm text-center">
              {researchId ? 'Cargando formularios desde API...' : 'Cargando pasos...'}
            </div>
          </div>
        ) : error ? (
          <div className="text-red-500 text-sm">
            Error al cargar pasos: {error.message}
            {researchId && (
              <button
                onClick={() => refetchForms()}
                className="ml-2 text-blue-500 hover:text-blue-700 underline"
              >
                Reintentar
              </button>
            )}
          </div>
        ) : (
          <>
            {/* 🎯 PROGRESS DISPLAY - SOLO SI showProgressBar ES TRUE */}
            {shouldShowProgressFeatures && (
              <ProgressDisplay current={1} total={totalSteps} />
            )}

            {/* 🎯 STEPS LIST - SOLO SI showProgressBar ES TRUE */}
            {shouldShowProgressFeatures && (
              <StepsList
                key={sidebarKey}
                steps={steps}
                currentStepKey={currentQuestionKey}
                isStepEnabled={isStepEnabled}
              />
            )}

            {shouldShowProgressFeatures && (
              <div className="mt-6 p-4 border-t border-gray-200">
                <button
                  onClick={handleDeleteAllResponses}
                  disabled={isDeleteDisabled}
                  className={`w-full px-4 py-2 text-sm font-medium rounded-md transition-colors ${isDeleteDisabled
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-red-600 hover:bg-red-700 text-white'
                    }`}
                >
                  {isDeleting ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      {deleteButtonText}
                    </div>
                  ) : (
                    'Eliminar todas las respuestas'
                  )}
                </button>
              </div>
            )}
          </>
        )}
      </SidebarContainer>
    </div>
  );
};

export default TestLayoutSidebar;
