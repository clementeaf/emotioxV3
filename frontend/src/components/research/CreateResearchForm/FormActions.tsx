import React from 'react';
import { ActionButton } from '@/components/common/ActionButton';

interface FormActionsProps {
  currentStep: number;
  totalSteps: number;
  canGoNext: boolean;
  isSubmitting: boolean;
  selectedTechnique?: string;
  onPrevious: () => void;
  onNext: () => void;
  onSubmit: () => void;
}

export const FormActions: React.FC<FormActionsProps> = ({
  currentStep,
  totalSteps,
  canGoNext,
  isSubmitting,
  selectedTechnique,
  onPrevious,
  onNext,
  onSubmit
}) => {
  const isLastStep = currentStep === totalSteps;

  return (
    <div className="flex justify-between mt-6">
      {currentStep > 1 && (
        <ActionButton
          variant="secondary"
          onClick={onPrevious}
        >
          Anterior
        </ActionButton>
      )}
      <div className="ml-auto">
        {!isLastStep ? (
          <ActionButton
            variant="primary"
            onClick={onNext}
            disabled={!canGoNext}
          >
            Siguiente
          </ActionButton>
        ) : (
          <ActionButton
            variant="primary"
            onClick={onSubmit}
            loading={isSubmitting}
            disabled={!selectedTechnique}
          >
            {selectedTechnique === 'aim-framework'
              ? 'Configurar AIM Framework'
              : 'Crear Investigación'}
          </ActionButton>
        )}
      </div>
    </div>
  );
};