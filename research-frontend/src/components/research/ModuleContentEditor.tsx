import { Trash2, Plus } from 'lucide-react';
import type { ComponentConfig } from '../../types/moduleBuilder.types';
import { EditableComponent } from './EditableComponent';

interface ModuleContentEditorProps {
    components: ComponentConfig[];
    componentValues: Record<string, string>;
    onValueChange: (componentId: string, value: string) => void;
    onAddChoiceComponent?: (groupLabel: string, siblingComponent: ComponentConfig) => void;
    onRemoveChoiceComponent?: (componentId: string) => void;
    researchId?: string; // For S3 upload in file-upload components
}

/**
 * Editor de contenido de módulo
 * Renderiza todos los componentes editables del módulo
 */
export const ModuleContentEditor = ({
    components,
    componentValues,
    onValueChange,
    onAddChoiceComponent,
    onRemoveChoiceComponent,
    researchId,
}: ModuleContentEditorProps) => {
    const visibleComponents = components
        .filter(c => !c.hidden)
        .sort((a, b) => {
            const orderA = a.order ?? 0;
            const orderB = b.order ?? 0;
            return orderA - orderB;
        });

    if (visibleComponents.length === 0) {
        return (
            <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                <p className="text-gray-500">No components configured for this module.</p>
            </div>
        );
    }

    // Group components that have groupLabel in settings, maintaining order
    type ProcessedComponent = 
        | { type: 'group'; groupLabel: string; components: ComponentConfig[] }
        | { type: 'single'; component: ComponentConfig };
    
    const processedComponents: ProcessedComponent[] = [];
    let currentGroup: { groupLabel: string; components: ComponentConfig[] } | null = null;

    visibleComponents.forEach((component) => {
        const groupLabel = component.settings?.groupLabel;
        const isChoice = component.settings?.isChoice;

        if (groupLabel && isChoice) {
            if (currentGroup && currentGroup.groupLabel === groupLabel) {
                currentGroup.components.push(component);
            } else {
                if (currentGroup) {
                    processedComponents.push({ type: 'group', groupLabel: currentGroup.groupLabel, components: currentGroup.components });
                }
                currentGroup = { groupLabel, components: [component] };
            }
        } else {
            if (currentGroup) {
                processedComponents.push({ type: 'group', groupLabel: currentGroup.groupLabel, components: currentGroup.components });
                currentGroup = null;
            }
            processedComponents.push({ type: 'single', component });
        }
    });

    if (currentGroup !== null) {
        const groupToAdd: { groupLabel: string; components: ComponentConfig[] } = currentGroup;
        processedComponents.push({ type: 'group', groupLabel: groupToAdd.groupLabel, components: groupToAdd.components });
    }

    return (
        <div className="space-y-6">
            {processedComponents.map((item, index) => {
                if (item.type === 'group' && item.components) {
                    const canModifyChoices = !!onAddChoiceComponent && !!onRemoveChoiceComponent;
                    return (
                        <div key={`group-${index}`} className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                            <label className="block text-sm font-medium text-gray-700 mb-4">
                                {item.groupLabel}
                            </label>
                            <div className="space-y-3">
                                {item.components.map((component) => {
                                    const componentValue = componentValues[component.id] || '';
                                    return (
                                        <div key={component.id} className="flex items-start gap-2">
                                            <div className="flex-1">
                                                <EditableComponent
                                                    component={component}
                                                    value={componentValue}
                                                    onChange={(value) => onValueChange(component.id, value)}
                                                    researchId={researchId}
                                                />
                                            </div>
                                            {canModifyChoices && item.components.length > 2 && (
                                                <button
                                                    onClick={() => onRemoveChoiceComponent(component.id)}
                                                    className="mt-1 p-2 text-red-500 hover:bg-red-50 rounded transition-colors"
                                                    title="Remove option"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            )}
                                        </div>
                                    );
                                })}
                                {canModifyChoices && (
                                    <button
                                        onClick={() => onAddChoiceComponent(item.groupLabel, item.components[item.components.length - 1])}
                                        className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm text-gray-600 border border-dashed border-gray-300 rounded-lg hover:border-gray-400 hover:text-gray-700 transition-colors"
                                    >
                                        <Plus className="h-4 w-4" />
                                        Add another choice
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                } else if (item.type === 'single' && item.component) {
                    const componentValue = componentValues[item.component.id] || '';
                    return (
                        <div key={item.component.id} className="space-y-2">
                            <EditableComponent
                                component={item.component}
                                value={componentValue}
                                onChange={(value) => onValueChange(item.component!.id, value)}
                                researchId={researchId}
                            />
                        </div>
                    );
                }
                return null;
            })}
        </div>
    );
};

