import { useState, useEffect } from 'react';
import { Input } from '../ui/Input';
import { CustomSelect } from '../ui/CustomSelect';
import { Button } from '../ui/Button';
import { Trash2, Plus } from 'lucide-react';
import type { ComponentConfig } from '../../types/moduleBuilder.types';

export interface RadioChoicesEditorProps {
    component: ComponentConfig;
    value: string;
    onChange: (value: string) => void;
    /** @deprecated No-op, kept for call-site compat. Will be removed. */
    singleChoiceLocked?: boolean;
    /** @deprecated No-op, kept for call-site compat. Will be removed. */
    screenerMultipleChoiceMinOptions?: number;
}

type ChoiceItem = {
    id: string;
    label: string;
    value?: string;
    eligibility?: 'Qualify' | 'Disqualify';
};

const MIN_CHOICES = 2;

export const RadioChoicesEditor = ({
    component,
    value,
    onChange,
}: RadioChoicesEditorProps) => {
    const buildInitialChoices = (): ChoiceItem[] => {
        if (value) {
            try {
                const parsed = JSON.parse(value);
                if (Array.isArray(parsed) && parsed.length > 0) return parsed as ChoiceItem[];
            } catch { /* not JSON */ }
        }
        if (Array.isArray(component.settings?.choices) && component.settings.choices.length > 0) {
            return component.settings.choices as ChoiceItem[];
        }
        const min = Math.max((component.settings?.minOptions as number) || MIN_CHOICES, MIN_CHOICES);
        const defaults: ChoiceItem[] = [];
        for (let i = 0; i < min; i++) {
            defaults.push({ id: `choice-${i + 1}`, label: '', value: `option-${i + 1}`, eligibility: 'Qualify' });
        }
        return defaults;
    };

    const [localChoices, setLocalChoices] = useState<ChoiceItem[]>(buildInitialChoices);

    useEffect(() => {
        if (value) {
            try {
                const parsed = JSON.parse(value);
                if (Array.isArray(parsed)) {
                    setLocalChoices(parsed as ChoiceItem[]);
                }
            } catch {
                // Invalid JSON, keep current state
            }
        }
    }, [value]);

    const handleChoiceChange = (choiceId: string, field: 'label' | 'eligibility', newValue: string) => {
        const updated = localChoices.map((choice) =>
            choice.id === choiceId ? { ...choice, [field]: newValue } : choice
        );
        setLocalChoices(updated);
        onChange(JSON.stringify(updated));
    };

    const handleAddChoice = () => {
        const newChoice: ChoiceItem = {
            id: `choice-${Date.now()}`,
            label: '',
            value: `option-${localChoices.length + 1}`,
            eligibility: 'Qualify'
        };
        const updated = [...localChoices, newChoice];
        setLocalChoices(updated);
        onChange(JSON.stringify(updated));
    };

    const handleDeleteChoice = (choiceId: string) => {
        const updated = localChoices.filter((choice) => choice.id !== choiceId);
        setLocalChoices(updated);
        onChange(JSON.stringify(updated));
    };

    const choiceGridClass =
        'grid grid-cols-[minmax(0,1fr)_minmax(10rem,11rem)_2.5rem] items-center gap-x-3 gap-y-0';

    return (
        <div className="space-y-4">
            <label className="block text-sm font-medium text-gray-700">
                {component.label}
            </label>
            <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
                <div className={choiceGridClass + ' border-b border-gray-200 bg-gray-50/80 px-3 py-2'}>
                    <span className="text-xs font-semibold uppercase tracking-wide text-gray-600">Option</span>
                    <span className="text-xs font-semibold uppercase tracking-wide text-gray-600">Eligibility</span>
                    <span className="sr-only">Actions</span>
                </div>
                <div className="divide-y divide-gray-100">
                    {localChoices.map((choice) => {
                    const canDelete = localChoices.length > MIN_CHOICES;
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
                                value={choice.eligibility ?? 'Qualify'}
                                onChange={(val) => handleChoiceChange(choice.id, 'eligibility', val)}
                                options={[
                                    { value: 'Qualify', label: 'Qualify' },
                                    { value: 'Disqualify', label: 'Disqualify' }
                                ]}
                            />
                        </div>
                        <div className="flex justify-end self-center">
                        <button
                            type="button"
                            onClick={() => handleDeleteChoice(choice.id)}
                            disabled={!canDelete}
                            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded p-2 transition-colors ${canDelete ? 'text-red-600 hover:bg-red-50' : 'cursor-not-allowed text-gray-400 opacity-50'}`}
                            title={canDelete ? 'Delete option' : 'Minimum 2 options required'}
                        >
                            <Trash2 className="h-4 w-4" />
                        </button>
                        </div>
                    </div>
                    );
                })}
                </div>
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
    );
};
