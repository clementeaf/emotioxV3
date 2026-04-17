import { useState, useEffect, useRef } from 'react';
import { Input } from '../ui/Input';
import { CustomSelect } from '../ui/CustomSelect';
import { Button } from '../ui/Button';
import { Trash2, Plus } from 'lucide-react';
import type { ComponentConfig } from '../../types/moduleBuilder.types';

export interface RadioChoicesEditorProps {
    component: ComponentConfig;
    value: string;
    onChange: (value: string) => void;
    /** Screener: Single Choice — one option row, no add/delete/randomize */
    singleChoiceLocked?: boolean;
    /** Screener: Multiple Choice — default minimum option rows (e.g. 3) */
    screenerMultipleChoiceMinOptions?: number;
}

type ChoiceItem = {
    id: string;
    label: string;
    value?: string;
    eligibility?: 'Qualify' | 'Disqualify';
};

/**
 * Editor especial para componentes radio con choices array
 */
export const RadioChoicesEditor = ({
    component,
    value,
    onChange,
    singleChoiceLocked = false,
    screenerMultipleChoiceMinOptions,
}: RadioChoicesEditorProps) => {
    // Build sensible initial choices: from saved value, settings.choices, or seed defaults
    const buildInitialChoices = (): ChoiceItem[] => {
        // 1. Try parsing saved value
        if (value) {
            try {
                const parsed = JSON.parse(value);
                if (Array.isArray(parsed) && parsed.length > 0) return parsed as ChoiceItem[];
            } catch { /* not JSON */ }
        }
        // 2. Try settings.choices (legacy)
        if (Array.isArray(component.settings?.choices) && component.settings.choices.length > 0) {
            return component.settings.choices as ChoiceItem[];
        }
        // 3. Seed with minOptions empty choices so the editor is not blank
        const baseMin = (component.settings?.minOptions as number) || 2;
        const min = singleChoiceLocked
            ? 1
            : (screenerMultipleChoiceMinOptions ?? baseMin);
        const defaults: ChoiceItem[] = [];
        for (let i = 0; i < min; i++) {
            defaults.push({ id: `choice-${i + 1}`, label: '', value: `option-${i + 1}`, eligibility: 'Qualify' });
        }
        return defaults;
    };

    const [localChoices, setLocalChoices] = useState<ChoiceItem[]>(buildInitialChoices);
    const prevMultipleModeRef = useRef<boolean>(false);

    // Sync with external value changes (trim to one row when Screener Single Choice)
    useEffect(() => {
        if (value) {
            try {
                const parsed = JSON.parse(value);
                if (Array.isArray(parsed)) {
                    let arr = parsed as ChoiceItem[];
                    if (singleChoiceLocked && arr.length > 1) {
                        arr = [arr[0]];
                        onChange(JSON.stringify(arr));
                    }
                    setLocalChoices(arr);
                }
            } catch {
                // Invalid JSON, keep current state
            }
        }
    }, [value, singleChoiceLocked, onChange]);

    useEffect(() => {
        if (!singleChoiceLocked) {
            return;
        }
        setLocalChoices((prev) => {
            if (prev.length <= 1) {
                return prev;
            }
            const trimmed = [prev[0]];
            onChange(JSON.stringify(trimmed));
            return trimmed;
        });
    }, [singleChoiceLocked, onChange]);

    useEffect(() => {
        const isMultiple = screenerMultipleChoiceMinOptions === 3;
        const becameMultiple = isMultiple && !prevMultipleModeRef.current;
        prevMultipleModeRef.current = isMultiple;
        if (singleChoiceLocked || !isMultiple || !becameMultiple) {
            return;
        }
        setLocalChoices((prev) => {
            if (prev.length >= 3) {
                return prev;
            }
            const need = 3 - prev.length;
            const next = [...prev];
            for (let i = 0; i < need; i++) {
                next.push({
                    id: `choice-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 9)}`,
                    label: '',
                    value: `option-${next.length + 1}`,
                    eligibility: 'Qualify',
                });
            }
            onChange(JSON.stringify(next));
            return next;
        });
    }, [singleChoiceLocked, screenerMultipleChoiceMinOptions, onChange]);

    const handleChoiceChange = (choiceId: string, field: 'label' | 'eligibility', newValue: string) => {
        const updated = localChoices.map((choice) =>
            choice.id === choiceId ? { ...choice, [field]: newValue } : choice
        );
        setLocalChoices(updated);
        onChange(JSON.stringify(updated));
    };

    const handleAddChoice = () => {
        if (singleChoiceLocked) {
            return;
        }
        const newChoice: ChoiceItem = {
            id: `choice-${Date.now()}`,
            label: `Option ${localChoices.length + 1}`,
            value: `option-${localChoices.length + 1}`,
            eligibility: 'Qualify'
        };
        const updated = [...localChoices, newChoice];
        setLocalChoices(updated);
        onChange(JSON.stringify(updated));
    };

    const handleDeleteChoice = (choiceId: string) => {
        if (singleChoiceLocked) {
            return;
        }
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
                    const canDelete = localChoices.length > 2 && !singleChoiceLocked;
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
                {!singleChoiceLocked && (
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
                )}
            </div>
        </div>
    );
};
