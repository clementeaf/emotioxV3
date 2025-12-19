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
     * Checks if a component is the start_button_text component that should be hidden
     * @param component - Component to check
     * @returns true if component should be filtered out
     */
    const isStartButtonComponent = useCallback((component: { id?: string; label?: string; name?: string; type?: string }): boolean => {
        const id = component.id?.toLowerCase() || '';
        const label = component.label?.toLowerCase() || '';
        const name = component.name?.toLowerCase() || '';
        const type = component.type?.toLowerCase() || '';
        
        // Check by ID (exact match or contains)
        if (id === 'start_button_text' || 
            id === 'start-button-text' ||
            id.includes('start_button_text') ||
            id.includes('start-button-text') ||
            id.includes('startbuttontext')) {
            return true;
        }
        
        // Check by label/name (more flexible matching)
        // Match "start button text" or "start button" in any variation
        if (label.includes('start button') || 
            name.includes('start button') ||
            label === 'start button text' ||
            name === 'start button text' ||
            label.includes('startbutton') ||
            name.includes('startbutton')) {
            return true;
        }
        
        // Additional check: if it's an input with "button" and "text" in the label, it's likely the start button text
        if (type === 'input' && (label.includes('button') && label.includes('text'))) {
            return true;
        }
        
        return false;
    }, []);
    
    // Log module details when it's Welcome Screen
    React.useEffect(() => {
        if (module.name === 'Welcome Screen') {
            console.log('[DynamicStep] Welcome Screen module received:', module);
            console.log('[DynamicStep] Module structure:', module.structure);
            console.log('[DynamicStep] Module components:', module.structure?.components?.map(c => ({
                id: c.id,
                type: c.type,
                label: c.label,
                name: c.name,
                value: c.value,
                defaultValue: c.defaultValue,
                settings: c.settings
            })));
        }
    }, [module]);

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

    // Filter out start_button_text components before rendering
    const filteredComponents = useMemo(() => {
        console.log('[DynamicStep] All components before filtering:', sortedComponents.map(c => ({ 
            id: c.id, 
            type: c.type, 
            label: c.label, 
            name: c.name,
            fullComponent: c
        })));
        const filtered = sortedComponents.filter(component => {
            const shouldFilter = isStartButtonComponent(component);
            
            if (shouldFilter) {
                console.warn('[DynamicStep] ⚠️ FILTERING OUT start_button_text component:', {
                    id: component.id,
                    label: component.label,
                    name: component.name,
                    type: component.type,
                    fullComponent: component
                });
            } else {
                // Log components that are NOT being filtered (for debugging)
                const id = component.id?.toLowerCase() || '';
                const label = component.label?.toLowerCase() || '';
                const name = component.name?.toLowerCase() || '';
                if (id.includes('button') || label.includes('button') || name.includes('button')) {
                    console.log('[DynamicStep] Component with "button" in id/label/name but NOT filtered:', {
                        id: component.id,
                        label: component.label,
                        name: component.name,
                        type: component.type
                    });
                }
            }
            return !shouldFilter;
        });
        console.log('[DynamicStep] Filtered components after filtering:', filtered.map(c => ({ id: c.id, type: c.type, label: c.label })));
        console.log('[DynamicStep] Total components:', sortedComponents.length, 'Filtered out:', sortedComponents.length - filtered.length, 'Remaining:', filtered.length);
        return filtered;
    }, [sortedComponents, isStartButtonComponent]);

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
                {filteredComponents.map((component) => {
                    const savedValue = getComponentValue(component.id);
                    const value = savedValue || getInitialDisplayValue(component.value, component);

                    // Render display-only components
                    if (displayOnlyIds.some(id => component.id.includes(id))) {
                        const displayValue = getComponentText(component);
                        if (component.id.includes('title')) {
                            return (
                                <h1 key={component.id} className="text-3xl font-bold text-gray-900 text-center">
                                    {displayValue || module.name}
                                </h1>
                            );
                        }
                        if (component.id.includes('message')) {
                            return (
                                <p key={component.id} className="text-lg text-gray-600 text-center max-w-2xl">
                                    {displayValue || module.description}
                                </p>
                            );
                        }
                        if (component.id.includes('instructions')) {
                            return (
                                <p key={component.id} className="text-sm text-gray-500 text-center italic">
                                    {displayValue}
                                </p>
                            );
                        }
                        // For other display-only components, don't render them
                        return null;
                    }

                    // Double-check: Never render start_button_text as input (safety check)
                    if (isStartButtonComponent(component)) {
                        console.error('[DynamicStep] ❌ ERROR: start_button_text component passed filter! This should not happen. Component:', {
                            id: component.id,
                            label: component.label,
                            name: component.name,
                            type: component.type,
                            fullComponent: component
                        });
                        return null;
                    }
                    
                    // Additional safety: check if component label contains "Start button text" (case insensitive)
                    const componentLabel = component.label?.toLowerCase() || '';
                    const componentName = component.name?.toLowerCase() || '';
                    if ((componentLabel.includes('start button text') || componentName.includes('start button text')) && component.type === 'input') {
                        console.error('[DynamicStep] ❌ ERROR: Found input component with "Start button text" label that passed all filters!', {
                            id: component.id,
                            label: component.label,
                            name: component.name,
                            type: component.type
                        });
                        return null;
                    }

                    // Final safety check before rendering input: if label contains "Start button text", don't render
                    if (component.type === 'input') {
                        const label = component.label?.toLowerCase() || '';
                        const name = component.name?.toLowerCase() || '';
                        if (label === 'start button text' || name === 'start button text' || 
                            (label.includes('start') && label.includes('button') && label.includes('text'))) {
                            console.error('[DynamicStep] ❌ BLOCKED: Input component with "Start button text" label attempted to render!', {
                                id: component.id,
                                label: component.label,
                                name: component.name,
                                type: component.type
                            });
                            return null;
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
