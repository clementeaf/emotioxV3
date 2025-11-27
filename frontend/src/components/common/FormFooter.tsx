import React from 'react';

import { FormFooter as UIFormFooter } from '@/components/ui/FormFooter';

interface FormFooterProps {
  isSaving: boolean;
  isLoading: boolean;
  onSave: () => void;
  onPreview?: () => void;
  onDelete?: () => void;
  isExisting?: boolean;
  saveText?: string;
  updateText?: string;
  savingText?: string;
  previewText?: string;
  deleteText?: string;
  className?: string;
}

/**
 * Componente genérico para footers de formularios
 * Reutilizable en cualquier formulario que necesite botones de acción
 */
export const FormFooter: React.FC<FormFooterProps> = ({
  isSaving,
  isLoading,
  onSave,
  onPreview,
  onDelete,
  isExisting = false,
  saveText = "Guardar",
  updateText = "Actualizar",
  savingText = "Guardando...",
  previewText = "Vista Previa",
  deleteText = "Eliminar",
  className = ''
}) => {
  return (
    <div className={`flex flex-col items-center gap-4 ${className}`}>
      <UIFormFooter
        onSave={onSave}
        onPreview={onPreview}
        isSaving={isSaving}
        isDisabled={isLoading}
        isUpdate={isExisting}
        saveText={saveText}
        updateText={updateText}
        savingText={savingText}
        previewText={previewText}
      />

      {/* Botón de eliminar datos */}
      {onDelete && isExisting && (
        <div className="w-full pt-4 mt-4 border-t border-gray-200 flex justify-center">
          <button
            onClick={onDelete}
            disabled={isSaving || isLoading}
            className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 hover:border-red-300 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            🗑️ {deleteText}
          </button>
        </div>
      )}
    </div>
  );
};

export default FormFooter;
