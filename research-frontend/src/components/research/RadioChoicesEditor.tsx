import { useState, useEffect, useRef } from 'react';
import { Input } from '../ui/Input';
import { CustomSelect } from '../ui/CustomSelect';
import { Button } from '../ui/Button';
import { Trash2, Plus, ImagePlus, X } from 'lucide-react';
import type { ComponentConfig } from '../../types/moduleBuilder.types';
import { mediaService } from '../../services/media.service';

export interface RadioChoicesEditorProps {
    component: ComponentConfig;
    value: string;
    onChange: (value: string) => void;
    researchId?: string;
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
    image?: { s3Key: string; url?: string };
};

const MIN_CHOICES = 2;

export const RadioChoicesEditor = ({
    component,
    value,
    onChange,
    researchId,
}: RadioChoicesEditorProps) => {
    const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

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

    const persist = (choices: ChoiceItem[]) => {
        onChange(JSON.stringify(choices));
    };

    const handleChoiceChange = (choiceId: string, field: 'label' | 'eligibility', newValue: string) => {
        const updated = localChoices.map((choice) =>
            choice.id === choiceId ? { ...choice, [field]: newValue } : choice
        );
        setLocalChoices(updated);
        persist(updated);
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
        persist(updated);
    };

    const handleDeleteChoice = (choiceId: string) => {
        const updated = localChoices.filter((choice) => choice.id !== choiceId);
        setLocalChoices(updated);
        persist(updated);
    };

    const handleImageUpload = async (choiceId: string, file: File) => {
        if (!researchId) return;
        try {
            const { s3Key } = await mediaService.uploadFile(researchId, file);
            const { url } = await mediaService.getMediaUrl(s3Key);
            const updated = localChoices.map(choice =>
                choice.id === choiceId ? { ...choice, image: { s3Key, url } } : choice
            );
            setLocalChoices(updated);
            persist(updated);
        } catch (err) {
            console.error('Image upload failed:', err);
        }
    };

    const handleImageRemove = (choiceId: string) => {
        const updated = localChoices.map(choice =>
            choice.id === choiceId ? { ...choice, image: undefined } : choice
        );
        setLocalChoices(updated);
        persist(updated);
    };

    return (
        <div className="space-y-4">
            <label className="block text-sm font-medium text-gray-700">
                {component.label}
            </label>
            <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
                <div className="divide-y divide-gray-100">
                    {localChoices.map((choice) => {
                    const canDelete = localChoices.length > MIN_CHOICES;
                    return (
                    <div
                        key={choice.id}
                        className="flex items-center gap-3 px-3 py-2"
                    >
                        {choice.image?.url ? (
                            <div className="relative w-10 h-10 flex-shrink-0">
                                <img src={choice.image.url} alt="" className="w-10 h-10 rounded object-cover" />
                                <button
                                    onClick={() => handleImageRemove(choice.id)}
                                    className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center"
                                >
                                    <X className="h-2.5 w-2.5" />
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={() => fileInputRefs.current[choice.id]?.click()}
                                onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('border-blue-400', 'text-blue-500'); }}
                                onDragLeave={(e) => { e.currentTarget.classList.remove('border-blue-400', 'text-blue-500'); }}
                                onDrop={(e) => {
                                    e.preventDefault();
                                    e.currentTarget.classList.remove('border-blue-400', 'text-blue-500');
                                    const f = e.dataTransfer.files?.[0];
                                    if (f && f.type.startsWith('image/')) handleImageUpload(choice.id, f);
                                }}
                                className="w-10 h-10 flex-shrink-0 rounded border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400 hover:border-blue-400 hover:text-blue-500 transition-colors"
                                title="Add image"
                            >
                                <ImagePlus className="h-4 w-4" />
                                <input
                                    ref={el => { fileInputRefs.current[choice.id] = el; }}
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(e) => {
                                        const f = e.target.files?.[0];
                                        if (f) handleImageUpload(choice.id, f);
                                        e.target.value = '';
                                    }}
                                />
                            </button>
                        )}
                        <div className="flex-1 min-w-0">
                            <Input
                                id={`choice-${choice.id}-label`}
                                label=""
                                value={choice.label}
                                onChange={(e) => handleChoiceChange(choice.id, 'label', e.target.value)}
                                placeholder="Enter option text..."
                            />
                        </div>
                        <div className="w-36">
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
                        <button
                            type="button"
                            onClick={() => handleDeleteChoice(choice.id)}
                            disabled={!canDelete}
                            className={`p-2 rounded transition-colors ${canDelete ? 'text-red-600 hover:bg-red-50' : 'cursor-not-allowed text-gray-400 opacity-50'}`}
                            title={canDelete ? 'Delete option' : 'Minimum 2 options required'}
                        >
                            <Trash2 className="h-4 w-4" />
                        </button>
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
