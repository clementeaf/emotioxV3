import React from 'react';
import { FormField, FormSection, FormCard, FormRow } from '@/components/common/atomic';
import { ScaleQuestionProps, ScaleConfig } from '../../types';

/**
 * Componente refactorizado que usa componentes atómicos
 * Elimina duplicación de layouts y patrones repetidos
 */
export const ScaleQuestion: React.FC<ScaleQuestionProps> = ({
  question,
  onQuestionChange,
  validationErrors,
  disabled
}) => {
  const titleError = validationErrors ? validationErrors['title'] : null;
  const descriptionError = validationErrors ? validationErrors['description'] : null;
  const startValueError = validationErrors ? validationErrors['scaleConfig.startValue'] : null;
  const endValueError = validationErrors ? validationErrors['scaleConfig.endValue'] : null;
  const startLabelError = validationErrors ? validationErrors['scaleConfig.startLabel'] : null;
  const endLabelError = validationErrors ? validationErrors['scaleConfig.endLabel'] : null;
  const scaleRangeError = validationErrors ? validationErrors['scaleConfig'] : null;
  
  const scaleConfig: ScaleConfig = question.scaleConfig || {
    startValue: 1,
    endValue: 5,
    startLabel: '',
    endLabel: ''
  };

  return (
    <FormCard>
      <FormSection 
        title="Configuración de Pregunta de Escala"
        description="Configure los valores y etiquetas de la escala"
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

        {/* Configuración de la escala */}
        <div className="space-y-3 pt-2 border-t border-gray-200">
          <h4 className="text-sm font-medium text-gray-800">Configuración de la Escala</h4>
          
          {scaleRangeError && typeof scaleRangeError === 'string' && (
            <p className="text-xs text-red-500">{scaleRangeError}</p>
          )}

          <FormRow justified>
            {/* Valor inicial */}
            <FormField
              type="number"
              label="Valor inicial"
              value={scaleConfig.startValue ?? 0}
              onChange={(value) => {
                const numValue = parseInt(value, 10);
                onQuestionChange({ 
                  scaleConfig: { 
                    ...scaleConfig, 
                    startValue: isNaN(numValue) ? 0 : numValue 
                  } 
                });
              }}
              disabled={disabled}
              error={!!startValueError}
              errorMessage={startValueError || undefined}
              config={{ min: 0, max: 100 }}
            />

            {/* Valor final */}
            <FormField
              type="number"
              label="Valor final"
              value={scaleConfig.endValue ?? 0}
              onChange={(value) => {
                const numValue = parseInt(value, 10);
                onQuestionChange({ 
                  scaleConfig: { 
                    ...scaleConfig, 
                    endValue: isNaN(numValue) ? 0 : numValue 
                  } 
                });
              }}
              disabled={disabled}
              error={!!endValueError}
              errorMessage={endValueError || undefined}
              config={{ min: 0, max: 100 }}
            />
          </FormRow>
          
          <FormRow justified>
            {/* Etiqueta valor inicial */}
            <FormField
              type="text"
              label="Etiqueta valor inicial"
              value={scaleConfig.startLabel || ''}
              onChange={(value) => {
                onQuestionChange({ scaleConfig: { ...scaleConfig, startLabel: value } });
              }}
              placeholder="Ej: Muy en desacuerdo"
              disabled={disabled}
              error={!!startLabelError}
              errorMessage={startLabelError || undefined}
            />

            {/* Etiqueta valor final */}
            <FormField
              type="text"
              label="Etiqueta valor final"
              value={scaleConfig.endLabel || ''}
              onChange={(value) => {
                onQuestionChange({ scaleConfig: { ...scaleConfig, endLabel: value } });
              }}
              placeholder="Ej: Muy de acuerdo"
              disabled={disabled}
              error={!!endLabelError}
              errorMessage={endLabelError || undefined}
            />
          </FormRow>
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

            <div className="mt-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs text-gray-600">
                  {scaleConfig.startLabel || 'Muy en desacuerdo'}
                </span>
                <span className="text-xs text-gray-600">
                  {scaleConfig.endLabel || 'Muy de acuerdo'}
                </span>
              </div>
              <div className="flex justify-between items-center gap-2">
                {Array.from(
                  { length: (scaleConfig.endValue ?? 5) - (scaleConfig.startValue ?? 1) + 1 },
                  (_, i) => (scaleConfig.startValue ?? 1) + i
                ).map((value) => (
                  <div key={value} className="flex flex-col items-center">
                    <input
                      type="radio"
                      disabled
                      className="w-4 h-4 text-blue-600 cursor-not-allowed mb-1"
                    />
                    <span className="text-xs text-gray-600">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </FormCard>
      </FormSection>
    </FormCard>
  );
};
