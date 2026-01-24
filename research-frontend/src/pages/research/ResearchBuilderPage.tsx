import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useResearch, researchKeys } from '../../hooks/useResearchQuery';
import type { Research, Stage, Module } from '../../services/research.service';
import { useWelcomeScreenRedirect } from '../../hooks/useWelcomeScreenRedirect';
import { useModuleComponents } from '../../hooks/useModuleComponents';
import { ResearchBuilderHeader } from '../../components/research/ResearchBuilderHeader';
import { ResearchSettingsView } from '../../components/research/ResearchSettingsView';
import { ModuleContentEditor } from '../../components/research/ModuleContentEditor';
import { SmartVOCModuleCard, type SmartVOCModuleCardRef } from '../../components/research/SmartVOCModuleCard';
import { SortableSmartVOCCard } from '../../components/research/SortableSmartVOCCard';
import { CognitiveTaskModuleCard, type CognitiveTaskModuleCardRef } from '../../components/research/CognitiveTaskModuleCard';
import { ResearchConfigurationModule } from '../../components/research/ResearchConfigurationModule';
import { ModuleTemplateSelectionModal } from '../../components/research/ModuleTemplateSelectionModal';
import { StageEmptyState } from '../../components/research/StageEmptyState';
import { LoadingErrorStates } from '../../components/research/LoadingErrorStates';
import { Select } from '../../components/ui/Select';
import { useToast } from '../../hooks/useToast';
import { modulesService } from '../../services/modules.service';
import { hasModuleConfiguredValues, withModuleHidden, withModuleRequired } from '../../utils/moduleRequired';
import { DndContext, closestCenter, PointerSensor, KeyboardSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable';

export const ResearchBuilderPage = () => {
    const { id, moduleId, stageId } = useParams<{ id: string; moduleId?: string; stageId?: string }>();
    const navigate = useNavigate();
    const location = useLocation();
    const toast = useToast();
    const queryClient = useQueryClient();

    const { data: research, isLoading: loading, error } = useResearch(id || null);

    // Type assertion para TypeScript
    const typedResearch = research as Research | null;
    const isSettings = location.pathname.endsWith('/settings');
    // Use useParams for moduleId instead of regex for better reactivity
    const activeModuleId = moduleId || null;

    // Find the active stage by stageId from URL params
    const activeStageFromUrl = stageId && typedResearch?.stages
        ? typedResearch.stages.find((s: Stage) => s.id === stageId) || null
        : null;

    const activeModule = activeModuleId && typedResearch && typedResearch.stages
        ? typedResearch.stages.flatMap((s: Stage) => s.modules || []).find((m: Module) => m.id === activeModuleId) || null
        : null;

    const smartVOCStage = useMemo((): Stage | null => {
        if (!typedResearch?.stages) return null;

        // Check if activeStageFromUrl is Smart VOC
        if (activeStageFromUrl && (
            activeStageFromUrl.name.toLowerCase().includes('smart voc') ||
            activeStageFromUrl.name.toLowerCase() === 'smart voc'
        )) {
            return activeStageFromUrl;
        }

        let stage = typedResearch.stages.find((s: Stage) =>
            s.name.toLowerCase().includes('smart voc') ||
            s.name.toLowerCase() === 'smart voc'
        );

        if (!stage && activeModule && typedResearch.stages) {
            stage = typedResearch.stages.find((s: Stage) =>
                s.modules?.some((m: Module) => m.id === activeModule.id) &&
                (s.name.toLowerCase().includes('smart voc') || s.name.toLowerCase() === 'smart voc')
            );
        }

        return stage || null;
    }, [typedResearch, activeModule, activeStageFromUrl]);

    const smartVOCModules = useMemo((): Module[] => {
        if (!smartVOCStage || !smartVOCStage.modules) return [];
        // Mantener el mismo orden que viene del backend (igual que en el sidebar)
        // El sidebar muestra los módulos en el orden que vienen de stage.modules
        return [...smartVOCStage.modules].sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
    }, [smartVOCStage]);

    const isSmartVOCStage = smartVOCStage !== null && (
        (stageId && smartVOCStage.id === stageId) ||
        !activeModuleId ||
        smartVOCModules.some(m => m.id === activeModuleId)
    );

    // Cognitive Tasks stage logic (same structure as Smart VOC)
    const cognitiveTasksStage = useMemo((): Stage | null => {
        if (!typedResearch?.stages) return null;

        // Check if activeStageFromUrl is Cognitive Tasks
        if (activeStageFromUrl && (
            activeStageFromUrl.name.toLowerCase().includes('cognitive task') ||
            activeStageFromUrl.name.toLowerCase() === 'cognitive tasks'
        )) {
            return activeStageFromUrl;
        }

        let stage = typedResearch.stages.find((s: Stage) =>
            s.name.toLowerCase().includes('cognitive task') ||
            s.name.toLowerCase() === 'cognitive tasks'
        );

        if (!stage && activeModule && typedResearch.stages) {
            stage = typedResearch.stages.find((s: Stage) =>
                s.modules?.some((m: Module) => m.id === activeModule.id) &&
                (s.name.toLowerCase().includes('cognitive task') || s.name.toLowerCase() === 'cognitive tasks')
            );
        }

        return stage || null;
    }, [typedResearch, activeModule, activeStageFromUrl]);

    const cognitiveTaskModules = useMemo((): Module[] => {
        if (!cognitiveTasksStage || !cognitiveTasksStage.modules) return [];
        return [...cognitiveTasksStage.modules].sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
    }, [cognitiveTasksStage]);

    const isCognitiveTasksStage = cognitiveTasksStage !== null && (
        (stageId && cognitiveTasksStage.id === stageId) ||
        !activeModuleId ||
        cognitiveTaskModules.some(m => m.id === activeModuleId)
    );

    // Check if current module is Research Configuration
    const isResearchConfigModule = activeModule?.name === 'Research Configuration';

    const { components, componentValues, setComponentValues } = useModuleComponents(activeModule);

    // Initialize componentValues from config for Research Configuration module
    useEffect(() => {
        if (isResearchConfigModule && activeModule?.config) {
            const flatConfig = flattenResearchConfig(activeModule.config);
            setComponentValues(prev => ({
                ...prev,
                ...flatConfig
            }));
        }
    }, [isResearchConfigModule, activeModule, setComponentValues]);

    // Refs for SmartVOC module cards to access their component values
    const smartVOCModuleRefs = useRef<Map<string, SmartVOCModuleCardRef>>(new Map());

    // Refs for Cognitive Task module cards to access their component values
    const cognitiveTaskModuleRefs = useRef<Map<string, CognitiveTaskModuleCardRef>>(new Map());

    // Refs for DOM elements to scroll to modules
    const smartVOCModuleElementRefs = useRef<Map<string, HTMLDivElement>>(new Map());
    const cognitiveTaskModuleElementRefs = useRef<Map<string, HTMLDivElement>>(new Map());

    // Function to scroll to a specific module
    const scrollToModule = useCallback((moduleId: string, type: 'smartvoc' | 'cognitive') => {
        const refs = type === 'smartvoc' ? smartVOCModuleElementRefs : cognitiveTaskModuleElementRefs;
        const element = refs.current.get(moduleId);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }, []);

    useWelcomeScreenRedirect(typedResearch, loading, activeModuleId, isSettings, id);

    const [isSaving, setIsSaving] = useState(false);

    // State for module template selection modal
    const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
    const [selectedStage, setSelectedStage] = useState<Stage | null>(null);

    // State for locally ordered Smart VOC modules (for drag & drop)
    const [orderedSmartVOCModules, setOrderedSmartVOCModules] = useState<Module[]>(smartVOCModules);

    // Update ordered modules when smartVOCModules changes (e.g., after save)
    useEffect(() => {
        setOrderedSmartVOCModules(smartVOCModules);
    }, [smartVOCModules]);

    // Configure sensors for drag & drop
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    // Handle drag end for Smart VOC modules reordering
    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;

        if (!over || active.id === over.id) return;

        const oldIndex = orderedSmartVOCModules.findIndex(m => m.id === active.id);
        const newIndex = orderedSmartVOCModules.findIndex(m => m.id === over.id);

        if (oldIndex === -1 || newIndex === -1) return;

        const reordered = arrayMove(orderedSmartVOCModules, oldIndex, newIndex);
        setOrderedSmartVOCModules(reordered);

        // Update order_index in backend
        if (smartVOCStage) {
            try {
                const updates = reordered.map((module, index) => ({
                    moduleId: module.id,
                    order_index: index,
                }));

                await modulesService.updateModulesOrder(smartVOCStage.id, updates);
                toast.success('Modules reordered successfully');
                
                // Invalidate and refetch research data to sync with backend
                if (id) {
                    await queryClient.invalidateQueries({ queryKey: researchKeys.detail(id) });
                }
            } catch (error) {
                console.error('Error reordering modules:', error);
                toast.error('Failed to save new order');
                // Revert to original order
                setOrderedSmartVOCModules(smartVOCModules);
            }
        }
    };

    /**
     * Safely extracts a string from an unknown value.
     * @param value - Unknown value
     * @returns String if value is a string, otherwise undefined
     */
    const toOptionalString = (value: unknown): string | undefined => {
        return typeof value === 'string' ? value : undefined;
    };

    /**
     * Sanitizes the serialized value of a file-upload component by removing ephemeral presigned URL fields.
     * This prevents persisting time-limited S3 URLs into module configuration.
     * @param serialized - Serialized component value (usually JSON)
     * @returns Sanitized serialized value
     */
    const sanitizeFileUploadSerializedValue = (serialized: string | undefined): string | undefined => {
        if (!serialized) {
            return serialized;
        }

        const isRecord = (value: unknown): value is Record<string, unknown> =>
            typeof value === 'object' && value !== null;

        const stripUrlFields = (value: unknown): unknown => {
            if (Array.isArray(value)) {
                return value.map(stripUrlFields);
            }
            if (!isRecord(value)) {
                return value;
            }

            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { url: _url, urlExpiresAt: _urlExpiresAt, ...rest } = value;
            return rest;
        };

        try {
            const parsed = JSON.parse(serialized) as unknown;
            const sanitized = stripUrlFields(parsed);
            return JSON.stringify(sanitized);
        } catch {
            return serialized;
        }
    };

    const handleSaveModule = async (): Promise<void> => {
        if (!id) return;

        try {
            setIsSaving(true);

            if (isSmartVOCStage && orderedSmartVOCModules.length > 0) {
                // Save all Smart VOC modules with their current component values
                // Use orderedSmartVOCModules instead of smartVOCModules to preserve the reordered state
                const updatePromises = orderedSmartVOCModules.map((module, index) => {
                    const moduleRef = smartVOCModuleRefs.current.get(module.id);
                    if (!moduleRef) {
                        console.warn(`No ref found for module ${module.id}`);
                        // Fallback: use existing config if ref not available
                        return modulesService.update(module.id, {
                            config: module.config,
                            order: index // Use the index from the reordered array
                        });
                    }

                    // Get current component values from the ref
                    const currentComponentValues = moduleRef.getComponentValues();
                    const currentComponents = moduleRef.getComponents();
                    const required = moduleRef.getRequired();

                    // Update components with new values
                    const updatedComponents = currentComponents.map(comp => ({
                        ...comp,
                        value: comp.type === 'file-upload'
                            ? sanitizeFileUploadSerializedValue(currentComponentValues[comp.id] || comp.value)
                            : (currentComponentValues[comp.id] || comp.value)
                    }));

                    // Preserve the correct backend structure
                    const configWithStructure = {
                        ...module.config,
                        structure: {
                            ...(module.config.structure || {}),
                            components: updatedComponents
                        }
                    };

                    // Automatically set hidden based on whether module has configured values
                    // If module has values → show to participants (hidden: false)
                    // If module has no values → hide from participants (hidden: true)
                    // This allows researchers to configure modules later and they'll automatically show
                    const hasConfiguredValues = hasModuleConfiguredValues(updatedComponents);
                    const finalHidden = !hasConfiguredValues;

                    const config = withModuleHidden(withModuleRequired(configWithStructure, required), finalHidden);

                    return modulesService.update(module.id, {
                        config,
                        order: index // Use the index from the reordered array instead of module.order_index
                    });
                });
                await Promise.all(updatePromises);
                toast.success(`Saved ${orderedSmartVOCModules.length} Smart VOC module(s) successfully`);
                
                // Invalidate and refetch research data to update the UI
                if (id) {
                    await queryClient.invalidateQueries({ queryKey: researchKeys.detail(id) });
                }
            } else if (isCognitiveTasksStage && cognitiveTaskModules.length > 0) {
                // Save all Cognitive Task modules with their current component values (same structure as Smart VOC)
                const updatePromises = cognitiveTaskModules.map(module => {
                    const moduleRef = cognitiveTaskModuleRefs.current.get(module.id);
                    if (!moduleRef) {
                        console.warn(`No ref found for module ${module.id}`);
                        return modulesService.update(module.id, {
                            config: module.config,
                            order: module.order_index
                        });
                    }

                    const currentComponentValues = moduleRef.getComponentValues();
                    const currentComponents = moduleRef.getComponents();
                    const required = moduleRef.getRequired();

                    const updatedComponents = currentComponents.map(comp => ({
                        ...comp,
                        value: comp.type === 'file-upload'
                            ? sanitizeFileUploadSerializedValue(currentComponentValues[comp.id] || comp.value)
                            : (currentComponentValues[comp.id] || comp.value)
                    }));

                    const configWithStructure = {
                        ...module.config,
                        structure: {
                            ...(module.config.structure || {}),
                            components: updatedComponents
                        }
                    };

                    // Automatically set hidden based on whether module has configured values
                    // If module has values → show to participants (hidden: false)
                    // If module has no values → hide from participants (hidden: true)
                    // This allows researchers to configure modules later and they'll automatically show
                    const hasConfiguredValues = hasModuleConfiguredValues(updatedComponents);
                    const finalHidden = !hasConfiguredValues;

                    const config = withModuleHidden(withModuleRequired(configWithStructure, required), finalHidden);

                    return modulesService.update(module.id, {
                        config,
                        order: module.order_index
                    });
                });
                await Promise.all(updatePromises);
                toast.success(`Saved ${cognitiveTaskModules.length} Cognitive Task module(s) successfully`);
                
                // Invalidate and refetch research data to update the UI
                if (id) {
                    await queryClient.invalidateQueries({ queryKey: researchKeys.detail(id) });
                }
            } else if (activeModule) {
                // Special handling for Research Configuration module
                if (isResearchConfigModule) {
                    // Transform componentValues into structured config
                    const structuredConfig = transformResearchConfigComponentValues(componentValues);

                    // Preserve other config properties but overwrite the structured ones
                    const config = {
                        ...activeModule.config,
                        ...structuredConfig
                    };

                    await modulesService.update(activeModule.id, {
                        config,
                        order: activeModule.order_index
                    });
                    toast.success('Research Configuration saved successfully');
                } else {
                    // Update components with new values while preserving structure
                    const updatedComponents = components.map(comp => ({
                        ...comp,
                        // Update default value or value from componentValues
                        ...(comp.settings?.readonly
                            ? {
                                settings: {
                                    ...comp.settings,
                                    defaultValue: comp.type === 'file-upload'
                                        ? (sanitizeFileUploadSerializedValue(
                                            toOptionalString(componentValues[comp.id]) ?? toOptionalString(comp.settings.defaultValue)
                                        ) ?? toOptionalString(comp.settings.defaultValue))
                                        : (toOptionalString(componentValues[comp.id]) ?? toOptionalString(comp.settings.defaultValue)),
                                },
                            }
                            : {
                                value: comp.type === 'file-upload'
                                    ? sanitizeFileUploadSerializedValue(toOptionalString(componentValues[comp.id]))
                                    : toOptionalString(componentValues[comp.id]),
                            }
                        )
                    }));

                    // Preserve the correct backend structure: { structure: { components: [...] } }
                    const config = {
                        ...activeModule.config,
                        structure: {
                            ...(activeModule.config.structure || {}),
                            components: updatedComponents
                        }
                    };

                    await modulesService.update(activeModule.id, {
                        config,
                        order: activeModule.order_index
                    });
                    toast.success('Module saved successfully');
                }
            }

            // Invalidate and refetch research data to update the UI
            if (id) {
                await queryClient.invalidateQueries({ queryKey: researchKeys.detail(id) });
            }
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to save module';
            toast.error(errorMessage);
            console.error('Save module error:', error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleComponentValueChange = useCallback((componentId: string, value: string): void => {
        setComponentValues((prev) => ({
            ...prev,
            [componentId]: value,
        }));
    }, [setComponentValues]);

    /**
     * Opens the module template selection modal for a specific stage
     */
    const handleOpenTemplateModal = useCallback((stage: Stage) => {
        setSelectedStage(stage);
        setIsTemplateModalOpen(true);
    }, []);

    /**
     * Creates a module from a selected template
     */
    const handleCreateModuleFromTemplate = useCallback(async (templateId: string) => {
        if (!id || !selectedStage) {
            toast.error('Missing research or stage information');
            return;
        }

        try {
            // Calculate next order_index
            const existingModules = selectedStage.modules || [];
            const nextOrderIndex = existingModules.length;

            await modulesService.createFromTemplate({
                research_id: id,
                stage_id: selectedStage.id,
                template_id: templateId,
                order_index: nextOrderIndex
            });

            // Invalidate and refetch research data
            await queryClient.invalidateQueries({ queryKey: researchKeys.detail(id) });

            toast.success('Module added successfully');
        } catch (error) {
            console.error('Failed to create module from template:', error);
            throw error; // Re-throw to let modal handle it
        }
    }, [id, selectedStage, queryClient, toast]);

    // Loading state
    if (loading) {
        return <LoadingErrorStates type="loading" />;
    }

    // Error state
    if (error || !typedResearch) {
        return <LoadingErrorStates type="error" error={error} onBack={() => navigate('/research')} />;
    }

    return (
        <div className="h-full w-full flex flex-col p-4 sm:p-5 lg:p-6 overflow-hidden">
            <div className="flex-shrink-0 mb-4 sm:mb-5 lg:mb-6">
                <ResearchBuilderHeader
                    research={typedResearch}
                    activeModule={isSmartVOCStage || isCognitiveTasksStage ? null : activeModule}
                    isSettings={isSettings}
                    isSaving={isSaving}
                    onSave={handleSaveModule}
                    isSmartVOCStage={isSmartVOCStage}
                    smartVOCStageName={smartVOCStage?.name}
                    isCognitiveTasksStage={isCognitiveTasksStage}
                    cognitiveTasksStageName={cognitiveTasksStage?.name}
                />
            </div>

            {/* Content Area */}
            <div className="flex-1 min-h-0 overflow-auto">
                {isSettings && <ResearchSettingsView research={typedResearch} />}

                {/* Smart VOC Stage: Show all modules in the same view with drag & drop */}
                {isSmartVOCStage && smartVOCModules.length > 0 && (
                    <div className="space-y-6">
                    <div className="mb-4 flex items-start justify-between gap-4">
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900">Smart VOC - All Questions</h2>
                            <p className="text-sm text-gray-500 mt-1">
                                Configure all Smart VOC questions in this unified view. Drag the handle to reorder.
                            </p>
                        </div>
                        <div className="flex-shrink-0 w-48">
                            <Select
                                placeholder="Jump to module..."
                                options={orderedSmartVOCModules.map(m => ({ value: m.id, label: m.name }))}
                                onChange={(e) => scrollToModule(e.target.value, 'smartvoc')}
                                value=""
                            />
                        </div>
                    </div>
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                    >
                        <SortableContext
                            items={orderedSmartVOCModules.map(m => m.id)}
                            strategy={verticalListSortingStrategy}
                        >
                            {orderedSmartVOCModules.map((module) => (
                                <div
                                    key={module.id}
                                    ref={(el) => {
                                        if (el) {
                                            smartVOCModuleElementRefs.current.set(module.id, el);
                                        } else {
                                            smartVOCModuleElementRefs.current.delete(module.id);
                                        }
                                    }}
                                >
                                    <SortableSmartVOCCard module={module}>
                                        <SmartVOCModuleCard
                                            ref={(ref) => {
                                                if (ref) {
                                                    smartVOCModuleRefs.current.set(module.id, ref);
                                                } else {
                                                    smartVOCModuleRefs.current.delete(module.id);
                                                }
                                            }}
                                            module={module}
                                            researchId={id!}
                                            onSave={handleSaveModule}
                                            isActive={activeModuleId === module.id}
                                        />
                                    </SortableSmartVOCCard>
                                </div>
                            ))}
                        </SortableContext>
                    </DndContext>
                    </div>
                )}

                {/* Smart VOC Stage Empty State */}
                {isSmartVOCStage && smartVOCModules.length === 0 && smartVOCStage && (
                    <StageEmptyState
                        stageName={smartVOCStage.name}
                        stageType="smart-voc"
                        onAddModule={() => handleOpenTemplateModal(smartVOCStage)}
                    />
                )}

                {/* Cognitive Tasks Stage: Show all modules in the same view (same structure as Smart VOC) */}
                {isCognitiveTasksStage && cognitiveTaskModules.length > 0 && (
                    <div className="space-y-6">
                    <div className="mb-4 flex items-start justify-between gap-4">
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900">Cognitive Tasks - All Tasks</h2>
                            <p className="text-sm text-gray-500 mt-1">
                                Configure all Cognitive Task modules in this unified view
                            </p>
                        </div>
                        <div className="flex-shrink-0 w-48">
                            <Select
                                placeholder="Jump to module..."
                                options={cognitiveTaskModules.map(m => ({ value: m.id, label: m.name }))}
                                onChange={(e) => scrollToModule(e.target.value, 'cognitive')}
                                value=""
                            />
                        </div>
                    </div>
                    {cognitiveTaskModules.map((module) => (
                        <div
                            key={module.id}
                            ref={(el) => {
                                if (el) {
                                    cognitiveTaskModuleElementRefs.current.set(module.id, el);
                                } else {
                                    cognitiveTaskModuleElementRefs.current.delete(module.id);
                                }
                            }}
                        >
                            <CognitiveTaskModuleCard
                                ref={(ref) => {
                                    if (ref) {
                                        cognitiveTaskModuleRefs.current.set(module.id, ref);
                                    } else {
                                        cognitiveTaskModuleRefs.current.delete(module.id);
                                    }
                                }}
                                module={module}
                                researchId={id!}
                                onSave={handleSaveModule}
                                isActive={activeModuleId === module.id}
                            />
                        </div>
                    ))}
                    </div>
                )}

                {/* Cognitive Tasks Stage Empty State */}
                {isCognitiveTasksStage && cognitiveTaskModules.length === 0 && cognitiveTasksStage && (
                    <StageEmptyState
                        stageName={cognitiveTasksStage.name}
                        stageType="cognitive-tasks"
                        onAddModule={() => handleOpenTemplateModal(cognitiveTasksStage)}
                    />
                )}

                {/* Regular module view: Show single module */}
                {!isSmartVOCStage && !isCognitiveTasksStage && !isResearchConfigModule && activeModule && (
                    <div className="space-y-6">
                        <div className="rounded-lg shadow-sm border border-gray-100 p-4 sm:p-5 lg:p-6">
                            <ModuleContentEditor
                                components={components}
                                componentValues={componentValues}
                                onValueChange={handleComponentValueChange}
                                researchId={id}
                            />
                        </div>
                    </div>
                )}

                {/* Research Configuration module: Show custom component */}
                {!isSmartVOCStage && !isCognitiveTasksStage && isResearchConfigModule && activeModule && (
                    <div className="space-y-6">
                        <div className="rounded-lg shadow-sm border border-gray-100 p-4 sm:p-5 lg:p-6">
                            <ResearchConfigurationModule
                                config={transformResearchConfigComponentValues(componentValues)}
                                onChange={(newConfig) => {
                                    Object.keys(newConfig).forEach(key => {
                                        if (key === 'demographics') {
                                            Object.entries(newConfig[key] as Record<string, any>).forEach(([subKey, val]) => {
                                                const valueToSave = typeof val === 'object' ? JSON.stringify(val) : String(val);
                                                handleComponentValueChange(subKey, valueToSave);
                                            });
                                        } else if (key === 'linkConfig') {
                                            Object.entries(newConfig[key] as Record<string, boolean>).forEach(([subKey, val]) => {
                                                handleComponentValueChange(subKey, String(val));
                                            });
                                        } else if (key === 'backlinks') {
                                            Object.entries(newConfig[key] as Record<string, string>).forEach(([subKey, val]) => {
                                                handleComponentValueChange(subKey, val);
                                            });
                                        } else {
                                            handleComponentValueChange(key, String(newConfig[key]));
                                        }
                                    });
                                }}
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* Module Template Selection Modal */}
            <ModuleTemplateSelectionModal
                isOpen={isTemplateModalOpen}
                onClose={() => {
                    setIsTemplateModalOpen(false);
                    setSelectedStage(null);
                }}
                onSelect={handleCreateModuleFromTemplate}
                stageType={selectedStage?.stage_type}
            />
        </div>
    );
};

// Helper function to transform componentValues into structured config for Research Configuration
const transformResearchConfigComponentValues = (values: Record<string, string>): Record<string, unknown> => {
    // Initialize structured config
    const config: Record<string, unknown> = {
        demographics: {},
        linkConfig: {},
        backlinks: {},
        participantLimit: 50,
        researchUrl: ''
    };

    // Helper to try parsing JSON or return original
    const tryParse = (val: string) => {
        if (val === 'true') return true;
        if (val === 'false') return false;
        try {
            const parsed = JSON.parse(val);
            if (typeof parsed === 'object' && parsed !== null) return parsed;
        } catch {
            // ignore
        }
        return val;
    };

    // Process each component value
    Object.entries(values).forEach(([key, value]) => {
        // Handle demographics
        if (['age', 'country', 'gender', 'educationLevel', 'annualIncome', 'employmentStatus', 'dailyHoursOnline', 'technicalProficiency'].includes(key)) {
            (config.demographics as Record<string, any>)[key] = tryParse(value);
        }
        // Handle link configuration
        else if (['allowMobile', 'trackLocation', 'allowMultiple'].includes(key)) {
            (config.linkConfig as Record<string, boolean>)[key] = value === 'true';
        }
        // Handle backlinks
        else if (['complete', 'disqualified', 'overquota'].includes(key)) {
            (config.backlinks as Record<string, string>)[key] = value;
        }
        // Handle research URL
        else if (key === 'researchUrl') {
            config.researchUrl = value;
        }
        // Handle participant limit
        else if (key === 'participantLimit') {
            config.participantLimit = parseInt(value) || 50;
        }
    });

    return config;
};

// Helper function to flatten nested config into componentValues
const flattenResearchConfig = (config: Record<string, unknown>): Record<string, string> => {
    const values: Record<string, string> = {};

    if (config.demographics) {
        Object.entries(config.demographics as Record<string, any>).forEach(([key, value]) => {
            if (typeof value === 'object' && value !== null) {
                values[key] = JSON.stringify(value);
            } else {
                values[key] = String(value);
            }
        });
    }

    if (config.linkConfig) {
        Object.entries(config.linkConfig as Record<string, boolean>).forEach(([key, value]) => {
            values[key] = String(value);
        });
    }

    if (config.backlinks) {
        Object.entries(config.backlinks as Record<string, string>).forEach(([key, value]) => {
            values[key] = value;
        });
    }

    if (config.researchUrl) {
        values.researchUrl = String(config.researchUrl);
    }

    if (config.participantLimit !== undefined) {
        values.participantLimit = String(config.participantLimit);
    }

    return values;
};
