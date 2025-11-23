import { Input } from '../ui/Input';
import { Toggle } from '../ui/Toggle';
import { CustomSelect } from '../ui/CustomSelect';
import type { ComponentConfig, SelectRangeConfig } from '../../types/moduleBuilder.types';

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

        // Helper to update selectRange while preserving required fields
        const updateSelectRange = (updates: Partial<SelectRangeConfig>) => {
            const base: SelectRangeConfig = {
                type: rangeType,
                ...(rangeType === 'custom'
                    ? { custom: { min: customMin, max: customMax }, startLabel, endLabel }
                    : { predefined: predefinedValue })
            };
            onUpdate({ selectRange: { ...base, ...updates } });
        };

        return (
            <div className="space-y-3">
                <CustomSelect
                    id={`range-type-${component.id}`}
                    label="Range Type"
                    value={rangeType}
                    onChange={(value) => {
                        const newType = value as 'predefined' | 'custom';
                        onUpdate({
                            selectRange: {
                                type: newType,
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
                                selectRange: { type: 'predefined', predefined: value as '1-5' | '1-7' | '1-10' },
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

    // File Upload: Max size configuration
    const renderFileUploadConfig = () => {
        const maxSizeMB = component.fileUpload?.maxSizeMB ?? 5;

        return (
            <div className="space-y-3">
                <CustomSelect
                    id={`max-size-${component.id}`}
                    label="Maximum File Size"
                    value={maxSizeMB.toString()}
                    onChange={(value) => {
                        onUpdate({
                            fileUpload: {
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
            </div>
        );
    };

    // Render configuration based on component type
    const renderTypeSpecificConfig = () => {
        // If editableFields is defined, check if specific config sections are allowed
        const canEditPlaceholder = !component.editableFields || component.editableFields.includes('placeholder');
        const canEditSelectRange = !component.editableFields || component.editableFields.includes('selectRange');
        const canEditFileUpload = !component.editableFields || component.editableFields.includes('fileUpload');

        switch (component.type) {
            case 'input':
            case 'textarea':
                return canEditPlaceholder ? renderPlaceholderConfig() : null;
            case 'select':
                return canEditSelectRange ? renderSelectRangeConfig() : null;
            case 'file-upload':
                return canEditFileUpload ? renderFileUploadConfig() : null;
            default:
                return null;
        }
    };

    const config = renderTypeSpecificConfig();

    if (!config) return null;

    return (
        <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <h4 className="text-sm font-medium text-gray-700 mb-3">Component Settings</h4>
            {config}
        </div>
    );
};
