import React from 'react';
import type { ModuleConfig } from '../../types/module';
import { ScaleSelector } from '../ui/ScaleSelector';
import { StarSelector } from '../ui/StarSelector';
import { EmotionSelector } from '../ui/EmotionSelector';
import { TextareaRenderer } from './TextareaRenderer';
import { useParticipantStore } from '../../stores/useParticipantStore';
import type { ResponseValue } from '../../types/responses';
import { getComponentText } from '../../utils/moduleComponent';

interface SmartVOCRendererProps {
    module: ModuleConfig;
}

export const SmartVOCRenderer: React.FC<SmartVOCRendererProps> = ({ module }) => {
    const { getResponse, saveResponse } = useParticipantStore();

    /**
     * Obtiene el valor guardado de un componente
     * @param componentId - ID del componente
     * @returns Valor guardado o null
     */
    const getSavedValue = (componentId: string): ResponseValue => {
        const response = getResponse(module.id, componentId);
        return response?.value ?? null;
    };

    /**
     * Guarda el valor de un componente
     * @param componentId - ID del componente
     * @param value - Valor a guardar
     */
    const saveComponentValue = (componentId: string, value: ResponseValue): void => {
        saveResponse(module.id, componentId, value);
    };

    // Obtener valores guardados
    const scaleValue = (getSavedValue('scale') as number) || null;
    const emotionValues = (getSavedValue('emotions') as string[]) || [];
    const textValue = (getSavedValue('text') as string) || '';

    // Extract display-only components
    const titleComponent = module.structure.components.find(c => c.id.includes('-title'));
    const descriptionComponent = module.structure.components.find(c => c.id.includes('-description'));
    const instructionsComponent = module.structure.components.find(c => c.id.includes('-instructions'));
    const titleText = getComponentText(titleComponent);
    const descriptionText = getComponentText(descriptionComponent);
    const instructionsText = getComponentText(instructionsComponent);

    // Determine module type by name
    const isCSAT = module.name.includes('CSAT');
    const isNPS = module.name.includes('NPS');
    const isCES = module.name.includes('CES');
    const isCV = module.name.includes('CV');
    const isNEV = module.name.includes('NEV');
    const isVOC = module.name.includes('VOC');

    // Render interactive component based on module type
    const renderInteractiveComponent = () => {
        if (isCSAT) {
            const displayTypeComponent = module.structure.components.find(c => c.id === 'csat-display-type');
            const displayType = getComponentText(displayTypeComponent) || 'stars';

            if (displayType === 'stars') {
                return <StarSelector max={5} value={scaleValue} onChange={(val) => saveComponentValue('scale', val ?? null)} />;
            } else {
                return (
                    <ScaleSelector
                        min={1}
                        max={5}
                        value={scaleValue}
                        onChange={(val) => saveComponentValue('scale', val ?? null)}
                    />
                );
            }
        }

        if (isNPS) {
            return (
                <ScaleSelector
                    min={0}
                    max={10}
                    value={scaleValue}
                    onChange={(val) => saveComponentValue('scale', val ?? null)}
                    startLabel="No lo recomendaría"
                    endLabel="Lo recomendaría"
                />
            );
        }

        if (isCES || isCV) {
            // Extract scale configuration
            const scaleComponent = module.structure.components.find(c => c.id.includes('-scale'));
            const startLabelComponent = module.structure.components.find(c => c.id.includes('-start-label'));
            const endLabelComponent = module.structure.components.find(c => c.id.includes('-end-label'));

            // Default range is 1-5
            let min = 1;
            let max = 5;

            // Try to extract from selectRange or defaultValue
            if (scaleComponent?.selectRange?.predefined) {
                const [minStr, maxStr] = scaleComponent.selectRange.predefined.split('-');
                min = parseInt(minStr);
                max = parseInt(maxStr);
            } else {
                const scaleRangeText = getComponentText(scaleComponent);
                if (scaleRangeText.trim().length > 0) {
                    const [minStr, maxStr] = String(scaleRangeText).split('-');
                min = parseInt(minStr);
                max = parseInt(maxStr);
                }
            }

            return (
                <ScaleSelector
                    min={min}
                    max={max}
                    value={scaleValue}
                    onChange={(val) => saveComponentValue('scale', val ?? null)}
                    startLabel={getComponentText(startLabelComponent)}
                    endLabel={getComponentText(endLabelComponent)}
                />
            );
        }

        if (isNEV) {
            return <EmotionSelector value={emotionValues} onChange={(val) => saveComponentValue('emotions', val)} />;
        }

        if (isVOC) {
            const vocComponent = {
                id: 'voc-response',
                name: 'Response',
                type: 'textarea' as const,
                label: '',
                defaultValue: '',
                placeholder: {
                    enabled: true,
                    text: 'Escribe tu opinión aquí...'
                },
                required: false,
                order: 4,
                settings: {
                    maxLength: 500
                }
            };

            return (
                <TextareaRenderer
                    component={vocComponent}
                    value={textValue}
                    onChange={(val) => saveComponentValue('text', val)}
                />
            );
        }

        return null;
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-[400px] px-4 py-8">
            <div className="w-full max-w-2xl space-y-6">
                {/* Title */}
                {(titleText || module.name).length > 0 && (
                    <h1 className="text-3xl font-bold text-gray-900 text-center">
                        {titleText || module.name}
                    </h1>
                )}

                {/* Description */}
                {descriptionText && descriptionText.length > 0 && (
                    <p className="text-lg text-gray-600 text-center">
                        {descriptionText}
                    </p>
                )}

                {/* Instructions */}
                {instructionsText && instructionsText.length > 0 && (
                    <p className="text-sm text-gray-500 text-center italic">
                        {instructionsText}
                    </p>
                )}

                {/* Interactive Component */}
                <div className="mt-8">
                    {renderInteractiveComponent()}
                </div>
            </div>
        </div>
    );
};
