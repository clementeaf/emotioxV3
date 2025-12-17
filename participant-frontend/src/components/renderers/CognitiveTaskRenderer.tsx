import React from 'react';
import type { ModuleConfig } from '../../types/module';
import { NavigationFlow } from '../ui/NavigationFlow';
import { PreferenceTest } from '../ui/PreferenceTest';
import { TextQuestion, ChoiceQuestion, LinearScaleQuestion, RankingQuestion } from '../questions';
import { getComponentText } from '../../utils/moduleComponent';

interface CognitiveTaskRendererProps {
    module: ModuleConfig;
}

export const CognitiveTaskRenderer: React.FC<CognitiveTaskRendererProps> = ({ module }) => {

    // Extract common components
    const titleComponent = module.structure.components.find(c => c.id.includes('title'));
    const descriptionComponent = module.structure.components.find(c => c.id.includes('description'));
    const titleText = getComponentText(titleComponent) || module.name;
    const descriptionText = getComponentText(descriptionComponent) || module.description;

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
        // Text Questions
        if (isShortText || isLongText) {
            const placeholderComp = module.structure.components.find(c => c.id.includes('placeholder'));
            return (
                <TextQuestion
                    moduleId={module.id}
                    componentId="answer"
                    title={titleText}
                    description={descriptionText}
                    placeholder={getComponentText(placeholderComp) || 'Escribe tu respuesta...'}
                    isLongText={isLongText}
                />
            );
        }

        // Choice Questions
        if (isSingleChoice || isMultipleChoice) {
            const choices = module.structure.components
                .filter(c => c.settings?.isChoice || c.id.includes('choice-'))
                .map(c => ({
                    id: c.id,
                    label: getComponentText(c)
                }));

            return (
                <ChoiceQuestion
                    moduleId={module.id}
                    componentId="choice"
                    title={titleText}
                    description={descriptionText}
                    options={choices}
                    isMultiple={isMultipleChoice}
                />
            );
        }

        // Linear Scale
        if (isLinearScale) {
            const startValueComp = module.structure.components.find(c => c.id.includes('start-value'));
            const endValueComp = module.structure.components.find(c => c.id.includes('end-value'));
            const startLabelComp = module.structure.components.find(c => c.id.includes('start-label'));
            const endLabelComp = module.structure.components.find(c => c.id.includes('end-label'));

            const minSource = getComponentText(startValueComp);
            const maxSource = getComponentText(endValueComp);
            const min = minSource ? parseInt(minSource) : 1;
            const max = maxSource ? parseInt(maxSource) : 5;

            return (
                <LinearScaleQuestion
                    moduleId={module.id}
                    componentId="scale"
                    title={titleText}
                    description={descriptionText}
                    minValue={min}
                    maxValue={max}
                    minLabel={getComponentText(startLabelComp)}
                    maxLabel={getComponentText(endLabelComp)}
                />
            );
        }

        // Ranking
        if (isRanking) {
            const items = module.structure.components
                .filter(c => c.settings?.isChoice || c.id.includes('choice-'))
                .map(c => ({
                    id: c.id,
                    label: getComponentText(c)
                }));

            return (
                <RankingQuestion
                    moduleId={module.id}
                    componentId="ranking"
                    title={titleText}
                    description={descriptionText}
                    items={items}
                />
            );
        }

        if (isNavigationFlow) {
            // Extract images from file-upload component
            const imageComponent = module.structure.components.find(c => c.type === 'file-upload');
            let images: Array<{ id: string; name?: string; s3Key?: string; url?: string; hitZones?: Array<{ x: number; y: number; width: number; height: number; label?: string; }> }> = [];
            
            const rawImagesJson = getComponentText(imageComponent);
            if (rawImagesJson) {
                try {
                    const parsed = JSON.parse(rawImagesJson);
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
                    title={titleText}
                    description={descriptionText}
                    images={images}
                />
            );
        }

        if (isPreferenceTest) {
            // Extract images from file-upload component
            const imageComponent = module.structure.components.find(c => c.type === 'file-upload');
            let images: Array<{ id: string; name?: string; s3Key?: string; url?: string }> = [];
            
            const rawImagesJson = getComponentText(imageComponent);
            if (rawImagesJson) {
                try {
                    const parsed = JSON.parse(rawImagesJson);
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
                    title={titleText}
                    description={descriptionText}
                    images={images}
                />
            );
        }

        return <div className="text-gray-400">Task type not implemented yet</div>;
    };

    return (
        <div className="flex flex-col items-center justify-center px-4 py-6">
            <div className="w-full max-w-2xl">
                {renderInteractiveComponent()}
            </div>
        </div>
    );
};
