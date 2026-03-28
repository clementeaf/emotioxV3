import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useResearch, researchKeys } from '../../hooks/useResearchQuery';
import { researchService, type Research, type Stage, type Module } from '../../services/research.service';
import { useWelcomeScreenRedirect } from '../../hooks/useWelcomeScreenRedirect';
import { useModuleComponents } from '../../hooks/useModuleComponents';
import { ResearchBuilderHeader } from '../../components/research/ResearchBuilderHeader';
import { ResearchSettingsView } from '../../components/research/ResearchSettingsView';
import { ModuleContentEditor } from '../../components/research/ModuleContentEditor';
import { SmartVOCModuleCard, type SmartVOCModuleCardRef } from '../../components/research/SmartVOCModuleCard';
import { CognitiveTaskModuleCard, type CognitiveTaskModuleCardRef } from '../../components/research/CognitiveTaskModuleCard';
import { ResearchConfigurationModule } from '../../components/research/ResearchConfigurationModule';
import { ModuleTemplateSelectionModal } from '../../components/research/ModuleTemplateSelectionModal';
import { StageEmptyState } from '../../components/research/StageEmptyState';
import { LoadingErrorStates } from '../../components/research/LoadingErrorStates';
import { useToast } from '../../hooks/useToast';
import { modulesService } from '../../services/modules.service';
import { moduleTemplatesService } from '../../services/moduleTemplates.service';
import { withModuleConditionality, withModuleConditionalityConfig, withModuleHidden, withModuleRequired } from '../../utils/moduleRequired';
import type { StudyModuleOption } from '../../components/research/ConditionalityModal';
import type { ComponentConfig } from '../../types/moduleBuilder.types';

export interface EnabledDemographic {
    key: string;
    label: string;
    validValues: string[];
}

