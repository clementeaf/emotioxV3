import { Input } from '../ui/Input';
import { Toggle } from '../ui/Toggle';
import { CustomSelect } from '../ui/CustomSelect';
import { Button } from '../ui/Button';
import { Trash2, Plus } from 'lucide-react';
import type { ComponentConfig, SelectRangeConfig, ChoiceOption } from '../../types/moduleBuilder.types';

interface ComponentConfigPanelProps {
    component: ComponentConfig;
    onUpdate: (updates: Partial<ComponentConfig>) => void;
}

export const ComponentConfigPanel = ({ component, onUpdate }: ComponentConfigPanelProps) => {
    // Input & Textarea: Placeholder configuration
    const renderPlaceholderConfig = () => {
        const placeholderEnabled = component.placeholder?.enabled ?? false;

        return (
            <div className="space-y-3">
                <Toggle
                    id={`placeholder-toggle-${component.id}`}
                    label="Enable Placeholder"
                    description="Allow researchers to configure a placeholder for this field"
                    checked={placeholderEnabled}
                    onChange={(e) => {
                        onUpdate({
                            placeholder: {
                                enabled: e.target.checked,
                                text: '',
                            },
                        });
                    }}
                />
            </div>
        );
    };

    // Select: Range configuration
    const renderSelectRangeConfig = () => {
        const rangeType = component.selectRange?.type ?? 'predefined';
        const predefinedValue = component.selectRange?.predefined ?? '1-5';
        const customMin = component.selectRange?.custom?.min ?? 1;
        const customMax = component.selectRange?.custom?.max ?? 10;
        const startLabel = component.selectRange?.startLabel ?? '';
        const endLabel = component.selectRange?.endLabel ?? '';
        const variant = component.selectRange?.variant ?? 'dropdown';

        // Helper to update selectRange while preserving required fields
        const updateSelectRange = (updates: Partial<SelectRangeConfig>) => {
            const base: SelectRangeConfig = {
                type: rangeType,
                variant,
                ...(rangeType === 'custom'
                    ? { custom: { min: customMin, max: customMax }, startLabel, endLabel }
                    : { predefined: predefinedValue })
            };
            onUpdate({ selectRange: { ...base, ...updates } });
        };

        return (
            <div className="space-y-3">
                <CustomSelect
                    id={`variant-${component.id}`}
                    label="Display Type"
                    value={variant}
                    onChange={(value) => {
                        updateSelectRange({ variant: value as 'dropdown' | 'scale' | 'slider' });
                    }}
                    options={[
                        { value: 'dropdown', label: 'Dropdown' },
                        { value: 'scale', label: 'Scale (Buttons)' },
                        { value: 'slider', label: 'Slider (Horizontal)' },
                    ]}
                />
                <CustomSelect
                    id={`range-type-${component.id}`}
                    label="Range Type"
                    value={rangeType}
                    onChange={(value) => {
                        const newType = value as 'predefined' | 'custom';
                        onUpdate({
                            selectRange: {
                                type: newType,
                                variant,
                                ...(newType === 'custom'
                                    ? { custom: { min: customMin, max: customMax }, startLabel, endLabel }
                                    : { predefined: predefinedValue })
                            }
                        });
                    }}
                    options={[
                        { value: 'predefined', label: 'Predefined' },
                        { value: 'custom', label: 'Custom' },
                    ]}
                />
                {rangeType === 'predefined' ? (
                    <CustomSelect
                        id={`predefined-${component.id}`}
                        label="Predefined Range"
                        value={predefinedValue}
                        onChange={(value) => {
                            onUpdate({
                                selectRange: { 
                                    type: 'predefined', 
                                    predefined: value as '1-5' | '1-7' | '1-10',
                                    variant 
                                },
                            });
                        }}
                        options={[
                            { value: '1-5', label: '1-5' },
                            { value: '1-7', label: '1-7' },
                            { value: '1-10', label: '1-10' },
                        ]}
                    />
                ) : (
                    <>
                        <Input
                            id={`custom-min-${component.id}`}
                            label="Min Value"
                            type="number"
                            value={customMin.toString()}
                            onChange={(e) => {
                                const min = parseInt(e.target.value) || 1;
                                updateSelectRange({ custom: { min, max: customMax } });
                            }}
                        />
                        <Input
                            id={`custom-max-${component.id}`}
                            label="Max Value"
                            type="number"
                            value={customMax.toString()}
                            onChange={(e) => {
                                const max = parseInt(e.target.value) || 10;
                                updateSelectRange({ custom: { min: customMin, max } });
                            }}
                        />
                        <Input
                            id={`start-label-${component.id}`}
                            label="Start Label"
                            type="text"
                            value={startLabel}
                            onChange={(e) => {
                                updateSelectRange({ startLabel: e.target.value });
                            }}
                        />
                        <Input
                            id={`end-label-${component.id}`}
                            label="End Label"
                            type="text"
                            value={endLabel}
                            onChange={(e) => {
                                updateSelectRange({ endLabel: e.target.value });
                            }}
                        />
                    </>
                )}
            </div>
        );
    };

    // Choices: Configuration for choices component
    const renderChoicesConfig = () => {
        const choicesConfig = component.choicesConfig || {
            choiceType: 'single' as const,
            required: false,
            choices: [
                { id: crypto.randomUUID(), label: 'Option 1', eligibility: 'Qualify' as const },
                { id: crypto.randomUUID(), label: 'Option 2', eligibility: 'Disqualify' as const },
                { id: crypto.randomUUID(), label: 'Option 3', eligibility: 'Disqualify' as const },
            ],
            disqualifyRedirectUrl: '',
        };

        const hasDisqualifyOption = choicesConfig.choices.some(choice => choice.eligibility === 'Disqualify');

        const handleChoiceTypeChange = (value: string): void => {
            onUpdate({
                choicesConfig: {
                    ...choicesConfig,
                    choiceType: value as 'single' | 'multiple',
                },
            });
        };

        const handleChoiceLabelChange = (choiceId: string, label: string): void => {
            const updatedChoices = choicesConfig.choices.map((choice) =>
                choice.id === choiceId ? { ...choice, label } : choice
            );
            onUpdate({
                choicesConfig: {
                    ...choicesConfig,
                    choices: updatedChoices,
                },
            });
        };

        const handleChoiceEligibilityChange = (choiceId: string, eligibility: 'Qualify' | 'Disqualify'): void => {
            const updatedChoices = choicesConfig.choices.map((choice) =>
                choice.id === choiceId ? { ...choice, eligibility } : choice
            );
            onUpdate({
                choicesConfig: {
                    ...choicesConfig,
                    choices: updatedChoices,
                },
            });
        };

        const handleAddChoice = (): void => {
            const newChoice: ChoiceOption = {
                id: crypto.randomUUID(),
                label: `Option ${choicesConfig.choices.length + 1}`,
                eligibility: 'Qualify',
            };
            onUpdate({
                choicesConfig: {
                    ...choicesConfig,
                    choices: [...choicesConfig.choices, newChoice],
                },
            });
        };

        const handleDeleteChoice = (choiceId: string): void => {
            const updatedChoices = choicesConfig.choices.filter((choice) => choice.id !== choiceId);
            onUpdate({
                choicesConfig: {
                    ...choicesConfig,
                    choices: updatedChoices,
                },
            });
        };

        const handleDisqualifyUrlChange = (url: string): void => {
            onUpdate({
                choicesConfig: {
                    ...choicesConfig,
                    disqualifyRedirectUrl: url,
                },
            });
        };

        return (
            <div className="space-y-4">
                <CustomSelect
                    id={`choice-type-${component.id}`}
                    label=""
                    value={choicesConfig.choiceType}
                    onChange={handleChoiceTypeChange}
                    options={[
                        { value: 'single', label: 'Single choice' },
                        { value: 'multiple', label: 'Multiple choice' },
                    ]}
                />
                <div className="space-y-3">
                    <h4 className="text-sm font-medium text-gray-700">
                        Choices (Press ENTER for new line or paste a list)
                    </h4>
                    {choicesConfig.choices.map((choice, index) => {
                        const canDelete = choicesConfig.choices.length > 2;
                        return (
                            <div key={choice.id} className="flex items-end gap-3">
                                <div className="flex-1 min-w-0">
                                    <Input
                                        id={`choice-${choice.id}-label`}
                                        label=""
                                        value={choice.label}
                                        onChange={(e) => handleChoiceLabelChange(choice.id, e.target.value)}
                                        placeholder={`Option ${index + 1}`}
                                    />
                                </div>
                                <div className="w-40 min-w-0">
                                    <CustomSelect
                                        id={`choice-${choice.id}-eligibility`}
                                        label="Eligibility"
                                        value={choice.eligibility}
                                        onChange={(value) => handleChoiceEligibilityChange(choice.id, value as 'Qualify' | 'Disqualify')}
                                        options={[
                                            { value: 'Qualify', label: 'Qualify' },
                                            { value: 'Disqualify', label: 'Disqualify' },
                                        ]}
                                    />
                                </div>
                                <div className="mb-2.5 flex-shrink-0">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleDeleteChoice(choice.id)}
                                        disabled={!canDelete}
                                        className="text-red-500 hover:text-red-700 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed disabled:text-gray-400"
                                        title={!canDelete ? 'Choices requires a minimum of 2 alternatives' : 'Delete option'}
                                    >
                                        <Trash2 className="h-4 w-4 mr-1" />
                                        Delete
                                    </Button>
                                </div>
                            </div>
                        );
                    })}
                    {choicesConfig.choices.length === 2 && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                            <p className="text-sm text-blue-700">
                                Choices requires a minimum of 2 alternatives. You cannot delete more options.
                            </p>
                        </div>
                    )}
                    {hasDisqualifyOption && (
                        <div className="pt-2">
                            <Input
                                id={`disqualify-url-${component.id}`}
                                label="Disqualify Redirect URL"
                                value={choicesConfig.disqualifyRedirectUrl || ''}
                                onChange={(e) => handleDisqualifyUrlChange(e.target.value)}
                                placeholder="https://example.com/disqualified"
                                type="url"
                            />
                        </div>
                    )}
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
        );
    };

    // File Upload: Max size configuration
    const renderFileUploadConfig = () => {
        const maxSizeMB = component.fileUpload?.maxSizeMB ?? 5;
        const allowHitZones = component.fileUpload?.allowHitZones ?? false;
        const allowParticipantSelection = component.fileUpload?.allowParticipantSelection ?? false;

        return (
            <div className="space-y-3">
                <CustomSelect
                    id={`max-size-${component.id}`}
                    label="Maximum File Size"
                    value={maxSizeMB.toString()}
                    onChange={(value) => {
                        onUpdate({
                            fileUpload: {
                                ...component.fileUpload,
                                maxSizeMB: parseInt(value),
                            },
                        });
                    }}
                    options={[
                        { value: '1', label: '1 MB' },
                        { value: '5', label: '5 MB' },
                        { value: '10', label: '10 MB' },
                        { value: '20', label: '20 MB' },
                        { value: '50', label: '50 MB' },
                    ]}
                />
                <Toggle
                    id={`allow-hitzones-${component.id}`}
                    label="Enable HitZone Editing"
                    description="Allow researchers to assign hitzones on uploaded photos"
                    checked={allowHitZones}
                    onChange={(e) => {
                        onUpdate({
                            fileUpload: {
                                ...component.fileUpload,
                                maxSizeMB,
                                allowHitZones: e.target.checked,
                                allowParticipantSelection: e.target.checked ? false : allowParticipantSelection,
                            },
                        });
                    }}
                />
                <Toggle
                    id={`allow-participant-selection-${component.id}`}
                    label="Enable Participant Image Selection"
                    description="Allow participants to choose their preferred image from uploaded images"
                    checked={allowParticipantSelection}
                    onChange={(e) => {
                        onUpdate({
                            fileUpload: {
                                ...component.fileUpload,
                                maxSizeMB,
                                allowHitZones: e.target.checked ? false : allowHitZones,
                                allowParticipantSelection: e.target.checked,
                            },
                        });
                    }}
                />
            </div>
        );
    };

    // Render configuration based on component type
    const renderTypeSpecificConfig = () => {
        // If editableFields is defined, check if specific config sections are allowed
        const canEditPlaceholder = !component.editableFields || component.editableFields.includes('placeholder');
        const canEditSelectRange = !component.editableFields || component.editableFields.includes('selectRange');
        const canEditFileUpload = !component.editableFields || component.editableFields.includes('fileUpload');
        const canEditChoices = !component.editableFields || component.editableFields.includes('choicesConfig');

        switch (component.type) {
            case 'input':
            case 'textarea':
                return canEditPlaceholder ? renderPlaceholderConfig() : null;
            case 'select':
                return canEditSelectRange ? renderSelectRangeConfig() : null;
            case 'file-upload':
                return canEditFileUpload ? renderFileUploadConfig() : null;
            case 'choices':
                return canEditChoices ? renderChoicesConfig() : null;
            default:
                return null;
        }
    };

    const typeSpecificConfig = renderTypeSpecificConfig();

    if (!typeSpecificConfig) {
        return null;
    }

    return (
        <div className="space-y-4 min-w-0 overflow-hidden">
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 min-w-0 overflow-hidden">
                <h4 className="text-sm font-medium text-gray-700 mb-3">Component Settings</h4>
                <div className="min-w-0 overflow-hidden">
                    {typeSpecificConfig}
                </div>
            </div>
        </div>
    );
};
