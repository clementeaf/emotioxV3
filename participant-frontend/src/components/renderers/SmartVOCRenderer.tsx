import React from 'react';
import { useTranslation } from 'react-i18next';
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
    onComplete?: () => void;
}

export const SmartVOCRenderer: React.FC<SmartVOCRendererProps> = ({ module, onComplete }) => {
    const { t } = useTranslation();
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

    /**
     * Finds the best matching component for a Smart VOC display field.
     * Some module templates use ids like "csat-title", others use "csat-question".
     * @param kind - Field kind
     * @returns Matching component or undefined
     */
    const findDisplayComponent = (kind: 'title' | 'description' | 'instructions'): ModuleConfig['structure']['components'][number] | undefined => {
        if (kind === 'title') {
            return module.structure.components.find((c) => c.id.includes('title') || c.id.includes('question'));
        }
        return module.structure.components.find((c) => c.id.includes(kind));
    };

    // Extract display-only components (robust to differing id conventions)
    const titleComponent = findDisplayComponent('title');
    const descriptionComponent = findDisplayComponent('description');
    const instructionsComponent = findDisplayComponent('instructions');
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
                    startLabel={t('smartVoc.npsStartLabel')}
                    endLabel={t('smartVoc.npsEndLabel')}
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
            return (
                <EmotionSelector
                    value={emotionValues}
                    onChange={(val) => saveComponentValue('emotions', val)}
                />
            );
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
                    text: t('smartVoc.vocPlaceholder')
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
                    <h1 className="text-xl md:text-3xl font-bold text-gray-900 text-center">
                        {titleText || module.name}
                    </h1>
                )}

                {/* Description */}
                {descriptionText && descriptionText.length > 0 && (
                    <p className="text-base md:text-lg text-gray-600 text-center">
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

                {/* Module-specific instruction text */}
                {(isCSAT || isNPS || isCES || isCV) && scaleValue === null && (
                    <p className="text-sm text-gray-600 text-center mt-4">
                        {t('smartVoc.selectValueHint')}
                    </p>
                )}

                {/* Continue button */}
                {onComplete && (
                    (scaleValue !== null || emotionValues.length > 0 || textValue.length > 0) && (
                        <button
                            onClick={onComplete}
                            className="w-full py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors mt-4"
                        >
                            {t('common.continue')}
                        </button>
                    )
                )}

                {isNEV && (() => {
                    // Try to get minimum emotions from module.config
                    const config = typeof module.config === 'object' && module.config !== null ? module.config as Record<string, unknown> : {};
                    const minEmotions = typeof config.minEmotions === 'number' ? config.minEmotions : undefined;

                    if (minEmotions !== undefined && minEmotions > 0) {
                        if (minEmotions === 1) {
                            return (
                                <p className="text-sm text-gray-600 text-center mt-4">
                                    {t('smartVoc.selectOneEmotion')}
                                </p>
                            );
                        }
                        return (
                            <p className="text-sm text-gray-600 text-center mt-4">
                                {t('smartVoc.selectNEmotions', { count: minEmotions })}
                            </p>
                        );
                    }

                    return (
                        <p className="text-sm text-gray-600 text-center mt-4">
                            {t('smartVoc.selectEmotions')}
                        </p>
                    );
                })()}
            </div>
        </div>
    );
};
