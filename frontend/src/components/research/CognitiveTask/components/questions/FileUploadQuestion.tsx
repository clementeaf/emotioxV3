import React from 'react';
import { FormField, FormSection, FormCard } from '@/components/common/atomic';
import { FileUploadQuestionProps } from '../../types';

/**
 * Versión simplificada que usa componentes atómicos
 * Elimina duplicación de layouts y patrones repetidos
 */
export const FileUploadQuestion: React.FC<FileUploadQuestionProps> = ({
  question,
  onQuestionChange,
  disabled = false,
  validationErrors = {}
}) => {
  const titleError = validationErrors?.['title'];
  const descriptionError = validationErrors?.['description'];

  return (
    <FormCard>
      <FormSection 
        title="Configuración de Pregunta de Subida de Archivos"
        description="Configure la pregunta de subida de archivos"
      >
        {/* Título de la pregunta */}
        <FormField
          type="text"
          label="Título de la pregunta"
          value={question.title || ''}
          onChange={(value) => onQuestionChange({ title: value })}
          placeholder="Introduce el título de la pregunta"
          disabled={disabled}
          error={!!titleError}
          errorMessage={titleError || undefined}
        />

        {/* Descripción */}
        <FormField
          type="textarea"
          label="Descripción"
          value={question.description || ''}
          onChange={(value) => onQuestionChange({ description: value })}
          placeholder="Introduce una descripción opcional"
          disabled={disabled}
          error={!!descriptionError}
          errorMessage={descriptionError || undefined}
          config={{ rows: 3 }}
        />

        {/* Vista previa */}
        <FormCard className="bg-gray-50">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Vista previa - Así verán esta pregunta los participantes
              <span className="ml-2 text-xs font-normal text-red-500">(NO EDITABLE)</span>
            </label>
            <div className="mt-2 text-sm text-gray-700 font-medium">
              {question.title || 'Título de la pregunta'}
            </div>
            {question.description && (
              <div className="mt-1 text-xs text-gray-500">{question.description}</div>
            )}

            <div className="mt-4 p-4 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50">
              <div className="text-center text-sm text-gray-600">
                Área de subida de archivos
              </div>
            </div>
          </div>
        </FormCard>
      </FormSection>
    </FormCard>
  );
};
