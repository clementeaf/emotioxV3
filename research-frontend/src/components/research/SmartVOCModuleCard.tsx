import { useEffect, useRef, forwardRef, useImperativeHandle, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useModuleComponents } from '../../hooks/useModuleComponents';
import { ModuleContentEditor } from './ModuleContentEditor';
import { SmartVOCPreview } from './SmartVOCPreview';
import type { Module } from '../../services/research.service';
import type { ComponentConfig } from '../../types/moduleBuilder.types';
import { Toggle } from '../ui/Toggle';
import { getModuleHidden, getModuleRequired } from '../../utils/moduleRequired';
import { isLocalhost } from '../../utils/localOnlyModuleFlags';

export interface SmartVOCModuleCardRef {
    getComponentValues: () => Record<string, string>;
    getComponents: () => ComponentConfig[];
    getRequired: () => boolean;
    getHidden: () => boolean;
}

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
export const SmartVOCModuleCard = forwardRef<SmartVOCModuleCardRef, SmartVOCModuleCardProps>(
    ({ module, researchId, isActive = false }, ref) => {
    const navigate = useNavigate();
    const { components, componentValues, setComponentValues } = useModuleComponents(module);
    const cardRef = useRef<HTMLDivElement>(null);

    // Derive initial values from props
    const initialRequired = useMemo(() => getModuleRequired(module.config), [module.config]);
    const initialHidden = useMemo(() => getModuleHidden(module.config), [module.config]);

    const [isRequired, setIsRequired] = useState<boolean>(initialRequired);
    const [isHidden, setIsHidden] = useState<boolean>(initialHidden);

    // Reset state when config changes
    useEffect(() => {
        setIsRequired(initialRequired);
        setIsHidden(initialHidden);
    }, [initialRequired, initialHidden]);

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
    }));

    const handleComponentValueChange = (componentId: string, value: string): void => {
        setComponentValues(prev => ({
            ...prev,
            [componentId]: value,
        }));
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

    /**
     * Handles clicking on the card to navigate to the module
     * @param _e - Mouse event (unused, but needed for onClick handler)
     */
    const handleCardClick = (_e: React.MouseEvent<HTMLDivElement>): void => {
        if (!researchId) {
            console.error('[SmartVOCModuleCard] Cannot navigate: researchId is missing');
            return;
        }
        if (!module.id) {
            console.error('[SmartVOCModuleCard] Cannot navigate: module.id is missing');
            return;
        }
        navigate(`/research/${researchId}/builder/module/${module.id}`);
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
            onClick={handleCardClick}
            className={`rounded-lg shadow-sm border bg-white transition-all pl-10 cursor-pointer ${isActive ? 'border-blue-400 shadow-md' : 'border-gray-200'
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
                    <div className="shrink-0 flex flex-col gap-2" onClick={(e) => e.stopPropagation()}>
                        <Toggle
                            checked={isRequired}
                            onChange={(e) => {
                                e.stopPropagation();
                                handleRequiredChange(Boolean(e.target.checked));
                            }}
                            label="Required"
                        />
                        {isLocalhost() && (
                            <Toggle
                                checked={isHidden}
                                onChange={(e) => {
                                    e.stopPropagation();
                                    handleHiddenChange(Boolean(e.target.checked));
                                }}
                                label="Hide"
                            />
                        )}
                    </div>
                </div>
            </div>
            <div className="p-6" onClick={(e) => e.stopPropagation()}>
                {!isHidden && (
                    <>
                        <ModuleContentEditor
                            components={editorComponents}
                            componentValues={componentValues}
                            onValueChange={handleComponentValueChange}
                            researchId={researchId}
                        />
                        {/* Preview especializado para Smart VOC */}
                        <SmartVOCPreview
                            moduleName={module.name}
                            components={components}
                            componentValues={componentValues}
                        />
                    </>
                )}
            </div>
        </div>
    );
});