const DEMOGRAPHIC_LABELS: Record<string, string> = {
    age: 'Age',
    country: 'Country',
    gender: 'Gender',
    educationLevel: 'Education Level',
    annualIncome: 'Annual Income',
    employmentStatus: 'Employment Status',
    dailyHoursOnline: 'Daily Hours Online',
    technicalProficiency: 'Technical Proficiency',
};

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
        (!stageId && !activeModuleId) ||
        smartVOCModules.some(m => m.id === activeModuleId)
    );

    // Generic collection stage logic: any module_collection stage that is NOT Smart VOC
    // Covers Cognitive Tasks, Implicit Association, and any future collection stages
    const collectionStage = useMemo((): Stage | null => {
        if (!typedResearch?.stages) return null;

        const isSmartVOCName = (name: string) =>
            name.toLowerCase().includes('smart voc') || name.toLowerCase() === 'smart voc';

        const isCollectionStage = (s: Stage) =>
            s.stage_type === 'module_collection' && !isSmartVOCName(s.name);

        // Check if activeStageFromUrl is a collection stage (not Smart VOC)
        if (activeStageFromUrl && isCollectionStage(activeStageFromUrl)) {
            return activeStageFromUrl;
        }

        // If active module belongs to a collection stage, use that
        if (activeModule && typedResearch.stages) {
            const stage = typedResearch.stages.find((s: Stage) =>
                isCollectionStage(s) && s.modules?.some((m: Module) => m.id === activeModule.id)
            );
            if (stage) return stage;
        }

        return null;
    }, [typedResearch, activeModule, activeStageFromUrl]);

    const collectionModules = useMemo((): Module[] => {
        if (!collectionStage || !collectionStage.modules) return [];
        return [...collectionStage.modules].sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
    }, [collectionStage]);

    const isCollectionStageActive = collectionStage !== null && (
        (stageId && collectionStage.id === stageId) ||
        collectionModules.some(m => m.id === activeModuleId)
    );

    // Extract enabled demographics from Research Configuration
    const enabledDemographics = useMemo((): EnabledDemographic[] => {
        if (!typedResearch?.stages) return [];
        for (const stage of typedResearch.stages) {
            for (const mod of stage.modules || []) {
                if (mod.name === 'Research Configuration' && mod.config?.demographics) {
                    const demographics = mod.config.demographics as Record<string, unknown>;
                    const result: EnabledDemographic[] = [];
                    for (const [key, v] of Object.entries(demographics)) {
                        if (typeof v === 'object' && v !== null && 'enabled' in v) {
                            const demo = v as { enabled: boolean; validValues?: string[] };
                            if (demo.enabled) {
                                result.push({
                                    key,
                                    label: DEMOGRAPHIC_LABELS[key] || key,
                                    validValues: demo.validValues || [],
                                });
                            }
                        }
                    }
                    return result;
                }
            }
        }
        return [];
    }, [typedResearch]);

    // Build list of study modules with choice options for conditionality
    const studyModulesWithOptions = useMemo((): StudyModuleOption[] => {
        const allModules = [...smartVOCModules, ...collectionModules];
        const result: StudyModuleOption[] = [];
        for (const mod of allModules) {
            if (mod.name !== 'Single Choice' && mod.name !== 'Multiple Choice') continue;
            const structure = (mod.config?.structure as { components?: ComponentConfig[] } | undefined);
            const components = structure?.components || [];
            const choices = components.filter(c => c.settings?.isChoice || c.id.includes('choice-'));
            if (choices.length === 0) continue;
            const options = choices
                .map(c => {
                    const defaultVal = typeof c.settings?.defaultValue === 'string' ? c.settings.defaultValue : '';
                    const label = (c.value && typeof c.value === 'string' && c.value.trim())
                        || defaultVal
                        || c.label
                        || c.id;
                    return { id: c.id, label };
                })
                .filter(o => o.label.trim().length > 0);
            if (options.length === 0) continue;
            result.push({
                id: mod.id,
                name: mod.name + (mod.description ? ` - ${mod.description}` : ''),
                orderIndex: mod.order_index,
                componentId: 'choice',
                options,
            });
        }
        return result;
    }, [smartVOCModules, collectionModules]);

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
    const collectionModuleRefs = useRef<Map<string, CognitiveTaskModuleCardRef>>(new Map());

    // Refs for DOM elements to scroll to modules
    const smartVOCModuleElementRefs = useRef<Map<string, HTMLDivElement>>(new Map());
    const collectionModuleElementRefs = useRef<Map<string, HTMLDivElement>>(new Map());

    // Function to scroll to a specific module
    const scrollToModule = useCallback((moduleId: string, type: 'smartvoc' | 'cognitive') => {
        const refs = type === 'smartvoc' ? smartVOCModuleElementRefs : collectionModuleElementRefs;
        const element = refs.current.get(moduleId);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }, []);

    // Move a module up or down within its stage
    const handleMoveModule = useCallback(async (
        modules: Module[],
        stage: Stage,
        index: number,
        direction: 'up' | 'down'
    ) => {
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= modules.length) return;

        // Build new order
        const reordered = [...modules];
        [reordered[index], reordered[targetIndex]] = [reordered[targetIndex], reordered[index]];

        const updates = reordered.map((m, i) => ({ moduleId: m.id, order_index: i }));

        try {
            await modulesService.updateModulesOrder(stage.id, updates);
            await queryClient.invalidateQueries({ queryKey: researchKeys.detail(id!) });
        } catch (err) {
            console.error('Failed to reorder modules:', err);
            toast.error('Failed to reorder modules');
        }
    }, [id, queryClient, toast]);

    useWelcomeScreenRedirect(typedResearch, loading, activeModuleId, isSettings, id);

    const [isSaving, setIsSaving] = useState(false);

    // State for module template selection modal
    const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
    const [selectedStage, setSelectedStage] = useState<Stage | null>(null);

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

    /** Sync rankingConfig.items from comp.value for ranking/ranking-list components */
    const syncRankingConfig = <T extends { type: string; value?: string; rankingConfig?: { items?: unknown[] } }>(comp: T): T => {
        if ((comp.type === 'ranking' || comp.type === 'ranking-list') && comp.value) {
            try {
                const parsed = JSON.parse(comp.value);
                if (Array.isArray(parsed)) {
                    return { ...comp, rankingConfig: { ...comp.rankingConfig, items: parsed } };
                }
            } catch { /* keep original */ }
        }
        return comp;
    };

    const handleDeleteModule = async (moduleId: string): Promise<void> => {
        if (!id) return;
        try {
            await researchService.deleteModule(id, moduleId);
            // Invalidate React Query cache to refetch research data
            queryClient.invalidateQueries({ queryKey: researchKeys.detail(id) });
        } catch (err) {
            console.error('Failed to delete module:', err);
            alert('Failed to delete module. Please try again.');
        }
    };

    /** Persists a module: creates new local modules, updates existing ones */
    const saveOrCreateModule = async (module: Module, config: Record<string, unknown>, stageId?: string) => {
        const isLocal = module.id.startsWith('local-');
        if (isLocal) {
            return modulesService.create({
                research_id: id!,
                stage_id: stageId,
                name: module.name,
                description: module.description,
                order_index: module.order_index,
                config,
            });
        }
        return modulesService.update(module.id, { config, order: module.order_index });
    };

    const handleSaveModule = async (): Promise<void> => {
        if (!id) return;

        try {
            setIsSaving(true);

            if (isSmartVOCStage && smartVOCModules.length > 0) {
                // Save all Smart VOC modules with their current component values
                const updatePromises = smartVOCModules.map((module) => {
                    const moduleRef = smartVOCModuleRefs.current.get(module.id);
                    if (!moduleRef) {
                        console.warn(`No ref found for module ${module.id}`);
                        return saveOrCreateModule(module, module.config, smartVOCStage?.id);
                    }

                    const currentComponentValues = moduleRef.getComponentValues();
                    const currentComponents = moduleRef.getComponents();
                    const required = moduleRef.getRequired();

                    const updatedComponents = currentComponents.map(comp => syncRankingConfig({
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

                    const hidden = moduleRef.getHidden();
                    const conditionality = moduleRef.getConditionality();
                    const ccConfig = moduleRef.getConditionalityConfig();

                    const config = withModuleConditionalityConfig(
                        withModuleConditionality(withModuleHidden(withModuleRequired(configWithStructure, required), hidden), conditionality),
                        conditionality ? ccConfig : null
                    );

                    return saveOrCreateModule(module, config, smartVOCStage?.id);
                });
                await Promise.all(updatePromises);
                toast.success(`Saved ${smartVOCModules.length} Smart VOC module(s) successfully`);
                
                // Invalidate and refetch research data to update the UI
                if (id) {
                    await queryClient.invalidateQueries({ queryKey: researchKeys.detail(id) });
                }
            } else if (isCollectionStageActive && collectionModules.length > 0) {
                // Save all Cognitive Task modules with their current component values (same structure as Smart VOC)
                const updatePromises = collectionModules.map(module => {
                    const moduleRef = collectionModuleRefs.current.get(module.id);
                    if (!moduleRef) {
                        console.warn(`No ref found for module ${module.id}`);
                        return saveOrCreateModule(module, module.config, collectionStage?.id);
                    }

                    const currentComponentValues = moduleRef.getComponentValues();
                    const currentComponents = moduleRef.getComponents();
                    const required = moduleRef.getRequired();

                    const updatedComponents = currentComponents.map(comp => syncRankingConfig({
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

                    const hidden = moduleRef.getHidden();
                    const conditionality = moduleRef.getConditionality();
                    const ccConfig = moduleRef.getConditionalityConfig();

                    const config = withModuleConditionalityConfig(
                        withModuleConditionality(withModuleHidden(withModuleRequired(configWithStructure, required), hidden), conditionality),
                        conditionality ? ccConfig : null
                    );

                    return saveOrCreateModule(module, config, collectionStage?.id);
                });
                await Promise.all(updatePromises);
                toast.success(`Saved ${collectionModules.length} ${collectionStage?.name || 'collection'} module(s) successfully`);
                
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
                    const updatedComponents = components.map(comp => syncRankingConfig({
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
            // Fetch template structure
            const template = await moduleTemplatesService.getById(templateId);

            // Parse structure if it comes as a JSON string from MySQL
            const structure = typeof template.structure === 'string'
                ? JSON.parse(template.structure)
                : template.structure;

            const freshStage = typedResearch?.stages?.find((s: Stage) => s.id === selectedStage.id);
            const existingModules = freshStage?.modules || selectedStage.modules || [];
            const nextOrderIndex = existingModules.length;

            // Create local module (not persisted yet — saved on "Save")
            const newModule: Module = {
                id: `local-${crypto.randomUUID()}`,
                name: template.name,
                description: template.description || '',
                order_index: nextOrderIndex,
                is_from_template: true,
                config: { structure },
                questions: [],
            };

            // Inject into React Query cache so it renders immediately
            queryClient.setQueryData(researchKeys.detail(id), (old: Research | undefined) => {
                if (!old) return old;
                return {
                    ...old,
                    stages: old.stages?.map((s: Stage) =>
                        s.id === selectedStage.id
                            ? { ...s, modules: [...(s.modules || []), newModule] }
                            : s
                    ),
                };
            });

            toast.success('Module added');

            // Scroll to the new module
            const scrollType = selectedStage.stage_type === 'single_module' ? 'smartvoc' : 'cognitive';
            requestAnimationFrame(() => {
                setTimeout(() => scrollToModule(newModule.id, scrollType), 100);
            });
        } catch (error) {
            console.error('Failed to add module from template:', error);
            throw error;
        }
    }, [id, selectedStage, typedResearch, queryClient, toast, scrollToModule]);

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
                    activeModule={isSmartVOCStage || isCollectionStageActive ? null : activeModule}
                    isSettings={isSettings}
                    isSaving={isSaving}
                    onSave={handleSaveModule}
                    isSmartVOCStage={isSmartVOCStage}
                    smartVOCStageName={smartVOCStage?.name}
                    isCollectionStage={isCollectionStageActive}
                    collectionStageName={collectionStage?.name}
                    modules={isSmartVOCStage ? smartVOCModules : isCollectionStageActive ? collectionModules : []}
                    onModuleJump={(moduleId) => {
                        if (isSmartVOCStage) {
                            scrollToModule(moduleId, 'smartvoc');
                        } else if (isCollectionStageActive) {
                            scrollToModule(moduleId, 'cognitive');
                        }
                    }}
                />
            </div>

            {/* Content Area */}
            <div className="flex-1 min-h-0 overflow-auto">
                {isSettings && <ResearchSettingsView research={typedResearch} />}

                {/* Smart VOC Stage: Show all modules in the same view */}
                {isSmartVOCStage && smartVOCModules.length > 0 && (
                    <div className="space-y-6">
                    {smartVOCModules.map((module, idx) => (
                        <div
                            key={module.id}
                            ref={(el) => {
                                if (el) {
                                    smartVOCModuleElementRefs.current.set(module.id, el);
                                } else {
                                    smartVOCModuleElementRefs.current.delete(module.id);
                                }
                            }}
                            className="flex gap-2 items-start"
                        >
                            {/* Reorder arrows */}
                            {smartVOCModules.length > 1 && (
                                <div className="flex flex-col gap-1 pt-4 flex-shrink-0">
                                    <button
                                        onClick={() => handleMoveModule(smartVOCModules, smartVOCStage!, idx, 'up')}
                                        disabled={idx === 0}
                                        className="p-1 rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
                                        title="Move up"
                                    >
                                        <svg className="w-5 h-5 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
                                        </svg>
                                    </button>
                                    <button
                                        onClick={() => handleMoveModule(smartVOCModules, smartVOCStage!, idx, 'down')}
                                        disabled={idx === smartVOCModules.length - 1}
                                        className="p-1 rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
                                        title="Move down"
                                    >
                                        <svg className="w-5 h-5 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                                        </svg>
                                    </button>
                                </div>
                            )}
                            <div className="flex-1 min-w-0">
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
                                onDelete={handleDeleteModule}
                                isActive={activeModuleId === module.id}
                                enabledDemographics={enabledDemographics}
                                studyModules={studyModulesWithOptions}
                            />
                            </div>
                        </div>
                    ))}

                    {/* Add another metric button */}
                    {smartVOCStage && (
                        <div className="flex justify-end">
                            <button
                                onClick={() => handleOpenTemplateModal(smartVOCStage)}
                                className="px-5 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
                            >
                                Add another metric
                            </button>
                        </div>
                    )}
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
                {isCollectionStageActive && collectionModules.length > 0 && (
                    <div className="space-y-6">
                    {collectionModules.map((module, idx) => (
                        <div
                            key={module.id}
                            ref={(el) => {
                                if (el) {
                                    collectionModuleElementRefs.current.set(module.id, el);
                                } else {
                                    collectionModuleElementRefs.current.delete(module.id);
                                }
                            }}
                            className="flex gap-2 items-start"
                        >
                            {/* Reorder arrows */}
                            {collectionModules.length > 1 && (
                                <div className="flex flex-col gap-1 pt-4 flex-shrink-0">
                                    <button
                                        onClick={() => handleMoveModule(collectionModules, collectionStage!, idx, 'up')}
                                        disabled={idx === 0}
                                        className="p-1 rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
                                        title="Move up"
                                    >
                                        <svg className="w-5 h-5 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
                                        </svg>
                                    </button>
                                    <button
                                        onClick={() => handleMoveModule(collectionModules, collectionStage!, idx, 'down')}
                                        disabled={idx === collectionModules.length - 1}
                                        className="p-1 rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
                                        title="Move down"
                                    >
                                        <svg className="w-5 h-5 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                                        </svg>
                                    </button>
                                </div>
                            )}
                            <div className="flex-1 min-w-0">
                            <CognitiveTaskModuleCard
                                ref={(ref) => {
                                    if (ref) {
                                        collectionModuleRefs.current.set(module.id, ref);
                                    } else {
                                        collectionModuleRefs.current.delete(module.id);
                                    }
                                }}
                                module={module}
                                researchId={id!}
                                onSave={handleSaveModule}
                                onDelete={handleDeleteModule}
                                isActive={activeModuleId === module.id}
                                enabledDemographics={enabledDemographics}
                                studyModules={studyModulesWithOptions}
                            />
                            </div>
                        </div>
                    ))}

                    {/* Add another module button */}
                    {collectionStage && (
                        <div className="flex justify-end">
                            <button
                                onClick={() => handleOpenTemplateModal(collectionStage)}
                                className="px-5 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
                            >
                                Add another module
                            </button>
                        </div>
                    )}
                    </div>
                )}

                {/* Collection Stage Empty State */}
                {isCollectionStageActive && collectionModules.length === 0 && collectionStage && (
                    <StageEmptyState
                        stageName={collectionStage.name}
                        stageType="collection"
                        onAddModule={() => handleOpenTemplateModal(collectionStage)}
                    />
                )}

                {/* Regular module view: Show single module */}
                {!isSmartVOCStage && !isCollectionStageActive && !isResearchConfigModule && activeModule && (
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
                {!isSmartVOCStage && !isCollectionStageActive && isResearchConfigModule && activeModule && (
                    <div className="space-y-6">
                        <div className="rounded-lg shadow-sm border border-gray-100 p-4 sm:p-5 lg:p-6">
                            <ResearchConfigurationModule
                                config={transformResearchConfigComponentValues(componentValues)}
                                researchStatus={research?.status}
                                researchName={research?.name}
                                onChange={(newConfig) => {
                                    Object.keys(newConfig).forEach(key => {
                                        if (key === 'demographics') {
                                            Object.entries(newConfig[key] as Record<string, unknown>).forEach(([subKey, val]) => {
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
                                            const val = newConfig[key];
                                            handleComponentValueChange(key, typeof val === 'object' && val !== null ? JSON.stringify(val) : String(val));
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
                stageName={selectedStage?.name}
                existingModuleNames={(selectedStage?.modules || []).map((m: Module) => m.name)}
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
        researchUrl: '',
        participationMode: 'panel'
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
            (config.demographics as Record<string, unknown>)[key] = tryParse(value);
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
            const parsed = tryParse(value);
            if (typeof parsed === 'object' && parsed !== null && 'enabled' in parsed) {
                config.participantLimit = parsed;
            } else {
                config.participantLimit = parseInt(value) || 50;
            }
        }
        // Handle participation mode
        else if (key === 'participationMode') {
            config.participationMode = value || 'panel';
        }
    });

    return config;
};

// Helper function to flatten nested config into componentValues
const flattenResearchConfig = (config: Record<string, unknown>): Record<string, string> => {
    const values: Record<string, string> = {};

    if (config.demographics) {
        Object.entries(config.demographics as Record<string, unknown>).forEach(([key, value]) => {
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
        values.participantLimit = typeof config.participantLimit === 'object'
            ? JSON.stringify(config.participantLimit)
            : String(config.participantLimit);
    }

    return values;
};
