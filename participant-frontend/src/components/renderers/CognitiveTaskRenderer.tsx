import React from 'react';
import type { ModuleConfig } from '../../types/module';
import { ScaleSelector } from '../ui/ScaleSelector';
import { ChoiceSelector } from '../ui/ChoiceSelector';
import { InputRenderer, TextareaRenderer } from '../renderers';
import { RankingSelector } from '../ui/RankingSelector';
import { NavigationFlow } from '../ui/NavigationFlow';
import { PreferenceTest } from '../ui/PreferenceTest';
import { useParticipantStore } from '../../stores/useParticipantStore';
import type { ResponseValue } from '../../types/responses';

interface CognitiveTaskRendererProps {
    module: ModuleConfig;
}

export const CognitiveTaskRenderer: React.FC<CognitiveTaskRendererProps> = ({ module }) => {
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
    const textValue = (getSavedValue('answer') as string) || '';
    const choiceValue = (getSavedValue('choice') as string | string[]) || [];
    const scaleValue = (getSavedValue('scale') as number) || null;
    const rankingItems = (getSavedValue('ranking') as string[]) || [];

    // Extract common components
    const titleComponent = module.structure.components.find(c => c.id.includes('title'));
    const descriptionComponent = module.structure.components.find(c => c.id.includes('description'));

    // Determine task type
    const isShortText = module.name === 'Short Text';
    const isLongText = module.name === 'Long Text';
    const isSingleChoice = module.name === 'Single Choice';
    const isMultipleChoice = module.name === 'Multiple Choice';
    const isLinearScale = module.name === 'Linear Scale';
    const isRanking = module.name === 'Ranking';
    const isNavigationFlow = module.name === 'Navigation Flow';
    const isPreferenceTest = module.name === 'Preference Test';

    const renderInteractiveComponent = () => {
        if (isShortText) {
            const placeholderComponent = module.structure.components.find(c => c.id.includes('placeholder')) ||
                module.structure.components.find(c => c.id.includes('answer'));
            return (
                <InputRenderer
                    component={placeholderComponent || {
                        id: 'answer',
                        name: 'answer',
                        type: 'input',
                        label: '',
                        defaultValue: '',
                        placeholder: { enabled: true, text: 'Type your answer...' },
                        required: true,
                        order: 3,
                        settings: {}
                    }}
                    value={textValue}
                    onChange={(val) => saveComponentValue('answer', val)}
                />
            );
        }

        if (isLongText) {
            const placeholderComponent = module.structure.components.find(c => c.id.includes('placeholder')) ||
                module.structure.components.find(c => c.id.includes('answer'));
            return (
                <TextareaRenderer
                    component={placeholderComponent || {
                        id: 'answer',
                        name: 'answer',
                        type: 'textarea',
                        label: '',
                        defaultValue: '',
                        placeholder: { enabled: true, text: 'Type your answer...' },
                        required: true,
                        order: 3,
                        settings: { maxLength: 1000 }
                    }}
                    value={textValue}
                    onChange={(val) => saveComponentValue('answer', val)}
                />
            );
        }

        if (isSingleChoice || isMultipleChoice) {
            // Extract choices from components with isChoice: true or id starting with 'choice-'
            const choices = module.structure.components
                .filter(c => c.settings?.isChoice || c.id.includes('choice-'))
                .map(c => ({
                    id: c.id,
                    label: c.defaultValue || '',
                    value: c.defaultValue || ''
                }));

            return (
                <ChoiceSelector
                    type={isSingleChoice ? 'single' : 'multiple'}
                    options={choices}
                    value={choiceValue}
                    onChange={(val) => saveComponentValue('choice', val)}
                />
            );
        }

        if (isLinearScale) {
            // Extract scale config
            const startValueComp = module.structure.components.find(c => c.id.includes('start-value'));
            const endValueComp = module.structure.components.find(c => c.id.includes('end-value'));
            const startLabelComp = module.structure.components.find(c => c.id.includes('start-label'));
            const endLabelComp = module.structure.components.find(c => c.id.includes('end-label'));

            // Default 1-5 if not found
            const min = startValueComp?.defaultValue ? parseInt(startValueComp.defaultValue) : 1;
            const max = endValueComp?.defaultValue ? parseInt(endValueComp.defaultValue) : 5;

            return (
                <ScaleSelector
                    min={min}
                    max={max}
                    value={scaleValue}
                    onChange={(val) => saveComponentValue('scale', val ?? null)}
                    startLabel={startLabelComp?.defaultValue}
                    endLabel={endLabelComp?.defaultValue}
                    variant="slider"
                />
            );
        }

        if (isRanking) {
            // Extract ranking items from components
            const items = module.structure.components
                .filter(c => c.settings?.isChoice || c.id.includes('choice-'))
                .map(c => c.defaultValue || '');

            // Use saved ranking or default items
            const currentRanking = rankingItems.length > 0 ? rankingItems : items;

            return (
                <RankingSelector
                    items={currentRanking}
                    onChange={(val) => saveComponentValue('ranking', val)}
                />
            );
        }

        if (isNavigationFlow) {
            // Extract images from file-upload component
            const imageComponent = module.structure.components.find(c => c.type === 'file-upload');
            let images: Array<{ id: string; name?: string; s3Key?: string; url?: string; hitZones?: Array<{ x: number; y: number; width: number; height: number; label?: string; }> }> = [];
            
            if (imageComponent?.defaultValue) {
                try {
                    const parsed = JSON.parse(imageComponent.defaultValue);
                    if (Array.isArray(parsed)) {
                        images = parsed.map((img: { id?: string; mediaId?: string; name?: string; s3Key?: string; url?: string; hitZones?: Array<{ region?: { x?: number; y?: number; width?: number; height?: number }; x?: number; y?: number; width?: number; height?: number; name?: string; label?: string }> }) => ({
                            id: img.id || img.mediaId || String(Math.random()),
                            name: img.name,
                            s3Key: img.s3Key,
                            url: img.url,
                            hitZones: img.hitZones?.map((hz) => ({
                                x: hz.region?.x || hz.x || 0,
                                y: hz.region?.y || hz.y || 0,
                                width: hz.region?.width || hz.width || 0,
                                height: hz.region?.height || hz.height || 0,
                                label: hz.name || hz.label,
                            })),
                        }));
                    }
                } catch (error) {
                    console.error('Failed to parse navigation flow images:', error);
                }
            }

            return (
                <NavigationFlow
                    moduleId={module.id}
                    componentId="navigation-flow"
                    title={titleComponent?.defaultValue}
                    description={descriptionComponent?.defaultValue}
                    images={images}
                />
            );
        }

        if (isPreferenceTest) {
            // Extract images from file-upload component
            const imageComponent = module.structure.components.find(c => c.type === 'file-upload');
            let images: Array<{ id: string; name?: string; s3Key?: string; url?: string }> = [];
            
            if (imageComponent?.defaultValue) {
                try {
                    const parsed = JSON.parse(imageComponent.defaultValue);
                    if (Array.isArray(parsed)) {
                        images = parsed.map((img: { id?: string; mediaId?: string; name?: string; s3Key?: string; url?: string }) => ({
                            id: img.id || img.mediaId || String(Math.random()),
                            name: img.name,
                            s3Key: img.s3Key,
                            url: img.url,
                        }));
                    }
                } catch (error) {
                    console.error('Failed to parse preference test images:', error);
                }
            }

            return (
                <PreferenceTest
                    moduleId={module.id}
                    componentId="preference-test"
                    title={titleComponent?.defaultValue}
                    description={descriptionComponent?.defaultValue}
                    images={images}
                />
            );
        }

        return <div className="text-gray-400">Task type not implemented yet</div>;
    };

    return (
        <div className="flex flex-col items-center justify-center px-4 py-6">
            <div className="w-full max-w-2xl space-y-4">
                {/* Title */}
                {titleComponent?.defaultValue && (
                    <h1 className="text-2xl font-bold text-gray-900 text-center">
                        {titleComponent.defaultValue}
                    </h1>
                )}

                {/* Description */}
                {descriptionComponent?.defaultValue && (
                    <p className="text-base text-gray-600 text-center">
                        {descriptionComponent.defaultValue}
                    </p>
                )}

                {/* Interactive Component */}
                <div className="w-full">
                    {renderInteractiveComponent()}
                </div>
            </div>
        </div>
    );
};
