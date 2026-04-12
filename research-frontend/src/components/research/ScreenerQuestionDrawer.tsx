/**
 * Screener Question Drawer
 *
 * Replicates the Screener module UI pattern inside a drawer for screening questions
 * in Research Configuration. Uses the same header layout (question input + choice type select)
 * and RadioChoicesEditor with Qualify/Disqualify eligibility.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { X } from 'lucide-react';
import { Input } from '../ui/Input';
import { CustomSelect } from '../ui/CustomSelect';
import { Button } from '../ui/Button';
import { Trash2, Plus } from 'lucide-react';

interface ScreeningOption {
  id: string;
  name: string;
  isQualified: boolean;
  isCustom?: boolean;
}

interface ScreenerQuestionDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (questionLabel: string, options: ScreeningOption[], disqualified: string[]) => void;
  /** Current question label */
  questionLabel?: string;
  currentOptions?: ScreeningOption[];
  currentDisqualified?: string[];
}

type ChoiceItem = {
  id: string;
  label: string;
  eligibility: 'Qualify' | 'Disqualify';
};

const CHOICE_TYPE_OPTIONS = [
  { value: 'single', label: 'Single Choice' },
  { value: 'multiple', label: 'Multiple Choice' },
];

function buildInitialChoices(currentOptions?: ScreeningOption[], currentDisqualified?: string[]): ChoiceItem[] {
  if (currentOptions && currentOptions.length > 0) {
    const disqualifiedSet = new Set(currentDisqualified || []);
    return currentOptions.map((opt) => ({
      id: opt.id,
      label: opt.name,
      eligibility: disqualifiedSet.has(opt.id) ? 'Disqualify' : 'Qualify',
    }));
  }
  return [
    { id: 'opt-1', label: 'Option 1', eligibility: 'Qualify' },
    { id: 'opt-2', label: 'Option 2', eligibility: 'Qualify' },
  ];
}

