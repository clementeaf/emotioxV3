import React from 'react';
import type { ModuleConfig } from '../../types/module';
import { ChoiceQuestion } from '../questions';
import { getComponentText } from '../../utils/moduleComponent';

interface ScreenerRendererProps {
    module: ModuleConfig;
    onComplete?: () => void;
}

/**
 * Renderer for Screener modules.
 * Displays a filtering question with Qualify/Disqualify choices.
 * Response format: component_id = 'choice', value = choice ID.
 * Eligibility routing (qualify/disqualify) is handled server-side.
 */
// Screener relies on parent footer button to advance (onComplete not used)
export const ScreenerRenderer: React.FC<ScreenerRendererProps> = ({ module }) => {
    const components = module.structure?.components || [];

    const titleComponent = components.find(c => c.id.includes('title'));
    const descriptionComponent = components.find(c => c.id.includes('description'));
    const titleText = getComponentText(titleComponent) || module.name;
    const descriptionText = getComponentText(descriptionComponent) || module.description;

    // Extract choices from components marked with isChoice setting
    const choices = components
        .filter(c => c.settings?.isChoice || c.id.includes('choice-'))
        .map(c => ({
            id: c.id,
            label: getComponentText(c),
        }));

    return (
        <div className="flex flex-col items-center justify-center px-4 py-6">
            <div className="w-full max-w-2xl">
                <ChoiceQuestion
                    moduleId={module.id}
                    componentId="choice"
                    title={titleText}
                    description={descriptionText}
                    options={choices}
                    isMultiple={false}
                />
            </div>
        </div>
    );
};
