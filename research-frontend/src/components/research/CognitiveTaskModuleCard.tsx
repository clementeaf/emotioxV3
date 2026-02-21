import { useEffect, useRef, forwardRef, useImperativeHandle, useState, useMemo } from 'react';
import { useModuleComponents } from '../../hooks/useModuleComponents';
import { ModuleContentEditor } from './ModuleContentEditor';
import type { Module } from '../../services/research.service';
import type { ComponentConfig } from '../../types/moduleBuilder.types';
import { Toggle } from '../ui/Toggle';
import { ConditionalityModal } from './ConditionalityModal';
import { getModuleConditionality, getModuleHidden, getModuleRequired } from '../../utils/moduleRequired';

export interface CognitiveTaskModuleCardRef {
    getComponentValues: () => Record<string, string>;
    getComponents: () => ComponentConfig[];
    getRequired: () => boolean;
    getHidden: () => boolean;
    getConditionality: () => boolean;
}

interface CognitiveTaskModuleCardProps {
    module: Module;
    researchId?: string;
    onSave?: () => void;
    isActive?: boolean;
}

/**
 * Card component para mostrar un módulo de Cognitive Task
 * Estructura idéntica a SmartVOCModuleCard para consistencia
 */
export const CognitiveTaskModuleCard = forwardRef<CognitiveTaskModuleCardRef, CognitiveTaskModuleCardProps>(
    ({ module, researchId, isActive = false }, ref) => {
    const { components, setComponents, componentValues, setComponentValues } = useModuleComponents(module);
    const cardRef = useRef<HTMLDivElement>(null);

    // Derive initial values from props
    const initialRequired = useMemo(() => getModuleRequired(module.config), [module.config]);
    const initialHidden = useMemo(() => getModuleHidden(module.config), [module.config]);
    const initialConditionality = useMemo(() => getModuleConditionality(module.config), [module.config]);

    const [isRequired, setIsRequired] = useState<boolean>(initialRequired);
    const [isHidden, setIsHidden] = useState<boolean>(initialHidden);
    const [isConditionality, setIsConditionality] = useState<boolean>(initialConditionality);
    const [isConditionalityModalOpen, setIsConditionalityModalOpen] = useState(false);

    // Reset state when config changes
    useEffect(() => {
        setIsRequired(initialRequired);
        setIsHidden(initialHidden);
        setIsConditionality(initialConditionality);
    }, [initialRequired, initialHidden, initialConditionality]);

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

    // Expose component values to parent via ref
    useImperativeHandle(ref, () => ({
        getComponentValues: () => componentValues,
        getComponents: () => components,
        getRequired: () => isRequired,
        getHidden: () => isHidden,
        getConditionality: () => isConditionality,
    }));

    const handleComponentValueChange = (componentId: string, value: string): void => {
        setComponentValues(prev => ({
            ...prev,
            [componentId]: value,
        }));
    };

    const handleAddChoiceComponent = (groupLabel: string, siblingComponent: ComponentConfig): void => {
        const newId = `choice-${Date.now()}`;
        const siblingOrder = siblingComponent.order ?? 0;
        const newComponent: ComponentConfig = {
            id: newId,
            type: 'input',
            label: '',
            settings: {
                ...siblingComponent.settings,
                isChoice: true,
                groupLabel,
            },
            placeholder: siblingComponent.placeholder,
            order: siblingOrder + 0.5,
        };
        setComponents(prev => [...prev, newComponent]);
        setComponentValues(prev => ({ ...prev, [newId]: '' }));
    };

    const handleRemoveChoiceComponent = (componentId: string): void => {
        setComponents(prev => prev.filter(c => c.id !== componentId));
        setComponentValues(prev => {
            const next = { ...prev };
            delete next[componentId];
            return next;
        });
    };

    /**
     * Handles toggling the module required flag.
     * @param next - Next checked value
     */
    const handleRequiredChange = (next: boolean): void => {
        setIsRequired(next);
    };

    /**
     * Handles toggling the local-only hidden flag.
     * @param next - Next checked value
     */
    const handleHiddenChange = (next: boolean): void => {
        setIsHidden(next);
    };

    const handleConditionalityChange = (next: boolean): void => {
        setIsConditionality(next);
        if (next) {
            setIsConditionalityModalOpen(true);
        }
    };

    return (
        <div
            ref={cardRef}
            id={`module-${module.id}`}
            className={`rounded-lg shadow-sm border bg-white transition-all ${isActive ? 'border-blue-400 shadow-md' : 'border-gray-200'
                }`}
        >
            <div className="px-6 py-4 border-b border-gray-200 ">
                <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                        <h3 className="text-base font-semibold text-gray-900">{module.name}</h3>
                        {module.description && (
                            <p className="text-sm text-gray-500 mt-1">{module.description}</p>
                        )}
                    </div>
                    <div className="shrink-0 flex flex-col gap-2">
                        <Toggle
                            checked={isRequired}
                            onChange={(e) => handleRequiredChange(Boolean(e.target.checked))}
                            label="Required"
                        />
                        <Toggle
                            checked={isHidden}
                            onChange={(e) => handleHiddenChange(Boolean(e.target.checked))}
                            label="Hide"
                        />
                        <Toggle
                            checked={isConditionality}
                            onChange={(e) => handleConditionalityChange(Boolean(e.target.checked))}
                            label="Show conditionality"
                        />
                    </div>
                </div>
            </div>
            <div className="p-6">
                {!isHidden && (
                    <ModuleContentEditor
                        components={components}
                        componentValues={componentValues}
                        onValueChange={handleComponentValueChange}
                        onAddChoiceComponent={handleAddChoiceComponent}
                        onRemoveChoiceComponent={handleRemoveChoiceComponent}
                        researchId={researchId}
                    />
                )}
            </div>
            <ConditionalityModal
                isOpen={isConditionalityModalOpen}
                onClose={() => {
                    setIsConditionalityModalOpen(false);
                    setIsConditionality(false);
                }}
            />
        </div>
    );
});
