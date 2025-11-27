import React from 'react';
import { FormCard } from '@/components/common/FormCard';
import { QuestionPreview } from '@/components/common/QuestionPreview';
import { QuestionType } from 'shared/interfaces/question-types.enum';
import { SmartVOCQuestion } from '@/api/domains/smart-voc';
import { getQuestionTypeConfig } from '../config';
import { DynamicFieldRenderer } from './DynamicFieldRenderer';
import { getNestedValue, createFieldChangeHandler } from '../utils';

interface SmartVOCQuestionsProps {
  questions: SmartVOCQuestion[];
  onUpdateQuestion: (id: string, updates: Partial<SmartVOCQuestion>) => void;
  onAddQuestion: (question: SmartVOCQuestion) => void;
  onRemoveQuestion: (id: string) => void;
  disabled?: boolean;
}

export const SmartVOCQuestions: React.FC<SmartVOCQuestionsProps> = ({
  questions,
  onUpdateQuestion,
  onAddQuestion,
  onRemoveQuestion,
  disabled
}) => {
  const questionsForUI = questions.map(q => ({
    ...q,
    type: q.type
  }));

  const renderQuestionFields = (question: SmartVOCQuestion) => {
    const config = getQuestionTypeConfig(question.type);
    if (!config) return null;

    return (
      <div className="space-y-4">
        {config.fields.map((field, index) => {
          const fieldValue = getNestedValue(question, field.name);
          const handleChange = createFieldChangeHandler(question.id, field.name, onUpdateQuestion);

          return (
            <DynamicFieldRenderer
              key={`${question.id}-${field.name}-${index}`}
              field={field}
              value={fieldValue}
              onChange={handleChange}
              disabled={disabled}
            />
          );
        })}

        {/* Info específica del tipo */}
        {config.info && (
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-neutral-900">{config.name}</span>
            <div className="text-sm text-neutral-600 bg-neutral-100 px-3 py-2 rounded-lg">
              {config.info}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {questionsForUI.map((question, index) => (
        <FormCard key={question.id || index} title={`Pregunta ${index + 1}: ${question.title}`}>
          <div className="space-y-4">
            {renderQuestionFields(question)}

            <QuestionPreview
              title={question.title}
              description={question.description}
              instructions={question.instructions}
              type={question.type}
              config={question.config}
            />
          </div>
        </FormCard>
      ))}
    </div>
  );
};
