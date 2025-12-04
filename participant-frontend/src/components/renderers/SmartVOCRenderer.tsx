import React, { useState } from 'react';
import type { ModuleConfig } from '../../types/module';
import { ScaleSelector } from '../ui/ScaleSelector';
import { StarSelector } from '../ui/StarSelector';
import { EmotionSelector } from '../ui/EmotionSelector';
import { TextareaRenderer } from './TextareaRenderer';

interface SmartVOCRendererProps {
    module: ModuleConfig;
}

export const SmartVOCRenderer: React.FC<SmartVOCRendererProps> = ({ module }) => {
    const [scaleValue, setScaleValue] = useState<number | null>(null);
    const [emotionValues, setEmotionValues] = useState<string[]>([]);
    const [textValue, setTextValue] = useState<string>('');

    // Extract display-only components
    const titleComponent = module.structure.components.find(c => c.id.includes('-title'));
    const descriptionComponent = module.structure.components.find(c => c.id.includes('-description'));
    const instructionsComponent = module.structure.components.find(c => c.id.includes('-instructions'));

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
            const displayType = displayTypeComponent?.defaultValue || 'stars';

            if (displayType === 'stars') {
                return <StarSelector max={5} value={scaleValue} onChange={setScaleValue} />;
            } else {
                return (
                    <ScaleSelector
                        min={1}
                        max={5}
                        value={scaleValue}
                        onChange={setScaleValue}
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
                    onChange={setScaleValue}
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
            } else if (scaleComponent?.defaultValue) {
                const [minStr, maxStr] = String(scaleComponent.defaultValue).split('-');
                min = parseInt(minStr);
                max = parseInt(maxStr);
            }

            return (
                <ScaleSelector
                    min={min}
                    max={max}
                    value={scaleValue}
                    onChange={setScaleValue}
                    startLabel={startLabelComponent?.defaultValue || ''}
                    endLabel={endLabelComponent?.defaultValue || ''}
                />
            );
        }

        if (isNEV) {
            return <EmotionSelector value={emotionValues} onChange={setEmotionValues} />;
        }

        if (isVOC) {
            const vocComponent: any = {
                id: 'voc-response',
                name: 'Response',
                type: 'textarea',
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
                    onChange={setTextValue}
                />
            );
        }

        return null;
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-[400px] px-4 py-8">
            <div className="w-full max-w-2xl space-y-6">
                {/* Title */}
                {titleComponent?.defaultValue && (
                    <h1 className="text-3xl font-bold text-gray-900 text-center">
                        {titleComponent.defaultValue}
                    </h1>
                )}

                {/* Description */}
                {descriptionComponent?.defaultValue && (
                    <p className="text-lg text-gray-600 text-center">
                        {descriptionComponent.defaultValue}
                    </p>
                )}

                {/* Instructions */}
                {instructionsComponent?.defaultValue && (
                    <p className="text-sm text-gray-500 text-center italic">
                        {instructionsComponent.defaultValue}
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
