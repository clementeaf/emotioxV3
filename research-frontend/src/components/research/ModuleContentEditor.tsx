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
    const visibleComponents = components.filter(c => !c.hidden);

    if (visibleComponents.length === 0) {
        return (
            <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                <p className="text-gray-500">No components configured for this module.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {visibleComponents.map((component) => {
                const componentValue = componentValues[component.id] || '';
                
                return (
                    <div key={component.id} className="space-y-2">
                        <EditableComponent
                            component={component}
                            value={componentValue}
                            onChange={(value) => onValueChange(component.id, value)}
                        />
                    </div>
                );
            })}
        </div>
    );
};

