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
                <label className="block text-sm font-normal text-gray-800 mb-2">
                    {component.label}
                    {component.required && <span className="text-red-500 ml-1">*</span>}
                </label>
            )}
            <div className="relative">
                <textarea
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={component.placeholder?.enabled ? component.placeholder.text : ''}
                    required={component.required}
                    maxLength={maxLength}
                    rows={5}
                    className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-base text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
                />
                {maxLength && (
                    <div className="absolute bottom-3 right-4 text-xs text-gray-500 pointer-events-none">
                        {value.length} / {maxLength}
                    </div>
                )}
            </div>
        </div>
    );
};
