import React, { useMemo } from 'react';
import type { ModuleConfig } from '../../types/module';
import { ChoiceQuestion } from '../questions';
import { getComponentText } from '../../utils/moduleComponent';
import {
    resolveScreenerChoiceOptions,
    resolveScreenerDescriptionComponent,
    resolveScreenerIsMultiple,
    resolveScreenerTitleComponent,
} from '../../utils/screenerParticipant';

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
    const { titleText, descriptionText, choices, isMultiple } = useMemo(() => {
        const components = module.structure?.components ?? [];
        const sorted = [...components].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        const titleComponent = resolveScreenerTitleComponent(sorted);
        const descriptionComponent = resolveScreenerDescriptionComponent(sorted);
        return {
            titleText: getComponentText(titleComponent) || module.name,
            descriptionText: getComponentText(descriptionComponent) || module.description,
            choices: resolveScreenerChoiceOptions(components),
            isMultiple: resolveScreenerIsMultiple(components),
        };
    }, [module]);

    return (
        <div className="flex flex-col items-center justify-center px-4 py-6">
            <div className="w-full max-w-2xl">
                <ChoiceQuestion
                    moduleId={module.id}
                    componentId="choice"
                    title={titleText}
                    description={descriptionText}
                    options={choices}
                    isMultiple={isMultiple}
                />
            </div>
        </div>
    );
};
