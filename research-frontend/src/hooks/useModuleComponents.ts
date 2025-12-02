import { useState, useEffect } from 'react';
import { moduleTemplatesService } from '../services/moduleTemplates.service';
import type { ComponentConfig } from '../types/moduleBuilder.types';
import type { Module } from '../services/research.service';

interface UseModuleComponentsResult {
    components: ComponentConfig[];
    componentValues: Record<string, string>;
    setComponentValues: React.Dispatch<React.SetStateAction<Record<string, string>>>;
}

/**
 * Hook personalizado para cargar componentes de un módulo
 * Busca componentes en: config.structure.components, config.components, questions, o template
 */
export const useModuleComponents = (activeModule: Module | null): UseModuleComponentsResult => {
    const [components, setComponents] = useState<ComponentConfig[]>([]);
    const [componentValues, setComponentValues] = useState<Record<string, string>>({});

    useEffect(() => {
        const loadComponents = async (): Promise<void> => {
            if (!activeModule) {
                setComponents([]);
                setComponentValues({});
                return;
            }

            try {
                let moduleComponents: ComponentConfig[] = [];

                // 1. Si el módulo tiene config.structure.components, usarlo
                if (activeModule.config && typeof activeModule.config === 'object') {
                    // Buscar en config.structure.components (formato nuevo)
                    if ('structure' in activeModule.config) {
                        const structure = activeModule.config.structure as { components?: ComponentConfig[] };
                        if (structure?.components && Array.isArray(structure.components) && structure.components.length > 0) {
                            moduleComponents = structure.components;
                        }
                    }
                    
                    // Si no se encontró, buscar en config.components directamente (formato antiguo o alternativo)
                    if (moduleComponents.length === 0 && 'components' in activeModule.config) {
                        const components = activeModule.config.components as ComponentConfig[];
                        if (Array.isArray(components) && components.length > 0) {
                            moduleComponents = components;
                        }
                    }
                }

                // 2. Si no tiene components en config pero tiene questions, convertir questions
                if (moduleComponents.length === 0 && activeModule.questions && activeModule.questions.length > 0) {
                    moduleComponents = activeModule.questions.map((question) => ({
                        id: question.id,
                        type: question.type as ComponentConfig['type'],
                        label: question.text,
                        ...(question.config && typeof question.config === 'object' ? question.config : {}),
                    }));
                }

                // 3. Si viene de un template y no tiene components, cargar desde el template
                if (moduleComponents.length === 0 && activeModule.is_from_template) {
                    try {
                        const templates = await moduleTemplatesService.list();
                        const template = templates.find(t => t.name === activeModule.name && t.is_active);
                        if (template && template.structure) {
                            const structure = template.structure as { components?: ComponentConfig[] };
                            if (structure?.components && Array.isArray(structure.components)) {
                                moduleComponents = structure.components;
                            }
                        }
                    } catch (err) {
                        console.error('Error loading template:', err);
                    }
                }

                setComponents(moduleComponents);
                
                // Inicializar valores de componentes
                // Para componentes readonly, usar defaultValue de settings
                const initialValues: Record<string, string> = {};
                moduleComponents.forEach((comp) => {
                    if (comp.settings?.readonly === true && comp.settings?.defaultValue) {
                        // Si es readonly y tiene defaultValue, usar ese valor
                        initialValues[comp.id] = comp.settings.defaultValue as string;
                    } else {
                        // Dejar vacío para que el usuario ingrese sus propios valores
                        initialValues[comp.id] = '';
                    }
                });
                setComponentValues(initialValues);
            } catch (err) {
                console.error('Error loading components:', err);
                setComponents([]);
                setComponentValues({});
            }
        };

        void loadComponents();
    }, [activeModule]);

    return {
        components,
        componentValues,
        setComponentValues,
    };
};

