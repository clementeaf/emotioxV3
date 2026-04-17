import type { MutableRefObject } from 'react';
import type { Module, Stage } from '../../../services/research.service';
import { CognitiveTaskModuleCard, type CognitiveTaskModuleCardRef } from '../../../components/research/CognitiveTaskModuleCard';
import { StageEmptyState } from '../../../components/research/StageEmptyState';
import { ReorderArrows } from './ReorderArrows';
import type { EnabledDemographic } from './researchBuilderTypes';
import type { StudyModuleOption } from '../../../components/research/ConditionalityModal';

interface CollectionStageViewProps {
    collectionStage: Stage;
    collectionModules: Module[];
    activeModuleId: string | null;
    researchId: string;
    enabledDemographics: EnabledDemographic[];
    studyModulesWithOptions: StudyModuleOption[];
    linkableModules: Array<{ id: string; name: string; orderIndex: number }>;
    moduleQuestionNumbers: Map<string, number>;
    collectionModuleRefs: MutableRefObject<Map<string, CognitiveTaskModuleCardRef>>;
    collectionModuleElementRefs: MutableRefObject<Map<string, HTMLDivElement>>;
    onSave: () => Promise<void>;
    onDelete: (moduleId: string) => Promise<void>;
    onMoveModule: (modules: Module[], stage: Stage, index: number, direction: 'up' | 'down') => void;
    onOpenTemplateModal: (stage: Stage) => void;
}

export const CollectionStageView = ({
    collectionStage,
    collectionModules,
    activeModuleId,
    researchId,
    enabledDemographics,
    studyModulesWithOptions,
    linkableModules,
    moduleQuestionNumbers,
    collectionModuleRefs,
    collectionModuleElementRefs,
    onSave,
    onDelete,
    onMoveModule,
    onOpenTemplateModal,
}: CollectionStageViewProps) => {
    if (collectionModules.length === 0) {
        return (
            <StageEmptyState
                stageName={collectionStage.name}
                stageType="collection"
                onAddModule={() => onOpenTemplateModal(collectionStage)}
            />
        );
    }

    return (
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
                    <ReorderArrows
                        modules={collectionModules}
                        stage={collectionStage}
                        index={idx}
                        onMoveModule={onMoveModule}
                    />
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
                            researchId={researchId}
                            onSave={onSave}
                            onDelete={onDelete}
                            isActive={activeModuleId === module.id}
                            enabledDemographics={enabledDemographics}
                            studyModules={studyModulesWithOptions}
                            linkableModules={linkableModules}
                            globalOrderIndex={(collectionStage.order_index ?? 0) * 10000 + (module.order_index ?? 0)}
                            questionNumber={moduleQuestionNumbers.get(module.id)}
                        />
                    </div>
                </div>
            ))}

            {/* Add another module button */}
            <div className="flex justify-end">
                <button
                    onClick={() => onOpenTemplateModal(collectionStage)}
                    className="px-5 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
                >
                    Add another module
                </button>
            </div>
        </div>
    );
};
