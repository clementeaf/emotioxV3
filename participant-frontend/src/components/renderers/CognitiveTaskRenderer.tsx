import React from 'react';
import type { ModuleConfig } from '../../types/module';
import { NavigationFlow } from '../ui/NavigationFlow';
import { PreferenceTest } from '../ui/PreferenceTest';
import { TextQuestion, ChoiceQuestion, LinearScaleQuestion, RankingQuestion } from '../questions';
import { getComponentText } from '../../utils/moduleComponent';

interface CognitiveTaskRendererProps {
    module: ModuleConfig;
    onComplete?: () => void;
}

export const CognitiveTaskRenderer: React.FC<CognitiveTaskRendererProps> = ({ module, onComplete }) => {

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
                    key={`${module.id}-answer`}
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
                    onComplete={isSingleChoice ? onComplete : undefined}
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
                    onComplete={onComplete}
                />
            );
        }

        // Ranking
        if (isRanking) {
            // Support multiple formats:
            // 1. Component with id 'items' - check options, settings.items, or value
            // 2. Component with type 'ranking-list' (any id)
            // 3. Old format: multiple components with isChoice or choice- in id
            let items: Array<{ id: string; label: string }> = [];
            
            // Try new format first (component with id 'items' or type 'ranking-list')
            // Also check for ranking-slider which might contain items in options
            const itemsComponent = module.structure.components.find(c => 
                c.id === 'items' || 
                (c.type as string) === 'ranking-list' ||
                (c.id === 'ranking-slider' && c.options && Array.isArray(c.options) && c.options.length > 0)
            );
            
            if (itemsComponent) {
                // First try: component.options array
                if (itemsComponent.options && Array.isArray(itemsComponent.options) && itemsComponent.options.length > 0) {
                    items = itemsComponent.options.map((opt, index) => ({
                        id: opt.value || opt.label || `item-${index}`,
                        label: opt.label || opt.value || `Item ${index + 1}`
                    }));
                }
                // Second try: settings.items array
                else if (itemsComponent.settings?.items && Array.isArray(itemsComponent.settings.items) && itemsComponent.settings.items.length > 0) {
                    items = itemsComponent.settings.items.map((item: { id?: string; label?: string; value?: string }, index: number) => ({
                        id: item.id || item.value || `item-${index}`,
                        label: item.label || item.value || item.id || `Item ${index + 1}`
                    }));
                }
                // Third try: parse from component.value directly (may be object/array)
                else if (itemsComponent.value) {
                    try {
                        let parsed: unknown = itemsComponent.value;
                        // If value is a string, try to parse as JSON
                        if (typeof parsed === 'string') {
                            parsed = JSON.parse(parsed);
                        }
                        // If parsed is an array, use it
                        if (Array.isArray(parsed)) {
                            items = parsed.map((item: string | { id?: string; label?: string; value?: string }, index: number) => {
                                if (typeof item === 'string') {
                                    return { id: `item-${index}`, label: item };
                                }
                                return {
                                    id: item.id || item.value || `item-${index}`,
                                    label: item.label || item.value || item.id || `Item ${index + 1}`
                                };
                            });
                        }
                    } catch {
                        // Not JSON or not parseable, continue to next try
                    }
                }
                // Fourth try: parse from component text/value using getComponentText (JSON or newline-separated)
                if (items.length === 0) {
                    const componentText = getComponentText(itemsComponent);
                    if (componentText) {
                        try {
                            const parsed = JSON.parse(componentText);
                            if (Array.isArray(parsed) && parsed.length > 0) {
                                items = parsed.map((item: string | { id?: string; label?: string; value?: string }, index: number) => {
                                    if (typeof item === 'string') {
                                        return { id: `item-${index}`, label: item };
                                    }
                                    return {
                                        id: item.id || item.value || `item-${index}`,
                                        label: item.label || item.value || item.id || `Item ${index + 1}`
                                    };
                                });
                            }
                        } catch {
                            // Not JSON, treat as newline-separated list
                            const lines = componentText.split('\n').filter(line => line.trim());
                            if (lines.length > 0) {
                                items = lines.map((line, index) => ({
                                    id: `item-${index}`,
                                    label: line.trim()
                                }));
                            }
                        }
                    }
                }
            }
            
            // If no items found in new format, try old format
            if (items.length === 0) {
                items = module.structure.components
                    .filter(c => c.settings?.isChoice || c.id.includes('choice-'))
                    .map(c => ({
                        id: c.id,
                        label: getComponentText(c)
                    }));
            }

            // Debug: log structure to help diagnose
            if (items.length === 0) {
                console.warn('[Ranking] No items found. Module structure:', {
                    moduleId: module.id,
                    moduleName: module.name,
                    components: module.structure.components.map(c => ({
                        id: c.id,
                        type: c.type,
                        label: c.label,
                        hasOptions: !!c.options,
                        options: c.options,
                        optionsLength: c.options?.length || 0,
                        hasSettingsItems: !!c.settings?.items,
                        settingsItems: c.settings?.items,
                        settingsItemsLength: Array.isArray(c.settings?.items) ? c.settings.items.length : 0,
                        hasValue: !!c.value,
                        value: c.value,
                        valueType: typeof c.value,
                        valueStringified: c.value ? JSON.stringify(c.value, null, 2) : null,
                        hasDefaultValue: !!c.defaultValue,
                        defaultValue: c.defaultValue,
                        hasSettingsDefaultValue: !!c.settings?.defaultValue,
                        settingsDefaultValue: c.settings?.defaultValue,
                        isChoice: c.settings?.isChoice,
                        settings: c.settings,
                        text: getComponentText(c),
                        fullComponent: JSON.parse(JSON.stringify(c)) // Deep clone to avoid circular refs
                    }))
                });
                
                // Also log each component separately for easier inspection
                module.structure.components.forEach((c, index) => {
                    console.log(`[Ranking] Component ${index + 1} (${c.id}):`, {
                        id: c.id,
                        type: c.type,
                        label: c.label,
                        value: c.value,
                        valueType: typeof c.value,
                        valueStringified: c.value ? JSON.stringify(c.value, null, 2) : null,
                        options: c.options,
                        settings: c.settings,
                        defaultValue: c.defaultValue,
                        fullComponent: JSON.parse(JSON.stringify(c))
                    });
                });
            }

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
                    onComplete={onComplete}
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
                    onComplete={onComplete}
                />
            );
        }

        return <div className="text-gray-400">Task type not implemented yet</div>;
    };

    return (
        <div className="flex flex-col items-center justify-center px-4 py-6">
            <div className="w-full max-w-2xl">
                {renderInteractiveComponent()}

                {/* Module-specific instruction text */}
                {isLinearScale && (
                    <p className="text-sm text-gray-600 text-center mt-4">
                        Selecciona un valor para pasar al siguiente paso
                    </p>
                )}

                {isSingleChoice && (
                    <p className="text-sm text-gray-600 text-center mt-4">
                        Selecciona una opción para pasar al siguiente paso
                    </p>
                )}

                {isPreferenceTest && (
                    <p className="text-sm text-gray-600 text-center mt-4">
                        Se pasa al siguiente paso seleccionando una de las imágenes
                    </p>
                )}
            </div>
        </div>
    );
};
