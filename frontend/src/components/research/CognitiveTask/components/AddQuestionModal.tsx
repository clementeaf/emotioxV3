import React from 'react';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/Dialog';

import { Question } from '../types';

interface QuestionType {
  id: string;
  label: string;
  description: string;
}

interface AddQuestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddQuestion: (type: Question['type']) => void;
}

// Definición de tipos de preguntas disponibles
const QUESTION_TYPES = [
  { id: 'short_text', label: 'Short Text', description: 'Short text' },
  { id: 'long_text', label: 'Long Text', description: 'Long text' },
  { id: 'single_choice', label: 'Single Choice', description: 'Pick one option' },
  { id: 'multiple_choice', label: 'Multiple Choice', description: 'Pick multiple options' },
  { id: 'linear_scale', label: 'Linear Scale', description: 'For numerical scale' },
  { id: 'ranking', label: 'Ranking', description: 'Rank options in order' },
  { id: 'navigation_flow', label: 'Navigation Flow', description: 'Navigation flow test' },
  { id: 'preference_test', label: 'Preference Test', description: 'A/B testing' }
];

export const AddQuestionModal: React.FC<AddQuestionModalProps> = ({
  isOpen,
  onClose,
  onAddQuestion
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Añadir nueva pregunta</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4 py-4">
          {QUESTION_TYPES.map((type) => (
            <button
              key={type.id}
              onClick={() => {
                onAddQuestion(type.id as Question['type']);
                onClose();
              }}
              className="flex flex-col items-start p-4 border border-neutral-200 rounded-lg hover:bg-neutral-50 transition-colors"
              type="button"
            >
              <h3 className="text-sm font-medium text-neutral-900">{type.label}</h3>
              <p className="text-xs text-neutral-500 mt-1">{type.description}</p>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}; 