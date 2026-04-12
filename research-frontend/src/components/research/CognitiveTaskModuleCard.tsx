import { useEffect, useRef, forwardRef, useImperativeHandle, useState, useMemo } from 'react';
import { useModuleComponents } from '../../hooks/useModuleComponents';
import { useScreenerSingleChoiceTrim } from '../../hooks/useScreenerSingleChoiceTrim';
import { useScreenerMultipleChoiceGroupPad } from '../../hooks/useScreenerMultipleChoiceGroupPad';
import { ModuleContentEditor } from './ModuleContentEditor';
import type { Module } from '../../services/research.service';
import type { ComponentConfig } from '../../types/moduleBuilder.types';
import type { EnabledDemographic } from '../../pages/research/ResearchBuilderPage';
import { Toggle } from '../ui/Toggle';
import { ConditionalityModal } from './ConditionalityModal';
import type { StudyModuleOption } from './ConditionalityModal';
import { getModuleConditionality, getModuleConditionalityConfig, getModuleHidden, getModuleRequired, isDemographicCondition, isModuleCondition } from '../../utils/moduleRequired';
import type { ConditionalityConfig } from '../../utils/moduleRequired';

export interface CognitiveTaskModuleCardRef {
    getComponentValues: () => Record<string, string>;
    getComponents: () => ComponentConfig[];
    getRequired: () => boolean;
    getHidden: () => boolean;
    getConditionality: () => boolean;
    getConditionalityConfig: () => ConditionalityConfig | null;
}

interface CognitiveTaskModuleCardProps {
    module: Module;
    researchId?: string;
    onSave?: () => void;
    onDelete?: (moduleId: string) => void;
    isActive?: boolean;
    enabledDemographics?: EnabledDemographic[];
    studyModules?: StudyModuleOption[];
}

/**
 * Card component para mostrar un módulo de Cognitive Task
 * Estructura idéntica a SmartVOCModuleCard para consistencia
 */
