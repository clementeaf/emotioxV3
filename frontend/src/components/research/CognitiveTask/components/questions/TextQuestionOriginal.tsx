import React from 'react';

import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';

import { TextQuestionProps } from '../../types';
// import { UI_TEXTS } from '../../constants'; // Comentado por ahora

/**
 * Componente que maneja la configuración de preguntas de texto corto y largo
 */
export const TextQuestion: React.FC<TextQuestionProps> = ({
  question,
  onQuestionChange,
  validationErrors,
  disabled
}) => {
  // Buscar errores para esta pregunta
  const titleError = validationErrors ? validationErrors['title'] : null;

  return (
    <div className="space-y-4">
      {/* CAMPO EDITABLE: Título de la pregunta */}
      <div className="bg-white p-3 border border-neutral-200 rounded-md">
        <label className="block text-sm font-medium text-neutral-700 mb-1">
          Título de la pregunta <span className="text-red-500">*</span>
          <span className="ml-2 text-xs font-normal text-neutral-500">(Campo editable - escriba aquí su pregunta)</span>
        </label>
        <Input
          value={question.title || ''}
          onChange={(e) => onQuestionChange({ title: e.target.value })}
          placeholder={'Introduce el título de la pregunta'}
          disabled={disabled}
          error={!!titleError}
          helperText={titleError || undefined}
          className="border-2 border-neutral-300 focus:border-neutral-500 focus:ring-neutral-500"
        />
      </div>

      {/* CAMPO EDITABLE: Descripción */}
      <div className="bg-white p-3 border border-neutral-200 rounded-md">
        <label className="block text-sm font-medium text-neutral-700 mb-1">
          Descripción
          <span className="ml-2 text-xs font-normal text-neutral-500">(Campo editable - escriba aquí más detalles)</span>
        </label>
        <Textarea
          value={question.description || ''}
          onChange={(e) => onQuestionChange({ description: e.target.value })}
          placeholder={'Introduce una descripción opcional'}
          rows={3}
          disabled={disabled}
          className="border-2 border-neutral-300 focus:border-neutral-500 focus:ring-neutral-500"
        />
      </div>

      {/* CAMPO EDITABLE: Texto de ejemplo para respuesta */}
      <div className="bg-white p-3 border border-neutral-200 rounded-md">
        <label className="block text-sm font-medium text-neutral-700 mb-1">
          Texto de ejemplo para respuesta
          <span className="ml-2 text-xs font-normal text-neutral-500">(Campo editable - configuración del placeholder)</span>
        </label>
        {question.type === 'short_text' ? (
          <Input
            value={question.answerPlaceholder || ''}
            onChange={(e) => onQuestionChange({ answerPlaceholder: e.target.value })}
            placeholder={'Ej: Escribe tu respuesta aquí'}
            disabled={disabled}
            className="border-2 border-neutral-300 focus:border-neutral-500 focus:ring-neutral-500"
          />
        ) : (
          <Textarea
            value={question.answerPlaceholder || ''}
            onChange={(e) => onQuestionChange({ answerPlaceholder: e.target.value })}
            placeholder={'Ej: Escribe tu respuesta detallada aquí'}
            rows={2}
            disabled={disabled}
            className="border-2 border-neutral-300 focus:border-neutral-500 focus:ring-neutral-500"
          />
        )}
      </div>

      {/* VISTA PREVIA: No editable */}
      <div className="bg-neutral-50 p-3 border border-gray-300 rounded-md">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Vista previa - Así verán esta pregunta los participantes
          <span className="ml-2 text-xs font-normal text-red-500">(NO EDITABLE)</span>
        </label>
        <div className="mt-2 text-sm text-gray-700">{question.title || 'Título de la pregunta'}</div>
        {question.description && <div className="mt-1 text-xs text-gray-500">{question.description}</div>}
        <div className="relative mt-3">
          {question.type === 'short_text' ? (
            <Input
              value=""
              placeholder={question.answerPlaceholder || 'Short text answer'}
              disabled={true}
              className="bg-neutral-100 border-gray-300 text-gray-400 cursor-not-allowed"
            />
          ) : (
            <Textarea
              value=""
              placeholder={question.answerPlaceholder || 'Long text answer'}
              rows={3}
              disabled={true}
              className="bg-neutral-100 border-gray-300 text-gray-400 cursor-not-allowed"
            />
          )}
          <div className="absolute inset-0 bg-black bg-opacity-5 flex items-center justify-center pointer-events-none">
            <span className="bg-white px-3 py-1 rounded-full text-xs text-red-500 font-semibold shadow">
              Campo de respuesta - No editable aquí
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}; 