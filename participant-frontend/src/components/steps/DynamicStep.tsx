import React, { useState } from 'react';
import type { ModuleConfig } from '../../types/module';
import { InputRenderer, TextareaRenderer } from '../renderers';

interface DynamicStepProps {
    module: ModuleConfig;
}

export const DynamicStep: React.FC<DynamicStepProps> = ({ module }) => {
    const [formData, setFormData] = useState<Record<string, string>>({});

    const handleChange = (componentId: string, value: string) => {
        setFormData(prev => ({
            ...prev,
            [componentId]: value
        }));
    };

    // Sort components by order
    const sortedComponents = [...module.structure.components].sort((a, b) => a.order - b.order);

    // Separate display-only components from interactive ones
    const displayOnlyIds = ['title', 'message', 'instructions'];

    return (
        <div className="flex flex-col items-center justify-center min-h-[400px] px-4 py-8">
            <div className="w-full max-w-2xl space-y-6">
                {sortedComponents.map((component) => {
                    const value = formData[component.id] || component.defaultValue || '';

                    // Render display-only components (title, message, instructions)
                    if (displayOnlyIds.includes(component.id)) {
                        if (component.id === 'title') {
                            return (
                                <h1 key={component.id} className="text-3xl font-bold text-gray-900 text-center">
                                    {component.defaultValue}
                                </h1>
                            );
                        }
                        if (component.id === 'message') {
                            return (
                                <p key={component.id} className="text-lg text-gray-600 text-center max-w-2xl">
                                    {component.defaultValue}
                                </p>
                            );
                        }
                        if (component.id === 'instructions') {
                            return (
                                <p key={component.id} className="text-sm text-gray-500 text-center italic">
                                    {component.defaultValue}
                                </p>
                            );
                        }
                    }

                    // Render interactive components
                    switch (component.type) {
                        case 'input':
                            return (
                                <InputRenderer
                                    key={component.id}
                                    component={component}
                                    value={value}
                                    onChange={(val) => handleChange(component.id, val)}
                                />
                            );
                        case 'textarea':
                            return (
                                <TextareaRenderer
                                    key={component.id}
                                    component={component}
                                    value={value}
                                    onChange={(val) => handleChange(component.id, val)}
                                />
                            );
                        default:
                            return (
                                <div key={component.id} className="text-sm text-gray-400">
                                    Renderer for type "{component.type}" not implemented yet
                                </div>
                            );
                    }
                })}
            </div>
        </div>
    );
};
