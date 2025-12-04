
import React from 'react';
import { useFormLoadingState } from '../../hooks/useFormLoadingState';
import { EmojiRangeQuestion, ScaleRangeQuestion, SingleAndMultipleChoiceQuestion, VOCTextQuestion, LinearScaleSlider } from './QuestionesComponents';
import { useAutoAdvance } from '../../hooks/useAutoAdvance';
import { useQuestionHandlers } from '../../hooks/useQuestionHandlers';
import { useQuestionInitialization, Question, FormData } from '../../hooks/useQuestionInitialization';
import { EmotionGrid } from './emotions';
import { DetailedEmotionSelector } from './emotion/DetailedEmotionSelector';

interface QuestionComponentProps {
  question: Question;
  currentStepKey: string;
  initialFormData?: FormData;
}

export const QuestionComponent: React.FC<QuestionComponentProps> = React.memo(({ question, currentStepKey, initialFormData }) => {
  console.log('[QuestionComponent] Rendering:', {
    questionType: question.type,
    currentStepKey,
    hasInitialFormData: !!initialFormData,
    config: question.config
  });
  const {
    isLoading,
    hasLoadedData,
    formValues,
    saveToStore
  } = useFormLoadingState({
    questionKey: currentStepKey
  });

  const { value, setValue } = useQuestionInitialization({
    question,
    currentStepKey,
    initialFormData,
    formValues,
    hasLoadedData
  });

  const { isAdvancing, triggerAutoAdvance } = useAutoAdvance({
    questionType: question.type,
    maxSelections: question.config?.maxSelections,
    currentQuestionKey: currentStepKey,
  });

  const { handleChange } = useQuestionHandlers({
    questionType: question.type,
    config: question.config,
    value,
    setValue,
    onSave: (dataToSave) => {
      saveToStore(dataToSave);
    },
    onAutoAdvance: (selections) => {
      triggerAutoAdvance(selections);
    },
    isAdvancing
  });

  const handleEmotionClick = React.useCallback((emotion: string) => {
    handleChange(emotion);
  }, [handleChange]);

  // 🎯 Para preguntas de texto (VOC), renderizar inmediatamente con placeholder
  // El placeholder no depende de datos del backend, así que puede mostrarse de inmediato
  const isTextQuestion = question.type === 'text' || question.type === 'cognitive_short_text' || question.type === 'cognitive_long_text';
  const shouldShowLoading = isLoading && !isTextQuestion;

  if (shouldShowLoading) {
    return <div className="flex items-center justify-center h-full">Cargando...</div>;
  }

  return (
    <div key={`question-${currentStepKey}-${question.type}`} className="flex flex-col items-center justify-center h-full w-full gap-6 p-[2.5%] sm:p-[3%]">
      {question.title && question.title.trim() !== '' && (
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 text-center w-full max-w-4xl">
          {question.title}
        </h1>
      )}
      {question.description && question.description.trim() !== '' && (
        <p className="text-gray-600 text-center w-full max-w-4xl">
          {question.description}
        </p>
      )}
      {question.config?.instructions && (
        <p className="text-sm text-gray-500 text-center w-full max-w-4xl mt-2">
          {question.config.instructions}
        </p>
      )}

      <div className="w-full max-w-4xl">
        {question.type === 'choice' && (
          <SingleAndMultipleChoiceQuestion
            key={`choice-${currentStepKey}-${question.title.replace(/\s+/g, '-')}`}
            choices={(question.choices || []).map((choice: unknown) => {
              const choiceObj = choice as { id?: string; value?: string; text?: string; label?: string; isQualify?: boolean; isDisqualify?: boolean };
              return {
                id: choiceObj.id || choiceObj.value || String(choiceObj.text || choiceObj.label || ''),
                text: choiceObj.text || choiceObj.label || String(choiceObj.id || choiceObj.value || ''),
                isQualify: choiceObj.isQualify,
                isDisqualify: choiceObj.isDisqualify
              };
            })}
            value={(() => {
              // 🎯 Asegurar que el valor sea el formato correcto para opciones múltiples
              if (question.config?.multiple) {
                if (Array.isArray(value)) {
                  return value;
                }
                if (value && typeof value === 'string') {
                  // Si viene como string, intentar parsearlo
                  try {
                    const parsed = JSON.parse(value);
                    return Array.isArray(parsed) ? parsed : [value];
                  } catch {
                    return [value];
                  }
                }
                return value ? [value] : [];
              }
              return value as string | string[];
            })()}
            onChange={handleChange}
            multiple={question.config?.multiple || false}
          />
        )}
        {question.type === 'scale' && (
          <ScaleRangeQuestion
            min={question.config?.min as number | undefined}
            max={question.config?.max as number | undefined}
            startLabel={question.config?.startLabel}
            endLabel={question.config?.endLabel}
            leftLabel={question.config?.leftLabel}
            rightLabel={question.config?.rightLabel}
            value={value as number}
            onChange={handleChange}
          />
        )}
        {question.type === 'linear_scale' && (
          <LinearScaleSlider
            min={question.config?.min as number | undefined}
            max={question.config?.max as number | undefined}
            startLabel={question.config?.startLabel}
            endLabel={question.config?.endLabel}
            value={value as number}
            onChange={handleChange}
          />
        )}
        {question.type === 'emoji' && (
          <EmojiRangeQuestion
            emojis={question.config?.emojis}
            value={value as number}
            onChange={handleChange}
            type={(question.config?.type as "emojis" | "stars") || 'emojis'}
            min={question.config?.min as number | undefined}
            max={question.config?.max as number | undefined}
            startLabel={question.config?.startLabel}
            endLabel={question.config?.endLabel}
          />
        )}
        {question.type === 'text' && (
          <VOCTextQuestion
            value={value as string}
            onChange={handleChange}
            placeholder={question.config?.placeholder as string || 'Escribe tu opinión aquí...'}
          />
        )}
        {(question.type === 'cognitive_short_text' || question.type === 'cognitive_long_text') && (
          <VOCTextQuestion
            value={value as string}
            onChange={handleChange}
            placeholder={question.config?.placeholder as string || 'Escribe tu respuesta aquí...'}
          />
        )}
        {(question.type === 'smartvoc_nev' || question.type === 'detailed' || question.type === 'emojis') && (
          question.type === 'detailed' ? (
            <DetailedEmotionSelector
              selectedEmotions={Array.isArray(value) ? value : []}
              onEmotionSelect={handleEmotionClick}
              maxSelections={question.config?.maxSelections}
            />
          ) : (
            <EmotionGrid
              value={value}
              onEmotionClick={handleEmotionClick}
            />
          )
        )}
      </div>
    </div>
  );
});

QuestionComponent.displayName = 'QuestionComponent';
