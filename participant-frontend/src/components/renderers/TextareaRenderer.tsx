import React from 'react';
import type { ModuleComponent } from '../../types/module';

interface TextareaRendererProps {
    component: ModuleComponent;
    value: string;
    onChange: (value: string) => void;
}

export const TextareaRenderer: React.FC<TextareaRendererProps> = ({ component, value, onChange }) => {
    const maxLength = component.settings?.maxLength as number | undefined;

    return (
        <div className="w-full">
            {component.label && (
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    {component.label}
                    {component.required && <span className="text-red-500 ml-1">*</span>}
                </label>
            )}
            <textarea
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={component.placeholder?.enabled ? component.placeholder.text : ''}
                required={component.required}
                maxLength={maxLength}
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
            />
            {maxLength && (
                <div className="text-xs text-gray-500 mt-1 text-right">
                    {value.length} / {maxLength}
                </div>
            )}
        </div>
    );
};
