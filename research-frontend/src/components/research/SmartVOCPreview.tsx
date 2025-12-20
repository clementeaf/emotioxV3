import React from 'react';
import type { ComponentConfig } from '../../types/moduleBuilder.types';

interface SmartVOCPreviewProps {
    moduleName: string;
    components: ComponentConfig[];
    componentValues: Record<string, string>;
    className?: string;
}

/**
 * Componente de preview especializado para módulos Smart VOC
 * Renderiza los previews igual que en frontend/src/components/common/QuestionPreview.tsx
 */
export const SmartVOCPreview: React.FC<SmartVOCPreviewProps> = ({
    moduleName,
    components,
    componentValues,
    className = ''
}) => {
    // Detectar el tipo de módulo Smart VOC por nombre y componentes
    const getModuleType = (name: string, comps: ComponentConfig[]): 'CSAT' | 'CES' | 'CV' | 'NEV' | 'NPS' | 'VOC' | null => {
        const lowerName = name.toLowerCase();

        // Detectar por IDs de componentes (más preciso)
        const componentIds = comps.map(c => c.id?.toLowerCase() || '').join(' ');

        if (componentIds.includes('csat') || lowerName.includes('csat') || lowerName.includes('customer satisfaction')) return 'CSAT';
        if (componentIds.includes('ces') || lowerName.includes('ces') || lowerName.includes('customer effort')) return 'CES';
        if (componentIds.includes('cv') || lowerName.includes('cv') || lowerName.includes('cognitive value')) return 'CV';
        if (componentIds.includes('nev') || lowerName.includes('nev') || lowerName.includes('net emotional')) return 'NEV';
        if (componentIds.includes('nps') || lowerName.includes('nps') || lowerName.includes('net promoter')) return 'NPS';
        if (componentIds.includes('voc') || lowerName.includes('voc') || lowerName.includes('voice of customer')) return 'VOC';

        return null;
    };

    // Obtener valores de los componentes
    const getComponentValue = (id: string): string => {
        return componentValues[id] || '';
    };

    // Obtener título de la pregunta
    const getTitle = (): string => {
        const titleComponent = components.find(c =>
            c.id?.includes('title') || c.id?.includes('question')
        );
        return titleComponent ? getComponentValue(titleComponent.id) : moduleName;
    };

    // Obtener descripción
    const getDescription = (): string | undefined => {
        const descComponent = components.find(c =>
            c.id?.includes('description')
        );
        return descComponent ? getComponentValue(descComponent.id) : undefined;
    };

    // Obtener instrucciones
    const getInstructions = (): string | undefined => {
        const instructionsComponent = components.find(c =>
            c.id?.includes('instructions')
        );
        return instructionsComponent ? getComponentValue(instructionsComponent.id) : undefined;
    };

    // Obtener configuración del módulo
    const getConfig = (type: string): Record<string, unknown> => {
        const config: Record<string, unknown> = {};

        // Para CSAT: obtener tipo de visualización
        if (type === 'CSAT') {
            const displayTypeComponent = components.find(c =>
                c.id?.includes('display-type') || c.id?.includes('type')
            );
            if (displayTypeComponent) {
                const typeValue = getComponentValue(displayTypeComponent.id);
                config.type = typeValue || 'stars'; // Default a 'stars' si está vacío
            } else {
                config.type = 'stars'; // Default si no encuentra componente
            }
        }

        // Para CES, CV, NPS: obtener escala
        if (['CES', 'CV', 'NPS'].includes(type)) {
            const scaleComponent = components.find(c =>
                c.id?.includes('scale') || c.id?.includes('range')
            );
            if (scaleComponent) {
                let scaleValue = getComponentValue(scaleComponent.id);

                // Si no hay valor y el componente es readonly con defaultValue, usar defaultValue
                if (!scaleValue && scaleComponent.settings?.readonly === true && scaleComponent.settings?.defaultValue) {
                    scaleValue = scaleComponent.settings.defaultValue as string;
                }

                if (scaleValue) {
                    // El valor puede venir como "1-5", "1-7", "0-10", etc.
                    const [start, end] = scaleValue.split('-').map(Number);
                    if (!isNaN(start) && !isNaN(end)) {
                        config.scaleRange = { start, end };
                    }
                } else if (scaleComponent.options && scaleComponent.options.length > 0 && !scaleComponent.id?.includes('nps-scale-range')) {
                    // Si no hay valor pero hay opciones, usar la primera opción por defecto
                    // BUT NEVER do this for NPS scale range - it should always be fixed at 0-10
                    const firstOption = scaleComponent.options[0];
                    if (firstOption?.value) {
                        const [start, end] = firstOption.value.split('-').map(Number);
                        if (!isNaN(start) && !isNaN(end)) {
                            config.scaleRange = { start, end };
                        }
                    }
                } else if (type === 'NPS') {
                    // Para NPS, si no hay valor ni opciones, usar 0-10 por defecto
                    config.scaleRange = { start: 0, end: 10 };
                }
            }
        }

        // Para CV: obtener etiquetas
        if (type === 'CV') {
            const startLabelComponent = components.find(c =>
                c.id?.includes('start-label')
            );
            const endLabelComponent = components.find(c =>
                c.id?.includes('end-label')
            );
            if (startLabelComponent) {
                config.startLabel = getComponentValue(startLabelComponent.id);
            }
            if (endLabelComponent) {
                config.endLabel = getComponentValue(endLabelComponent.id);
            }
        }

        return config;
    };

    const moduleType = getModuleType(moduleName, components);
    if (!moduleType) {
        return null; // No es un módulo Smart VOC reconocido
    }

    const title = getTitle();
    const description = getDescription();
    const instructions = getInstructions();
    const config = getConfig(moduleType);

    const renderPreviewContent = () => {
        switch (moduleType) {
            case 'CSAT':
                return (
                    <div className="flex justify-center gap-2">
                        {config.type === 'stars' ? (
                            // Estrellas
                            Array.from({ length: 5 }, (_, i) => (
                                <span key={i} className="text-2xl text-gray-300 hover:text-yellow-400 cursor-pointer transition-colors">★</span>
                            ))
                        ) : (
                            // Números 1-5
                            <div className="flex gap-2">
                                {Array.from({ length: 5 }, (_, i) => (
                                    <div key={i} className="w-10 h-10 flex items-center justify-center border border-gray-300 rounded bg-white text-gray-600 hover:bg-blue-50 hover:border-blue-400 cursor-pointer transition-all">
                                        {i + 1}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                );

            case 'CES': {
                const cesScale = config.scaleRange as { start?: number; end?: number } | undefined;
                const cesStart = cesScale?.start || 1;
                const cesEnd = cesScale?.end || 5;
                return (
                    <div className="flex justify-between items-center gap-2">
                        {Array.from({ length: cesEnd - cesStart + 1 }, (_, i) => cesStart + i).map((value) => (
                            <div key={value} className="flex flex-col items-center">
                                <input type="radio" disabled className="w-4 h-4 text-blue-600 cursor-not-allowed mb-1" />
                                <span className="text-xs text-gray-600">{value}</span>
                            </div>
                        ))}
                    </div>
                );
            }

            case 'CV': {
                const cvScale = config.scaleRange as { start?: number; end?: number } | undefined;
                const cvStart = cvScale?.start || 1;
                const cvEnd = cvScale?.end || 7;
                const cvStartLabel = (config.startLabel as string) || 'Inicio';
                const cvEndLabel = (config.endLabel as string) || 'Fin';
                return (
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-xs text-gray-600">{cvStartLabel}</span>
                            <span className="text-xs text-gray-600">{cvEndLabel}</span>
                        </div>
                        <div className="flex justify-between items-center gap-2">
                            {Array.from({ length: cvEnd - cvStart + 1 }, (_, i) => cvStart + i).map((value) => (
                                <div key={value} className="flex flex-col items-center">
                                    <input type="radio" disabled className="w-4 h-4 text-blue-600 cursor-not-allowed mb-1" />
                                    <span className="text-xs text-gray-600">{value}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            }

            case 'NPS': {
                const npsScale = config.scaleRange as { start?: number; end?: number } | undefined;
                const npsStart = npsScale?.start || 0;
                const npsEnd = npsScale?.end || 10;
                return (
                    <div className="flex justify-between items-center gap-1">
                        {Array.from({ length: npsEnd - npsStart + 1 }, (_, i) => npsStart + i).map((value) => (
                            <div key={value} className="flex flex-col items-center">
                                <div className="w-8 h-8 flex items-center justify-center border border-gray-300 rounded bg-white text-xs text-gray-600">
                                    {value}
                                </div>
                            </div>
                        ))}
                    </div>
                );
            }

            case 'NEV':
                return (
                    <div className="text-center text-xs text-gray-500 italic">
                        Participants will select emotional values
                    </div>
                );

            case 'VOC':
                return (
                    <textarea
                        disabled
                        className="w-full h-24 p-3 rounded-lg bg-neutral-100 border border-gray-300 text-gray-400 cursor-not-allowed resize-none"
                        placeholder="Space for participant comments..."
                    />
                );

            default:
                return (
                    <div className="text-center text-xs text-gray-500 italic">
                        Preview not available for this type
                    </div>
                );
        }
    };

    return (
        <div className={`mt-5 bg-neutral-50 p-3 border border-gray-300 rounded-md ${className}`}>
            <label className="block text-sm font-medium text-gray-700 mb-1">
                Preview - This is how participants will see this question
                <span className="ml-2 text-xs font-normal text-red-500">(NOT EDITABLE)</span>
            </label>
            <div className="mt-2 text-sm text-gray-700 font-medium">{title || 'Question Title'}</div>
            {description && <div className="mt-1 text-sm text-gray-600">{description}</div>}
            {instructions && <div className="mt-1 text-xs text-gray-500">{instructions}</div>}

            {/* Renderizar vista previa según tipo */}
            <div className="mt-3">
                {renderPreviewContent()}
            </div>
        </div>
    );
};

