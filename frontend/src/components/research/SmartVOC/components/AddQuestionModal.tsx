import React, { useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/Dialog';

import { UI_TEXTS } from '../constants';
import { QUESTION_TEMPLATES, createQuestionFromTemplate, getAvailableQuestionTypes } from '../templates';
import { QuestionType } from 'shared/interfaces/question-types.enum';
import { SmartVOCQuestion } from '@/api/domains/smart-voc';

interface AddQuestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddQuestion: (question: SmartVOCQuestion) => void;
  existingQuestionTypes: QuestionType[];
}

export const AddQuestionModal: React.FC<AddQuestionModalProps> = ({
  isOpen,
  onClose,
  onAddQuestion,
  existingQuestionTypes
}) => {
  const [selectedType, setSelectedType] = useState<QuestionType | null>(null);
  const [instructions, setInstructions] = useState('');

  if (!isOpen) {return null;}

  // Obtener tipos de preguntas disponibles (que no se hayan agregado ya)
  const availableQuestionTypes = getAvailableQuestionTypes(existingQuestionTypes);

  const handleAddQuestion = () => {
    if (!selectedType) {return;}

    const questionTemplate = createQuestionFromTemplate(selectedType, instructions);
    onAddQuestion(questionTemplate);

    // Resetear estado
    setSelectedType(null);
    setInstructions('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{UI_TEXTS.ADD_QUESTION_MODAL.TITLE}</DialogTitle>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <p className="text-sm text-neutral-500">
            {UI_TEXTS.ADD_QUESTION_MODAL.DESCRIPTION}
          </p>

          {availableQuestionTypes.length === 0 ? (
            <div className="p-4 bg-amber-50 rounded-md">
              <p className="text-sm text-amber-800">Ya has añadido todos los tipos de preguntas disponibles.</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4">
                {availableQuestionTypes.map((questionType) => {
                  const template = QUESTION_TEMPLATES[questionType];
                  if (!template) {
                    return null;
                  }
                  return (
                    <div
                      key={questionType}
                      onClick={() => setSelectedType(questionType)}
                      className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                        selectedType === questionType
                          ? 'border-blue-500 bg-blue-50'
                          : 'hover:border-blue-300 hover:bg-blue-50/50'
                      }`}
                    >
                      <h3 className="font-medium">{template.title}</h3>
                      <p className="text-sm text-neutral-500 mt-1">{template.description}</p>
                    </div>
                  );
                })}
              </div>

              {selectedType && (
                <div className="mt-4">
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    {UI_TEXTS.QUESTIONS.INSTRUCTIONS_LABEL}
                  </label>
                  <textarea
                    className="w-full px-3 py-2 border border-neutral-300 rounded-md resize-y min-h-[80px]"
                    value={instructions}
                    onChange={(e) => setInstructions(e.target.value)}
                    placeholder={UI_TEXTS.QUESTIONS.INSTRUCTIONS_PLACEHOLDER}
                  />
                </div>
              )}
            </>
          )}
        </div>
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={onClose}
          >
            {UI_TEXTS.ADD_QUESTION_MODAL.CLOSE_BUTTON}
          </Button>
          <Button
            onClick={handleAddQuestion}
            disabled={!selectedType || availableQuestionTypes.length === 0}
          >
            {UI_TEXTS.ADD_QUESTION_MODAL.ADD_BUTTON}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
