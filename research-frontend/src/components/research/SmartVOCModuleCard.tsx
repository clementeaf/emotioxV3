import { useEffect, useRef } from 'react';
import { useModuleComponents } from '../../hooks/useModuleComponents';
import { ModuleContentEditor } from './ModuleContentEditor';
import { SmartVOCPreview } from './SmartVOCPreview';
import type { Module } from '../../services/research.service';

interface SmartVOCModuleCardProps {
    module: Module;
    researchId?: string;
    onSave?: () => void;
    isActive?: boolean;
}

/**
 * Card component para mostrar un módulo de Smart VOC
 * Muestra el módulo con su editor de contenido
 */
export const SmartVOCModuleCard = ({ module, isActive = false }: SmartVOCModuleCardProps) => {
    const { components, componentValues, setComponentValues } = useModuleComponents(module);
    const cardRef = useRef<HTMLDivElement>(null);

    // Scroll to this module when it becomes active
    useEffect(() => {
        if (isActive && cardRef.current) {
            setTimeout(() => {
                cardRef.current?.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start',
                });
            }, 100);
        }
    }, [isActive]);

    const handleComponentValueChange = (componentId: string, value: string): void => {
        setComponentValues(prev => ({
            ...prev,
            [componentId]: value,
        }));
    };

    // Filter components for the editor: 
    // 1. Hide scale/range components if they have no options
    // 2. Explicitly hide scale/range components for NEV module (as it uses fixed 20 emotions)
    const editorComponents = components.filter(component => {
        const isScaleOrRange = component.id?.includes('scale') || component.id?.includes('range');
        const isNEV = module.name.includes('Net Emotional Value') || module.name.includes('NEV');

        if (isNEV && isScaleOrRange) {
            return false;
        }

        if (isScaleOrRange && (!component.options || component.options.length === 0)) {
            return false;
        }
        return true;
    });

    return (
        <div
            ref={cardRef}
            id={`module-${module.id}`}
            className={`rounded-lg shadow-sm border bg-white transition-all ${isActive ? 'border-blue-400 shadow-md' : 'border-gray-200'
                }`}
        >
            <div className="px-6 py-4 border-b border-gray-200 ">
                <h3 className="text-base font-semibold text-gray-900">{module.name}</h3>
                {module.description && (
                    <p className="text-sm text-gray-500 mt-1">{module.description}</p>
                )}
            </div>
            <div className="p-6">
                <ModuleContentEditor
                    components={editorComponents}
                    componentValues={componentValues}
                    onValueChange={handleComponentValueChange}
                />
                {/* Preview especializado para Smart VOC */}
                <SmartVOCPreview
                    moduleName={module.name}
                    components={components}
                    componentValues={componentValues}
                />
            </div>
        </div>
    );
};

