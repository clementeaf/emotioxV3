import type { MutableRefObject } from 'react';
import type { Module, Stage } from '../../../services/research.service';
import { SmartVOCModuleCard, type SmartVOCModuleCardRef } from '../../../components/research/SmartVOCModuleCard';
import { StageEmptyState } from '../../../components/research/StageEmptyState';
import { ReorderArrows } from './ReorderArrows';
import type { EnabledDemographic } from './researchBuilderTypes';
import type { StudyModuleOption } from '../../../components/research/ConditionalityModal';

interface SmartVOCStageViewProps {
    smartVOCStage: Stage;
    smartVOCModules: Module[];
    activeModuleId: string | null;
    researchId: string;
    enabledDemographics: EnabledDemographic[];
    studyModulesWithOptions: StudyModuleOption[];
    linkableModules: Array<{ id: string; name: string; orderIndex: number }>;
    moduleQuestionNumbers: Map<string, number>;
    smartVOCModuleRefs: MutableRefObject<Map<string, SmartVOCModuleCardRef>>;
    smartVOCModuleElementRefs: MutableRefObject<Map<string, HTMLDivElement>>;
    onSave: () => Promise<void>;
    onDelete: (moduleId: string) => Promise<void>;
    onMoveModule: (modules: Module[], stage: Stage, index: number, direction: 'up' | 'down') => void;
    onOpenTemplateModal: (stage: Stage) => void;
}

export const SmartVOCStageView = ({
    smartVOCStage,
    smartVOCModules,
    activeModuleId,
    researchId,
    enabledDemographics,
    studyModulesWithOptions,
    linkableModules,
    moduleQuestionNumbers,
    smartVOCModuleRefs,
    smartVOCModuleElementRefs,
    onSave,
    onDelete,
    onMoveModule,
    onOpenTemplateModal,
}: SmartVOCStageViewProps) => {
    if (smartVOCModules.length === 0) {
        return (
            <StageEmptyState
                stageName={smartVOCStage.name}
                stageType="smart-voc"
                onAddModule={() => onOpenTemplateModal(smartVOCStage)}
            />
        );
    }

    return (
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
                    <ReorderArrows
                        modules={smartVOCModules}
                        stage={smartVOCStage}
                        index={idx}
                        onMoveModule={onMoveModule}
                    />
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
                            researchId={researchId}
                            onSave={onSave}
                            onDelete={onDelete}
                            isActive={activeModuleId === module.id}
                            enabledDemographics={enabledDemographics}
                            studyModules={studyModulesWithOptions}
                            linkableModules={linkableModules}
                            globalOrderIndex={(smartVOCStage.order_index ?? 0) * 10000 + (module.order_index ?? 0)}
                            questionNumber={moduleQuestionNumbers.get(module.id)}
                        />
                    </div>
                </div>
            ))}

            {/* Add another metric button */}
            <div className="flex justify-end">
                <button
                    onClick={() => onOpenTemplateModal(smartVOCStage)}
                    className="px-5 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
                >
                    Add another metric
                </button>
            </div>
        </div>
    );
};
