import React from 'react';
import { Button } from './Button';

export interface FormFooterProps {
  onSave: () => void;
  onPreview?: () => void;
  isSaving?: boolean;
  isDisabled?: boolean;
  isUpdate?: boolean;
  saveText?: string;
  updateText?: string;
  savingText?: string;
  previewText?: string;
  statusText?: string;
  showStatus?: boolean;
  className?: string;
}

/**
 * Componente reutilizable para el pie de página de formularios
 * Se usa en WelcomeScreen, ThankYouScreen, SmartVOC y CognitiveTask
 */
export const FormFooter: React.FC<FormFooterProps> = ({
  onSave,
  onPreview,
  isSaving = false,
  isDisabled = false,
  isUpdate = false,
  saveText = "Guardar",
  updateText = "Actualizar",
  savingText = "Guardando...",
  previewText = "Vista previa",
  className = "",
}) => {
  // Determinar el texto del botón de guardar
  const buttonText = isSaving
    ? savingText
    : isUpdate
      ? updateText
      : saveText;

  return (
    <div className={`flex justify-end items-center gap-3 pt-4 ${className}`}>
      {onPreview && (
        <Button
          variant="outline"
          onClick={onPreview}
          disabled={isDisabled || isSaving}
        >
          {previewText}
        </Button>
      )}
      <Button
        onClick={onSave}
        disabled={isDisabled || isSaving}
        loading={isSaving}
      >
        {buttonText}
      </Button>
    </div>
  );
}; 