import type { ComponentConfig } from '../../types/moduleBuilder.types';
import { EditableComponent } from './EditableComponent';

interface ModuleContentEditorProps {
    components: ComponentConfig[];
    componentValues: Record<string, string>;
    onValueChange: (componentId: string, value: string) => void;
}

/**
 * Editor de contenido de módulo
 * Renderiza todos los componentes editables del módulo
 */
export const ModuleContentEditor = ({
    components,
    componentValues,
    onValueChange,
}: ModuleContentEditorProps) => {
    const visibleComponents = components
        .filter(c => !c.hidden)
        .sort((a, b) => {
            const orderA = (a as any).order ?? 0;
            const orderB = (b as any).order ?? 0;
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
    const processedComponents: Array<{ type: 'group' | 'single'; groupLabel?: string; components?: typeof visibleComponents; component?: typeof visibleComponents[0] }> = [];
    let currentGroup: { groupLabel: string; components: typeof visibleComponents } | null = null;

    visibleComponents.forEach((component) => {
        const groupLabel = (component.settings as any)?.groupLabel;
        const isChoice = (component.settings as any)?.isChoice;

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

    if (currentGroup) {
        processedComponents.push({ type: 'group', groupLabel: currentGroup.groupLabel, components: currentGroup.components });
    }

    return (
        <div className="space-y-6">
            {processedComponents.map((item, index) => {
                if (item.type === 'group' && item.components) {
                    return (
                        <div key={`group-${index}`} className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                            <label className="block text-sm font-medium text-gray-700 mb-4">
                                {item.groupLabel}
                            </label>
                            <div className="space-y-3">
                                {item.components.map((component) => {
                                    const componentValue = componentValues[component.id] || '';
                                    return (
                                        <EditableComponent
                                            key={component.id}
                                            component={component}
                                            value={componentValue}
                                            onChange={(value) => onValueChange(component.id, value)}
                                        />
                                    );
                                })}
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
                            />
                        </div>
                    );
                }
                return null;
            })}
        </div>
    );
};

