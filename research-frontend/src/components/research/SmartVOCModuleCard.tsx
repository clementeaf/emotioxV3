import { useState, useEffect, useRef } from 'react';
import { useModuleComponents } from '../../hooks/useModuleComponents';
import { ModuleContentEditor } from './ModuleContentEditor';
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
    const [localValues, setLocalValues] = useState<Record<string, string>>(componentValues);
    const cardRef = useRef<HTMLDivElement>(null);

    // Sync local values with componentValues when they change
    useEffect(() => {
        setLocalValues(componentValues);
    }, [componentValues]);

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
        const updated = {
            ...localValues,
            [componentId]: value,
        };
        setLocalValues(updated);
        setComponentValues(updated);
    };

    return (
        <div 
            ref={cardRef}
            id={`module-${module.id}`}
            className={`rounded-lg shadow-sm border bg-white transition-all ${
                isActive ? 'border-blue-400 shadow-md' : 'border-gray-200'
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
                    components={components}
                    componentValues={localValues}
                    onValueChange={handleComponentValueChange}
                />
            </div>
        </div>
    );
};

