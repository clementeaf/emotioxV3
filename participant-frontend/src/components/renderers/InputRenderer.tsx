import React from 'react';
import type { ModuleComponent } from '../../types/module';

interface InputRendererProps {
    component: ModuleComponent;
    value: string;
    onChange: (value: string) => void;
}

export const InputRenderer: React.FC<InputRendererProps> = ({ component, value, onChange }) => {
    return (
        <div className="w-full">
            {component.label && (
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    {component.label}
                    {component.required && <span className="text-red-500 ml-1">*</span>}
                </label>
            )}
            <input
                type="text"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={component.placeholder?.enabled ? component.placeholder.text : ''}
                required={component.required}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
        </div>
    );
};