export const CognitiveTaskModuleCard = forwardRef<CognitiveTaskModuleCardRef, CognitiveTaskModuleCardProps>(
    ({ module, researchId, onDelete, isActive = false, enabledDemographics = [], studyModules = [] }, ref) => {
    const conditionalityDisabled = !enabledDemographics.length && !studyModules.length;
    const { components, setComponents, componentValues, setComponentValues } = useModuleComponents(module);

    useScreenerSingleChoiceTrim(module.name, components, componentValues, setComponents, setComponentValues);
    useScreenerMultipleChoiceGroupPad(module.name, components, componentValues, setComponents, setComponentValues);

    const cardRef = useRef<HTMLDivElement>(null);

    // Derive initial values from props
    const initialRequired = useMemo(() => getModuleRequired(module.config), [module.config]);
    const initialHidden = useMemo(() => getModuleHidden(module.config), [module.config]);
    const initialConditionality = useMemo(() => getModuleConditionality(module.config), [module.config]);
    const initialConditionalityConfig = useMemo(() => getModuleConditionalityConfig(module.config), [module.config]);

    const [isRequired, setIsRequired] = useState<boolean>(initialRequired);
    const [isHidden, setIsHidden] = useState<boolean>(initialHidden);
    const [isConditionality, setIsConditionality] = useState<boolean>(initialConditionality);
    const [conditionalityConfig, setConditionalityConfig] = useState<ConditionalityConfig | null>(initialConditionalityConfig);
    const [isConditionalityModalOpen, setIsConditionalityModalOpen] = useState(false);
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

    // Reset state when config changes
    useEffect(() => {
        setIsRequired(initialRequired);
        setIsHidden(initialHidden);
        setIsConditionality(initialConditionality);
        setConditionalityConfig(initialConditionalityConfig);
    }, [initialRequired, initialHidden, initialConditionality, initialConditionalityConfig]);

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
        getConditionalityConfig: () => conditionalityConfig,
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

    const handleAddIatTarget = (prefix: string, nextIndex: number): void => {
        const groupLabel = `${prefix === 'object' ? 'Object' : 'Target'} ${nextIndex}`;
        const nameId = `${prefix}-${nextIndex}-name`;
        const imageId = `${prefix}-${nextIndex}-image`;
        const maxOrder = Math.max(0, ...components.map(c => c.order ?? 0));
        const nameComp: ComponentConfig = {
            id: nameId,
            type: 'input',
            label: 'Name of the object',
            placeholder: { enabled: true, text: 'Text the name here' },
            order: maxOrder + 1,
            settings: { groupLabel, description: 'You can use an image or a name for this.' },
        };
        const imageComp: ComponentConfig = {
            id: imageId,
            type: 'file-upload',
            label: `${groupLabel} Image`,
            order: maxOrder + 2,
            settings: { groupLabel },
        };
        setComponents(prev => [...prev, nameComp, imageComp]);
        setComponentValues(prev => ({ ...prev, [nameId]: '', [imageId]: '' }));
    };

    const handleRemoveIatTarget = (componentIds: string[]): void => {
        const idsToRemove = new Set(componentIds);
        setComponents(prev => prev.filter(c => !idsToRemove.has(c.id)));
        setComponentValues(prev => {
            const next = { ...prev };
            componentIds.forEach(id => delete next[id]);
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
        } else {
            setConditionalityConfig(null);
        }
    };

    return (
        <div
            ref={cardRef}
            id={`module-${module.id}`}
            className={`rounded-lg shadow-sm border bg-white transition-all ${isActive ? 'border-blue-400 shadow-md' : 'border-gray-200'
                }`}
        >
            <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center gap-4">
                    <h3 className="text-base font-semibold text-gray-900">{module.name}</h3>
                    <div className="flex items-center gap-4 ml-auto">
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
                            disabled={conditionalityDisabled}
                        />
                        {onDelete && (
                            <button
                                type="button"
                                onClick={() => setIsDeleteConfirmOpen(true)}
                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                title="Delete module"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                            </button>
                        )}
                    </div>
                </div>
                {module.description && (
                    <p className="text-sm text-gray-500 mt-1">{module.description}</p>
                )}
                {isConditionality && conditionalityConfig && (
                    <button
                        type="button"
                        onClick={() => setIsConditionalityModalOpen(true)}
                        className="mt-2 text-xs text-blue-600 hover:text-blue-800 hover:underline"
                    >
                        {isDemographicCondition(conditionalityConfig)
                            ? `Condition: Show if ${conditionalityConfig.demographicKey} = ${conditionalityConfig.demographicValue}`
                            : isModuleCondition(conditionalityConfig)
                                ? `Condition: Show if ${studyModules.find(m => m.id === conditionalityConfig.sourceModuleId)?.name || 'Unknown'} = ${conditionalityConfig.selectedValues.map(v => studyModules.find(m => m.id === conditionalityConfig.sourceModuleId)?.options.find(o => o.id === v)?.label || v).join(', ')}`
                                : 'Condition configured'}
                    </button>
                )}
            </div>
            <div className="p-6">
                {!isHidden && (
                    <ModuleContentEditor
                        components={components}
                        componentValues={componentValues}
                        onValueChange={handleComponentValueChange}
                        onAddChoiceComponent={handleAddChoiceComponent}
                        onRemoveChoiceComponent={handleRemoveChoiceComponent}
                        onAddIatTarget={handleAddIatTarget}
                        onRemoveIatTarget={handleRemoveIatTarget}
                        researchId={researchId}
                        moduleName={module.name}
                    />
                )}
            </div>
            <ConditionalityModal
                isOpen={isConditionalityModalOpen}
                onClose={() => {
                    setIsConditionalityModalOpen(false);
                    if (!conditionalityConfig) setIsConditionality(false);
                }}
                onSave={(cfg) => {
                    setConditionalityConfig(cfg);
                    setIsConditionalityModalOpen(false);
                }}
                initialConfig={conditionalityConfig}
                moduleName={module.name}
                demographics={enabledDemographics}
                studyModules={studyModules}
                currentModuleOrderIndex={module.order_index}
            />
            {isDeleteConfirmOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                    <div className="bg-white rounded-lg shadow-lg p-6 max-w-sm w-full mx-4">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete module</h3>
                        <p className="text-sm text-gray-600 mb-4">
                            Are you sure you want to delete <strong>{module.name}</strong>? This action cannot be undone and all responses for this module will be lost.
                        </p>
                        <div className="flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => setIsDeleteConfirmOpen(false)}
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setIsDeleteConfirmOpen(false);
                                    onDelete?.(module.id);
                                }}
                                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
});
