import React from 'react';
import { Button } from '@/components/ui/Button';
import { FormField, FormSection, FormCard, FormRow } from '@/components/common/atomic';
import { TrashIcon } from '@/components/common/icons';
import { ChoiceQuestionProps } from '../../types';

// Textos predeterminados
const DEFAULT_TEXTS = {
  QUESTION_TITLE_LABEL: 'Título de la pregunta',
  QUESTION_TITLE_PLACEHOLDER: 'Introduce el título de la pregunta',
  DESCRIPTION_LABEL: 'Descripción',
  DESCRIPTION_PLACEHOLDER: 'Introduce una descripción opcional',
  OPTIONS_LABEL: 'Opciones',
  ADD_OPTION: 'Añadir opción',
  OPTION_PLACEHOLDER: 'Opción'
};

/**
 * Componente refactorizado que usa componentes atómicos
 * Elimina duplicación de layouts y patrones repetidos
 * Mantiene todas las funcionalidades del componente original
 */
export const ChoiceQuestion: React.FC<ChoiceQuestionProps> = ({
  question,
  onQuestionChange,
  onAddChoice,
  onRemoveChoice,
  validationErrors,
  disabled
}) => {
  // Buscar errores
  const titleError = validationErrors ? validationErrors['title'] : null;
  const descriptionError = validationErrors ? validationErrors['description'] : null;
  const choicesError = validationErrors ? validationErrors['choices'] : null;

  return (
    <FormCard>
      <FormSection 
        title="Configuración de Pregunta de Selección"
        description="Configure las opciones de respuesta"
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
        />

        {/* Opciones */}
        <div className="space-y-3">
          <FormRow justified>
            <h4 className="text-sm font-medium text-gray-700">
              {DEFAULT_TEXTS.OPTIONS_LABEL}
              {choicesError && <span className="ml-2 text-xs text-red-500">({choicesError})</span>}
            </h4>
            <Button
              variant="outline"
              size="sm"
              onClick={onAddChoice}
              disabled={disabled}
            >
              {DEFAULT_TEXTS.ADD_OPTION}
            </Button>
          </FormRow>
          
          {question.choices?.map((choice, index) => {
            // Buscar error específico para el texto de esta opción
            const choiceTextErrorKey = `choices.${index}.text`;
            const choiceTextError = validationErrors ? validationErrors[choiceTextErrorKey] : null;

            return (
              <FormCard key={choice.id} className="p-3">
                <FormRow justified>
                  <FormField
                    type="text"
                    label=""
                    value={choice.text || ''}
                    onChange={(value) => {
                      const newChoices = [...(question.choices || [])];
                      newChoices[index] = { ...choice, text: value };
                      onQuestionChange({ choices: newChoices });
                    }}
                    placeholder={`${DEFAULT_TEXTS.OPTION_PLACEHOLDER} ${index + 1}`}
                    disabled={disabled}
                    error={!!choiceTextError}
                    errorMessage={choiceTextError || undefined}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onRemoveChoice(choice.id)}
                    disabled={disabled || (question.choices?.length || 0) <= 1}
                    className="text-red-600 hover:text-red-700"
                  >
                    <TrashIcon />
                  </Button>
                </FormRow>
              </FormCard>
            );
          })}
        </div>

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
            <div className="mt-3 space-y-2">
              {question.choices && question.choices.length > 0 ? (
                question.choices.map((choice, index) => (
                  <div key={choice.id} className="flex items-center gap-2 p-2 bg-white rounded border border-gray-200">
                    {question.type === 'single_choice' ? (
                      <input
                        type="radio"
                        disabled
                        className="w-4 h-4 text-blue-600 cursor-not-allowed"
                      />
                    ) : (
                      <input
                        type="checkbox"
                        disabled
                        className="w-4 h-4 text-blue-600 cursor-not-allowed"
                      />
                    )}
                    <span className="text-sm text-gray-700">{choice.text || `Opción ${index + 1}`}</span>
                  </div>
                ))
              ) : (
                <div className="text-xs text-gray-400 italic">No hay opciones configuradas</div>
              )}
            </div>
          </div>
        </FormCard>
      </FormSection>
    </FormCard>
  );
};
