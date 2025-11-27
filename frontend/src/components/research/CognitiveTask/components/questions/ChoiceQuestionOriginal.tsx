import React from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { ChoiceQuestionProps } from '../../types';

// Ícono de papelera simplificado
const TrashIcon = () => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width="16" 
    height="16" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round"
  >
    <path d="M3 6h18"></path>
    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
  </svg>
);

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
 * Componente que maneja la configuración de preguntas de selección
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
  const choicesError = validationErrors ? validationErrors['choices'] : null; // Error general para el array

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-neutral-700 mb-1">
          {DEFAULT_TEXTS.QUESTION_TITLE_LABEL}
        </label>
        <Input
          value={question.title || ''}
          onChange={(e) => onQuestionChange({ title: e.target.value })}
          placeholder={DEFAULT_TEXTS.QUESTION_TITLE_PLACEHOLDER}
          disabled={disabled}
          error={!!titleError}
          helperText={titleError || undefined}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-700 mb-1">
          {DEFAULT_TEXTS.DESCRIPTION_LABEL}
        </label>
        <Textarea
          value={question.description || ''}
          onChange={(e) => onQuestionChange({ description: e.target.value })}
          placeholder={DEFAULT_TEXTS.DESCRIPTION_PLACEHOLDER}
          rows={3}
          disabled={disabled}
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-neutral-700">
            {DEFAULT_TEXTS.OPTIONS_LABEL}
            {choicesError && <span className="ml-2 text-xs text-red-500">({choicesError})</span>}
          </label>
          <Button
            variant="outline"
            size="sm"
            onClick={onAddChoice}
            disabled={disabled}
          >
            {DEFAULT_TEXTS.ADD_OPTION}
          </Button>
        </div>

        <div className="space-y-2">
          {question.choices?.map((choice, index) => {
            // <<< Buscar error específico para el texto de esta opción >>>
            const choiceTextErrorKey = `choices.${index}.text`;
            const choiceTextError = validationErrors ? validationErrors[choiceTextErrorKey] : null;

            return (
              <div key={choice.id} className="flex items-center gap-2">
                <Input
                  value={choice.text || ''}
                  onChange={(e) =>
                    onQuestionChange({
                      choices: question.choices?.map(c =>
                        c.id === choice.id
                          ? { ...c, text: e.target.value }
                          : c
                      )
                    })
                  }
                  placeholder={`${DEFAULT_TEXTS.OPTION_PLACEHOLDER} ${index + 1}`}
                  disabled={disabled}
                  className="flex-1"
                  // <<< Pasar error y helperText para la opción >>>
                  error={!!choiceTextError}
                  helperText={choiceTextError || undefined}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onRemoveChoice && onRemoveChoice(choice.id)} // Asegurar que onRemoveChoice existe
                  disabled={disabled || (question.choices?.length || 0) <= 1}
                >
                  <TrashIcon />
                </Button>
              </div>
            );
          })}
        </div>
      </div>

      {/* VISTA PREVIA: No editable */}
      <div className="bg-neutral-50 p-3 border border-gray-300 rounded-md">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Vista previa - Así verán esta pregunta los participantes
          <span className="ml-2 text-xs font-normal text-red-500">(NO EDITABLE)</span>
        </label>
        <div className="mt-2 text-sm text-gray-700 font-medium">{question.title || 'Título de la pregunta'}</div>
        {question.description && <div className="mt-1 text-xs text-gray-500">{question.description}</div>}
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
    </div>
  );
}; 