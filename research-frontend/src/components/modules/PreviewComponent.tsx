import { useState } from 'react';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { CustomSelect } from '../ui/CustomSelect';
import { ScaleRating } from '../ui/ScaleRating';
import { Checkbox } from '../ui/Checkbox';
import { FileUpload } from '../ui/FileUpload';
import type { ComponentConfig } from '../../types/moduleBuilder.types';

interface PreviewComponentProps {
    component: ComponentConfig;
}

export const PreviewComponent = ({ component }: PreviewComponentProps) => {
    const [selectValue, setSelectValue] = useState<string>('');

    // Generate range options for select components
    const generateRangeOptions = () => {
        if (!component.selectRange) return [];

        if (component.selectRange.type === 'predefined') {
            const range = component.selectRange.predefined || '1-5';
            const [min, max] = range.split('-').map(Number);
            return Array.from({ length: max - min + 1 }, (_, i) => ({
                value: String(min + i),
                label: String(min + i),
            }));
        } else if (component.selectRange.type === 'custom' && component.selectRange.custom) {
            const { min, max } = component.selectRange.custom;
            return Array.from({ length: max - min + 1 }, (_, i) => ({
                value: String(min + i),
                label: String(min + i),
            }));
        }

        return [];
    };

    // Render component based on type
    switch (component.type) {
        case 'input':
            return (
                <Input
                    id={`preview-${component.id}`}
                    label={component.label}
                    placeholder={
                        component.placeholder?.enabled
                            ? component.placeholder.text || 'Enter your response...'
                            : undefined
                    }
                />
            );

        case 'textarea':
            return (
                <Textarea
                    id={`preview-${component.id}`}
                    label={component.label}
                    placeholder={
                        component.placeholder?.enabled
                            ? 'Enter your detailed response...'
                            : undefined
                    }
                />
            );

        case 'select':
            if (component.selectRange?.variant === 'scale' && component.selectRange.custom) {
                return (
                    <ScaleRating
                        id={`preview-${component.id}`}
                        label={component.label}
                        min={component.selectRange.custom.min}
                        max={component.selectRange.custom.max}
                        startLabel={component.selectRange.startLabel}
                        endLabel={component.selectRange.endLabel}
                        value={selectValue}
                        onChange={setSelectValue}
                    />
                );
            }

            return (
                <CustomSelect
                    id={`preview-${component.id}`}
                    label={component.label}
                    options={component.options || generateRangeOptions()}
                    placeholder="Select an option"
                    value={selectValue}
                    onChange={setSelectValue}
                />
            );

        case 'checkbox':
            return (
                <Checkbox
                    id={`preview-${component.id}`}
                    label={component.label}
                />
            );

        case 'radio':
            return (
                <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                        {component.label}
                    </label>
                    <div className="space-y-2">
                        {(component.options || []).map((option, index) => (
                            <div key={index} className="flex items-center">
                                <input
                                    type="radio"
                                    id={`preview-${component.id}-${index}`}
                                    name={`preview-${component.id}`}
                                    className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                                />
                                <label
                                    htmlFor={`preview-${component.id}-${index}`}
                                    className="ml-2 text-sm text-gray-700"
                                >
                                    {option.label}
                                </label>
                            </div>
                        ))}
                    </div>
                </div>
            );

        case 'file-upload':
            return (
                <FileUpload
                    id={`preview-${component.id}`}
                    label={component.label}
                    maxSizeMB={component.fileUpload?.maxSizeMB || 5}
                    acceptedFormats="Images, PDFs, Documents"
                />
            );

        default:
            return (
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <p className="text-sm text-gray-500">
                        Unknown component type: {component.type}
                    </p>
                </div>
            );
    }
};
