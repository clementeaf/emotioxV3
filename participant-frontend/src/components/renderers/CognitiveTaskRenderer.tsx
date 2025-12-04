import React, { useState } from 'react';
import type { ModuleConfig } from '../../types/module';
import { ScaleSelector } from '../ui/ScaleSelector';
import { ChoiceSelector } from '../ui/ChoiceSelector';
import { InputRenderer, TextareaRenderer } from '../renderers';
import { RankingSelector } from '../ui/RankingSelector';
import { NavigationFlow } from '../ui/NavigationFlow';
import { PreferenceTest } from '../ui/PreferenceTest';

interface CognitiveTaskRendererProps {
    module: ModuleConfig;
}

export const CognitiveTaskRenderer: React.FC<CognitiveTaskRendererProps> = ({ module }) => {
    const [textValue, setTextValue] = useState<string>('');
    const [choiceValue, setChoiceValue] = useState<string | string[]>([]);
    const [scaleValue, setScaleValue] = useState<number | null>(null);
    const [rankingItems, setRankingItems] = useState<string[]>([]);

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
                        type: 'input',
                        label: '',
                        defaultValue: '',
                        placeholder: { enabled: true, text: 'Type your answer...' },
                        required: true,
                        order: 3,
                        settings: {}
                    }}
                    value={textValue}
                    onChange={setTextValue}
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
                        type: 'textarea',
                        label: '',
                        defaultValue: '',
                        placeholder: { enabled: true, text: 'Type your answer...' },
                        required: true,
                        order: 3,
                        settings: { maxLength: 1000 }
                    }}
                    value={textValue}
                    onChange={setTextValue}
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
                    onChange={(val) => setChoiceValue(val)}
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
                    onChange={setScaleValue}
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

            // Initialize ranking items if empty
            if (rankingItems.length === 0 && items.length > 0) {
                setRankingItems(items);
            }

            return (
                <RankingSelector
                    items={rankingItems.length > 0 ? rankingItems : items}
                    onChange={setRankingItems}
                />
            );
        }

        if (isNavigationFlow) {
            return (
                <NavigationFlow
                    title={titleComponent?.defaultValue}
                    description={descriptionComponent?.defaultValue}
                />
            );
        }

        if (isPreferenceTest) {
            return (
                <PreferenceTest
                    title={titleComponent?.defaultValue}
                    description={descriptionComponent?.defaultValue}
                />
            );
        }

        return <div className="text-gray-400">Task type not implemented yet</div>;
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

                {/* Interactive Component */}
                <div className="mt-8 w-full">
                    {renderInteractiveComponent()}
                </div>
            </div>
        </div>
    );
};
