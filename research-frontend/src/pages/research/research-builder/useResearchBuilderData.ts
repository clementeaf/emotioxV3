import { useMemo } from 'react';
import type { Research, Stage, Module } from '../../../services/research.service';
import type { EnabledDemographic } from './researchBuilderTypes';
import { DEMOGRAPHIC_LABELS } from './researchBuilderTypes';
import type { StudyModuleOption } from '../../../components/research/ConditionalityModal';
import type { ComponentConfig } from '../../../types/moduleBuilder.types';

interface UseResearchBuilderDataParams {
    typedResearch: Research | null;
    activeModule: Module | null;
    activeStageFromUrl: Stage | null;
    stageId?: string;
    activeModuleId: string | null;
}

interface UseResearchBuilderDataResult {
    smartVOCStage: Stage | null;
    smartVOCModules: Module[];
    isSmartVOCStage: boolean;
    collectionStage: Stage | null;
    collectionModules: Module[];
    isCollectionStageActive: boolean;
    enabledDemographics: EnabledDemographic[];
    studyModulesWithOptions: StudyModuleOption[];
    linkableModules: Array<{ id: string; name: string; orderIndex: number }>;
    moduleQuestionNumbers: Map<string, number>;
}

export const useResearchBuilderData = ({
    typedResearch,
    activeModule,
    activeStageFromUrl,
    stageId,
    activeModuleId,
}: UseResearchBuilderDataParams): UseResearchBuilderDataResult => {
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
                            const demo = v as { enabled: boolean; validValues?: string[]; questionLabel?: string };
                            if (demo.enabled) {
                                result.push({
                                    key,
                                    label: demo.questionLabel?.trim() || DEMOGRAPHIC_LABELS[key] || key,
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

    /**
     * Modules whose answers can drive module conditionality (any stage with choice components).
     * Includes Screener (single_module stage), Single/Multiple Choice in collections, etc.
     */
    const studyModulesWithOptions = useMemo((): StudyModuleOption[] => {
        if (!typedResearch?.stages) return [];
        const result: StudyModuleOption[] = [];
        const seen = new Set<string>();

        const sortedStages = [...typedResearch.stages].sort(
            (a, b) => (a.order_index ?? 0) - (b.order_index ?? 0)
        );

        for (const stage of sortedStages) {
            const stageBase = (stage.order_index ?? 0) * 10000;
            const modules = [...(stage.modules || [])].sort(
                (a, b) => (a.order_index ?? 0) - (b.order_index ?? 0)
            );
            for (const mod of modules) {
                if (seen.has(mod.id)) continue;
                const structure = (mod.config?.structure as { components?: ComponentConfig[] } | undefined);
                const components = structure?.components || [];
                const CHOICE_COMPONENT_TYPES = ['radio', 'checkbox-list', 'option-list'];
                const choices = components.filter(
                    (c) => c.settings?.isChoice
                        || c.id.includes('choice-')
                        || CHOICE_COMPONENT_TYPES.includes(c.type)
                );
                if (choices.length === 0) continue;

                // Extract options: value may be a plain string label or a JSON array of choice objects
                const options: Array<{ id: string; label: string }> = [];
                for (const c of choices) {
                    const raw = typeof c.value === 'string' ? c.value.trim() : '';
                    // Try parsing as JSON array of choices (e.g. [{id, label, value, eligibility}])
                    if (raw.startsWith('[')) {
                        try {
                            const parsed = JSON.parse(raw) as Array<{ id?: string; label?: string; value?: string }>;
                            if (Array.isArray(parsed)) {
                                for (const item of parsed) {
                                    const itemLabel = item.label || item.value || '';
                                    if (itemLabel.trim()) {
                                        options.push({ id: item.id || c.id, label: itemLabel });
                                    }
                                }
                                continue;
                            }
                        } catch { /* not JSON, fall through */ }
                    }
                    // Plain string value or fallback
                    const defaultVal =
                        typeof c.settings?.defaultValue === 'string' ? c.settings.defaultValue : '';
                    const label = raw || defaultVal || c.label || c.id;
                    if (label.trim()) {
                        options.push({ id: c.id, label });
                    }
                }

                if (options.length === 0) continue;
                seen.add(mod.id);
                result.push({
                    id: mod.id,
                    name: mod.name + (mod.description ? ` - ${mod.description}` : ''),
                    orderIndex: stageBase + (mod.order_index ?? 0),
                    componentId: 'choice',
                    options,
                });
            }
        }
        return result;
    }, [typedResearch]);

    /**
     * All modules in the study — available as "Link with module" targets.
     * Excludes special modules (Welcome, Thank You, Research Configuration).
     * orderIndex is global (stage order x 10000 + module order) for cross-stage comparison.
     */
    const linkableModules = useMemo(() => {
        if (!typedResearch?.stages) return [];
        const excluded = ['Welcome Screen', 'Thank You Screen', 'Research Configuration'];
        const result: Array<{ id: string; name: string; orderIndex: number }> = [];
        const sortedStages = [...typedResearch.stages].sort(
            (a, b) => (a.order_index ?? 0) - (b.order_index ?? 0)
        );
        let questionNumber = 0;
        for (const stage of sortedStages) {
            const stageBase = (stage.order_index ?? 0) * 10000;
            const modules = [...(stage.modules || [])].sort(
                (a, b) => (a.order_index ?? 0) - (b.order_index ?? 0)
            );
            for (const mod of modules) {
                if (excluded.includes(mod.name)) continue;
                questionNumber++;
                const desc = mod.description ? ` - ${mod.description}` : '';
                result.push({
                    id: mod.id,
                    name: `${questionNumber}. ${mod.name}${desc}`,
                    orderIndex: stageBase + (mod.order_index ?? 0),
                });
            }
        }
        return result;
    }, [typedResearch]);

    /** Global question number per module ID — same numbering as linkableModules. */
    const moduleQuestionNumbers = useMemo(() => {
        const map = new Map<string, number>();
        for (const m of linkableModules) {
            // Extract number from name prefix "N. ..."
            const match = m.name.match(/^(\d+)\./);
            if (match) map.set(m.id, parseInt(match[1], 10));
        }
        return map;
    }, [linkableModules]);

    return {
        smartVOCStage,
        smartVOCModules,
        isSmartVOCStage,
        collectionStage,
        collectionModules,
        isCollectionStageActive,
        enabledDemographics,
        studyModulesWithOptions,
        linkableModules,
        moduleQuestionNumbers,
    };
};
