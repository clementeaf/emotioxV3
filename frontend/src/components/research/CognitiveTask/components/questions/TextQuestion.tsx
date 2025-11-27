import React from 'react';
import { FormField, FormSection, FormCard } from '@/components/common/atomic';
import { TextQuestionProps } from '../../types';

/**
 * Componente refactorizado que usa componentes atómicos
 * Elimina duplicación de layouts y patrones repetidos
 */
export const TextQuestion: React.FC<TextQuestionProps> = ({
  question,
  onQuestionChange,
  validationErrors,
  disabled
}) => {
  const titleError = validationErrors ? validationErrors['title'] : null;

  return (
    <FormCard>
      <FormSection 
        title="Configuración de Pregunta de Texto"
        description="Configure la pregunta de texto corto o largo"
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
          config={{ rows: 3 }}
        />

        {/* Placeholder de respuesta */}
        <FormField
          type="text"
          label="Placeholder de respuesta"
          value={question.answerPlaceholder || ''}
          onChange={(value) => onQuestionChange({ answerPlaceholder: value })}
          placeholder="Ej: Escribe tu respuesta aquí..."
          disabled={disabled}
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

            <div className="mt-4">
              {question.type === 'short_text' ? (
                <input
                  type="text"
                  disabled
                  placeholder={question.answerPlaceholder || 'Escribe tu respuesta aquí...'}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm cursor-not-allowed bg-gray-100"
                />
              ) : (
                <textarea
                  disabled
                  placeholder={question.answerPlaceholder || 'Escribe tu respuesta aquí...'}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm cursor-not-allowed bg-gray-100"
                />
              )}
            </div>
          </div>
        </FormCard>
      </FormSection>
    </FormCard>
  );
};
