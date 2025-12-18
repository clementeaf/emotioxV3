import React, { useMemo, useCallback } from 'react';
import type { ModuleConfig } from '../../types/module';
import { SmartVOCRenderer } from '../renderers/SmartVOCRenderer';
import { CognitiveTaskRenderer } from '../renderers/CognitiveTaskRenderer';
import { InputRenderer, TextareaRenderer } from '../renderers';
import { useParticipantStore } from '../../stores/useParticipantStore';
import { getComponentText, toStableString } from '../../utils/moduleComponent';

interface DynamicStepProps {
    module: ModuleConfig;
    onComplete?: () => void;
}

export const DynamicStep: React.FC<DynamicStepProps> = ({ module, onComplete }) => {
    const { getResponse, saveResponse } = useParticipantStore();

    /**
     * Obtiene el valor de una respuesta previa o el valor por defecto
     * @param componentId - ID del componente
     * @returns Valor de la respuesta o valor por defecto
     */
    const getComponentValue = useCallback((componentId: string): string => {
        const response = getResponse(module.id, componentId);
        if (response && typeof response.value === 'string') {
            return response.value;
        }
        return '';
    }, [module.id, getResponse]);

    /**
     * Maneja el cambio de valor de un componente
     * @param componentId - ID del componente
     * @param value - Nuevo valor
     */
    const handleChange = useCallback((componentId: string, value: string): void => {
        saveResponse(module.id, componentId, value);
    }, [module.id, saveResponse]);

    /**
     * Gets the initial value to display for a module component when the participant has not answered it yet.
     * Prefers backend-provided component.value and falls back to component.defaultValue.
     * @param value - Component value provided by backend (optional)
     * @param defaultValue - Component default value
     * @returns Display value
     */
    const getInitialDisplayValue = useCallback((componentValue: unknown, component: { settings?: { defaultValue?: string }; defaultValue?: string }): string => {
        const fromValue = toStableString(componentValue);
        if (fromValue.trim().length > 0) return fromValue;

        const fromSettings = typeof component.settings?.defaultValue === 'string' ? component.settings.defaultValue : '';
        if (fromSettings.trim().length > 0) return fromSettings;

        const fromLegacyDefault = typeof component.defaultValue === 'string' ? component.defaultValue : '';
        if (fromLegacyDefault.trim().length > 0) return fromLegacyDefault;

        return '';
    }, []);

    // Check if this is a SmartVOC module
    const isSmartVOC = useMemo(() =>
        module.name.includes('CSAT') ||
        module.name.includes('NPS') ||
        module.name.includes('CES') ||
        module.name.includes('CV') ||
        module.name.includes('NEV') ||
        module.name.includes('VOC'),
        [module.name]
    );

    // Check if this is a Cognitive Task module
    const isCognitiveTask = useMemo(() =>
        module.name === 'Short Text' ||
        module.name === 'Long Text' ||
        module.name === 'Single Choice' ||
        module.name === 'Multiple Choice' ||
        module.name === 'Linear Scale' ||
        module.name === 'Ranking' ||
        module.name === 'Navigation Flow' ||
        module.name === 'Preference Test',
        [module.name]
    );

    // Memoize sorted components
    const sortedComponents = useMemo(() => {
        return [...module.structure.components].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    }, [module.structure.components]);

    // Memoize display only IDs (components that should not be rendered as inputs)
    // start_button_text is used for button text but should not be displayed as an input
    const displayOnlyIds = useMemo(() => ['title', 'message', 'instructions', 'start_button_text', 'start-button-text'], []);

    // If SmartVOC, use specialized renderer
    if (isSmartVOC) {
        return <SmartVOCRenderer module={module} onComplete={onComplete} />;
    }

    // If Cognitive Task, use specialized renderer
    if (isCognitiveTask) {
        return <CognitiveTaskRenderer module={module} onComplete={onComplete} />;
    }

    // Otherwise, use generic dynamic rendering (for Welcome, Thank You, etc.)

    return (
        <div className="flex flex-col items-center justify-center min-h-[400px] px-4 py-8">
            <div className="w-full max-w-2xl space-y-6">
                {sortedComponents.map((component) => {
                    const savedValue = getComponentValue(component.id);
                    const value = savedValue || getInitialDisplayValue(component.value, component);

                    // Skip start_button_text - it's used for button text but not displayed
                    if (component.id === 'start_button_text' || component.id === 'start-button-text') {
                        return null;
                    }

                    // Render display-only components
                    if (displayOnlyIds.includes(component.id)) {
                        const displayValue = getComponentText(component);
                        if (component.id === 'title') {
                            return (
                                <h1 key={component.id} className="text-3xl font-bold text-gray-900 text-center">
                                    {displayValue || module.name}
                                </h1>
                            );
                        }
                        if (component.id === 'message') {
                            return (
                                <p key={component.id} className="text-lg text-gray-600 text-center max-w-2xl">
                                    {displayValue || module.description}
                                </p>
                            );
                        }
                        if (component.id === 'instructions') {
                            return (
                                <p key={component.id} className="text-sm text-gray-500 text-center italic">
                                    {displayValue}
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