export const ScreenerQuestionDrawer: React.FC<ScreenerQuestionDrawerProps> = ({
  isOpen,
  onClose,
  onSave,
  questionLabel: initialLabel = '',
  currentOptions,
  currentDisqualified,
}) => {
  const [label, setLabel] = useState(initialLabel);
  const [choiceType, setChoiceType] = useState('single');
  const [localChoices, setLocalChoices] = useState<ChoiceItem[]>(
    () => {
      const initial = buildInitialChoices(currentOptions, currentDisqualified);
      // Pad to 3 if fewer (default 3 options)
      while (initial.length < 3) {
        initial.push({
          id: `opt-${Date.now()}-${initial.length}`,
          label: `Option ${initial.length + 1}`,
          eligibility: 'Qualify',
        });
      }
      return initial;
    }
  );

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setLabel(initialLabel);
      setChoiceType('single');
      const initial = buildInitialChoices(currentOptions, currentDisqualified);
      // Pad to 3 if fewer (default 3 options)
      while (initial.length < 3) {
        initial.push({
          id: `opt-${Date.now()}-${initial.length}`,
          label: `Option ${initial.length + 1}`,
          eligibility: 'Qualify',
        });
      }
      setLocalChoices(initial);
    }
  }, [isOpen, initialLabel, currentOptions, currentDisqualified]);

  const handleChoiceChange = useCallback((choiceId: string, field: 'label' | 'eligibility', newValue: string) => {
    setLocalChoices((prev) =>
      prev.map((c) => (c.id === choiceId ? { ...c, [field]: newValue } : c))
    );
  }, []);

  const handleAddChoice = useCallback(() => {
    setLocalChoices((prev) => [
      ...prev,
      {
        id: `opt-${Date.now()}`,
        label: `Option ${prev.length + 1}`,
        eligibility: 'Qualify',
      },
    ]);
  }, []);

  const handleDeleteChoice = useCallback((choiceId: string) => {
    setLocalChoices((prev) => {
      if (prev.length <= 2) return prev; // min 2
      return prev.filter((c) => c.id !== choiceId);
    });
  }, []);

  const handleSave = useCallback(() => {
    const allOptions: ScreeningOption[] = localChoices.map((c) => ({
      id: c.id,
      name: c.label,
      isQualified: c.eligibility === 'Qualify',
    }));

    const disqualifiedIds = localChoices
      .filter((c) => c.eligibility === 'Disqualify')
      .map((c) => c.id);

    onSave(label.trim() || 'Screening Question', allOptions, disqualifiedIds);
  }, [localChoices, label, onSave]);

  const qualifyingCount = localChoices.filter((c) => c.eligibility === 'Qualify').length;
  const isValid = qualifyingCount >= 2;

  const choiceGridClass =
    'grid grid-cols-[minmax(0,1fr)_minmax(10rem,11rem)_2.5rem] items-center gap-x-3 gap-y-0';

  return (
    <div
      className={`fixed inset-0 z-50 transition-all duration-300 ${
        isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
      }`}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Drawer panel */}
      <div
        className={`absolute right-0 top-0 h-full w-full max-w-2xl bg-white shadow-2xl transform transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              {label.trim() || 'New screening question'}
            </h2>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-6 py-6">
            <div className="space-y-6">
              {/* Screener Header: Question + Choice Type */}
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:gap-6">
                <div className="flex-1">
                  <Input
                    id="screener-question-label"
                    label="Question"
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    placeholder="e.g. How often do you use this product?"
                  />
                </div>
                <div className="sm:w-56">
                  <CustomSelect
                    id="screener-choice-type"
                    label="Choice Type"
                    value={choiceType}
                    onChange={setChoiceType}
                    options={CHOICE_TYPE_OPTIONS}
                  />
                </div>
              </div>

              {/* Options */}
              <div className="space-y-4">
                <label className="block text-sm font-medium text-gray-700">
                  Options
                </label>
                <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
                  {/* Table header */}
                  <div className={choiceGridClass + ' border-b border-gray-200 bg-gray-50/80 px-3 py-2'}>
                    <span className="text-xs font-semibold uppercase tracking-wide text-gray-600">Option</span>
                    <span className="text-xs font-semibold uppercase tracking-wide text-gray-600">Eligibility</span>
                    <span className="sr-only">Actions</span>
                  </div>

                  {/* Options rows */}
                  <div className="divide-y divide-gray-100">
                    {localChoices.map((choice) => {
                      const canDelete = localChoices.length > 2;
                      return (
                        <div
                          key={choice.id}
                          className={choiceGridClass + ' min-h-[3rem] px-3 py-2'}
                        >
                          <div className="min-w-0 self-center">
                            <Input
                              id={`choice-${choice.id}-label`}
                              label=""
                              value={choice.label}
                              onChange={(e) => handleChoiceChange(choice.id, 'label', e.target.value)}
                              placeholder="Enter option text..."
                            />
                          </div>
                          <div className="min-w-0 self-center">
                            <CustomSelect
                              id={`choice-${choice.id}-eligibility`}
                              label=""
                              value={choice.eligibility}
                              onChange={(val) => handleChoiceChange(choice.id, 'eligibility', val)}
                              options={[
                                { value: 'Qualify', label: 'Qualify' },
                                { value: 'Disqualify', label: 'Disqualify' },
                              ]}
                            />
                          </div>
                          <div className="flex justify-end self-center">
                            <button
                              type="button"
                              onClick={() => handleDeleteChoice(choice.id)}
                              disabled={!canDelete}
                              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded p-2 transition-colors ${
                                canDelete
                                  ? 'text-red-600 hover:bg-red-50'
                                  : 'cursor-not-allowed text-gray-400 opacity-50'
                              }`}
                              title={canDelete ? 'Delete option' : 'Minimum 2 options required'}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Add choice button */}
                  <div className="border-t border-gray-100 bg-gray-50/40 p-2">
                      <Button
                        onClick={handleAddChoice}
                        variant="outline"
                        className="w-full"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add another choice
                      </Button>
                    </div>
                </div>
              </div>

              {/* Summary */}
              <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
                <p className="text-sm text-blue-800">
                  <span className="font-medium">{qualifyingCount}</span> qualifying option{qualifyingCount !== 1 ? 's' : ''}
                </p>
                {!isValid && (
                  <p className="text-xs text-blue-600 mt-1">
                    You must have at least two qualifying options.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={!isValid}
            >
              Save question
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScreenerQuestionDrawer;
