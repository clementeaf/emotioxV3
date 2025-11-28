import { useState } from 'react';
import { X, Plus } from 'lucide-react';
import { Input } from '../ui/Input';
import { CustomSelect } from '../ui/CustomSelect';
import { Button } from '../ui/Button';
import type { ComponentConfig, ValidationRule, ComponentType } from '../../types/moduleBuilder.types';

interface ValidationConfigPanelProps {
    component: ComponentConfig;
    onUpdate: (updates: Partial<ComponentConfig>) => void;
}

const getAvailableRules = (componentType: ComponentType) => {
    const commonRules = [
        { value: 'required', label: 'Required' }
    ];

    if (componentType === 'input' || componentType === 'textarea') {
        return [
            ...commonRules,
            { value: 'minLength', label: 'Minimum Length' },
            { value: 'maxLength', label: 'Maximum Length' },
            { value: 'pattern', label: 'Pattern (Regex)' },
        ];
    }

    if (componentType === 'file-upload') {
        return [
            ...commonRules,
            { value: 'minFiles', label: 'Minimum Files' },
            { value: 'maxFiles', label: 'Maximum Files' },
        ];
    }

    return commonRules;
};

const getRuleLabel = (type: ValidationRule['type']): string => {
    const labels: Record<ValidationRule['type'], string> = {
        required: 'Required',
        minLength: 'Minimum Length',
        maxLength: 'Maximum Length',
        pattern: 'Pattern (Regex)',
        minFiles: 'Minimum Files',
        maxFiles: 'Maximum Files',
    };
    return labels[type];
};

const needsValue = (type: ValidationRule['type']): boolean => {
    return type !== 'required';
};

interface ValidationRuleItemProps {
    rule: ValidationRule;
    onUpdate: (updates: Partial<ValidationRule>) => void;
    onRemove: () => void;
}

const ValidationRuleItem = ({ rule, onUpdate, onRemove }: ValidationRuleItemProps) => {
    return (
        <div className="flex items-start gap-2 p-3 bg-white rounded border border-gray-200">
            <div className="flex-1 space-y-2">
                <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">
                        {getRuleLabel(rule.type)}
                    </span>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onRemove}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50 h-6 w-6 p-0"
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </div>

                {needsValue(rule.type) && (
                    <Input
                        id={`rule-value-${rule.type}`}
                        label={rule.type === 'pattern' ? 'Regex Pattern' : 'Value'}
                        type={rule.type === 'pattern' ? 'text' : 'number'}
                        value={rule.value?.toString() || ''}
                        onChange={(e) => {
                            const value = rule.type === 'pattern'
                                ? e.target.value
                                : parseInt(e.target.value) || 0;
                            onUpdate({ value });
                        }}
                        placeholder={
                            rule.type === 'pattern'
                                ? 'e.g., ^[a-zA-Z0-9]+$'
                                : 'Enter value'
                        }
                    />
                )}

                <Input
                    id={`rule-message-${rule.type}`}
                    label="Custom Error Message (Optional)"
                    value={rule.message || ''}
                    onChange={(e) => onUpdate({ message: e.target.value })}
                    placeholder={`e.g., This field ${rule.type === 'required' ? 'is required' : 'is invalid'}`}
                />
            </div>
        </div>
    );
};

export const ValidationConfigPanel = ({ component, onUpdate }: ValidationConfigPanelProps) => {
    const [rules, setRules] = useState<ValidationRule[]>(
        component.validation?.rules || []
    );
    const [selectedRuleType, setSelectedRuleType] = useState<string>('');

    const addRule = () => {
        if (!selectedRuleType) return;

        const newRule: ValidationRule = {
            type: selectedRuleType as ValidationRule['type'],
            ...(needsValue(selectedRuleType as ValidationRule['type']) && { value: '' })
        };

        const updatedRules = [...rules, newRule];
        setRules(updatedRules);
        onUpdate({ validation: { rules: updatedRules } });
        setSelectedRuleType('');
    };

    const updateRule = (index: number, updates: Partial<ValidationRule>) => {
        const updated = rules.map((rule, i) =>
            i === index ? { ...rule, ...updates } : rule
        );
        setRules(updated);
        onUpdate({ validation: { rules: updated } });
    };

    const removeRule = (index: number) => {
        const updated = rules.filter((_, i) => i !== index);
        setRules(updated);
        onUpdate({ validation: { rules: updated } });
    };

    const availableRules = getAvailableRules(component.type);
    const existingRuleTypes = rules.map(r => r.type);
    const availableToAdd = availableRules.filter(
        rule => !existingRuleTypes.includes(rule.value as ValidationRule['type'])
    );

    return (
        <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <h4 className="text-sm font-medium text-gray-700 mb-3">Validation Rules</h4>

            {/* List of current rules */}
            {rules.length > 0 && (
                <div className="space-y-2 mb-3">
                    {rules.map((rule, index) => (
                        <ValidationRuleItem
                            key={`${rule.type}-${index}`}
                            rule={rule}
                            onUpdate={(updates) => updateRule(index, updates)}
                            onRemove={() => removeRule(index)}
                        />
                    ))}
                </div>
            )}

            {/* Add rule section */}
            {availableToAdd.length > 0 && (
                <div className="flex gap-2">
                    <div className="flex-1">
                        <CustomSelect
                            id={`add-validation-${component.id}`}
                            label=""
                            value={selectedRuleType}
                            onChange={setSelectedRuleType}
                            options={availableToAdd}
                            placeholder="Select a rule to add..."
                        />
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={addRule}
                        disabled={!selectedRuleType}
                        className="mt-0"
                    >
                        <Plus className="h-4 w-4 mr-1" />
                        Add
                    </Button>
                </div>
            )}

            {rules.length === 0 && availableToAdd.length === 0 && (
                <p className="text-sm text-gray-500 italic">No validation rules available for this component type.</p>
            )}
        </div>
    );
};
