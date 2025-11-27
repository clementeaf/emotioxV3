import React, { useMemo, memo } from 'react';
import { ActionButton } from './ActionButton';

interface FormActionButtonsProps {
  // Estados
  isSaving?: boolean;
  isLoading?: boolean;
  isDeleting?: boolean;
  isExisting?: boolean;
  isEnabled?: boolean;
  
  // Acciones
  onSave: () => void;
  onPreview: () => void;
  onDelete?: () => void;
  
  // Textos personalizables
  saveText?: string;
  savingText?: string;
  previewText?: string;
  deleteText?: string;
  deletingText?: string;
  
  // Estilos
  className?: string;
  buttonAlignment?: 'left' | 'right' | 'between';
}

export const FormActionButtons: React.FC<FormActionButtonsProps> = memo(({
  isSaving = false,
  isLoading = false,
  isDeleting = false,
  isExisting = false,
  isEnabled = true,
  onSave,
  onPreview,
  onDelete,
  saveText = 'Guardar',
  savingText = 'Guardando...',
  previewText = 'Vista previa',
  deleteText = 'Eliminar',
  deletingText = 'Eliminando...',
  className = '',
  buttonAlignment = 'right'
}) => {
  const alignmentClass = useMemo(() => {
    switch (buttonAlignment) {
      case 'left':
        return 'justify-start';
      case 'between':
        return 'justify-between';
      case 'right':
      default:
        return 'justify-end';
    }
  }, [buttonAlignment]);

  const saveButtonText = useMemo(() => {
    if (isSaving) return savingText;
    if (isExisting) return 'Actualizar';
    return saveText;
  }, [isSaving, isExisting, savingText, saveText]);

  return (
    <div className={`flex items-center pt-8 gap-3 ${alignmentClass} ${className}`}>
      {/* Botón de eliminar */}
      {isExisting && onDelete && (
        <ActionButton
          variant="danger"
          onClick={onDelete}
          disabled={isDeleting || isSaving || !isEnabled}
          loading={isDeleting}
          icon="🗑️"
        >
          {isDeleting ? deletingText : deleteText}
        </ActionButton>
      )}

      {/* Botones principales */}
      <ActionButton
        variant="secondary"
        onClick={onPreview}
        disabled={!isEnabled || isSaving}
      >
        {previewText}
      </ActionButton>

      <ActionButton
        variant="primary"
        onClick={onSave}
        disabled={!isEnabled || isSaving}
        loading={isSaving}
      >
        {saveButtonText}
      </ActionButton>
    </div>
  );
});

FormActionButtons.displayName = 'FormActionButtons';
