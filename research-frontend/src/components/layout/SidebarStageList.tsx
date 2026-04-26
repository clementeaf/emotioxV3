import { Link, useLocation, useParams } from 'react-router-dom';
import {
    Trash2,
    BarChart3,
    Image as ImageIcon,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useModuleDraftStore } from '../../stores/useModuleDraftStore';
import { sortStages, isStageSingleModule } from './ResearchBuilderSidebar.utils';

interface Stage {
    id: string;
    name: string;
    description?: string;
    stage_type?: string;
    modules?: Array<{ id: string; name: string }>;
}

interface Stimulus {
    url: string;
    mediaId: string;
    name: string;
}

interface SidebarStageListProps {
    researchId: string;
    stages: Stage[];
    stimuli: Stimulus[];
    isFileBasedResearch: boolean;
    isClientsBenchmark: boolean;
    isInsightsFinding: boolean;
    isWebsiteTracking?: boolean;
    isViewer: boolean;
    onAddStageClick: () => void;
    onDeleteStageClick: (e: React.MouseEvent, stageId: string, stageName: string) => void;
}

export const SidebarStageList = ({
    researchId,
    stages,
    stimuli,
    isFileBasedResearch,
    isClientsBenchmark,
    isInsightsFinding,
    isWebsiteTracking,
    isViewer,
    onAddStageClick,
    onDeleteStageClick,
}: SidebarStageListProps) => {
    const location = useLocation();
    const { moduleId, stageId: activeStageId } = useParams<{ moduleId?: string; stageId?: string }>();
    const { hasDraft } = useModuleDraftStore();
    const activeModuleId = moduleId;

    return (
        <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">
                    {isFileBasedResearch ? (isWebsiteTracking ? 'Configuration' : isClientsBenchmark ? 'Researches' : isInsightsFinding ? 'Files' : 'Stimuli') : 'Stages'}
                </h3>
                {!isFileBasedResearch && !isViewer && (
                    <button
                        onClick={onAddStageClick}
                        className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                    >
                        + Add Stage
                    </button>
                )}
                {isViewer && (
                    <span className="text-[10px] text-amber-600 bg-amber-50 px-2 py-0.5 rounded">Read-only</span>
                )}
            </div>
            <div className="space-y-2 mt-2">
                {isFileBasedResearch ? (
                    stimuli.length > 0 ? (
                        stimuli.map((stimulus, index) => (
                            <Link
                                key={stimulus.mediaId || index}
                                to={`/research/${researchId}/builder/stimulus/${stimulus.mediaId}`}
                                className={cn(
                                    'flex items-center gap-2 px-2 py-1.5 text-sm rounded transition-colors cursor-pointer',
                                    location.pathname.includes(`/stimulus/${stimulus.mediaId}`)
                                        ? 'bg-blue-50 text-blue-600 font-medium'
                                        : 'text-gray-700 hover:bg-gray-50'
                                )}
                            >
                                {isClientsBenchmark
                                    ? <BarChart3 className="h-4 w-4 flex-shrink-0 text-gray-400" />
                                    : <ImageIcon className="h-4 w-4 flex-shrink-0 text-gray-400" />}
                                <span className="truncate" title={stimulus.name}>{stimulus.name}</span>
                            </Link>
                        ))
                    ) : (
                        <p className="text-xs text-gray-400 italic px-2">
                            {isClientsBenchmark ? 'No researches selected' : 'No stimuli uploaded'}
                        </p>
                    )
                ) : (
                    stages && stages.length > 0 ? (
                        sortStages(stages)
                            .filter((stage) => stage.description !== 'Automatically created during migration')
                            .map((stage) => {
                            const isSingleModule = isStageSingleModule(stage);
                            let singleModule = isSingleModule && stage.modules?.[0] ? stage.modules[0] : null;

                            if (isSingleModule && !singleModule && stages) {
                                const allModules = stages.flatMap(s => s.modules || []);
                                singleModule = allModules.find(m => m.name.toLowerCase() === stage.name.toLowerCase()) || null;
                            }

                            // Check if this stage is active (either by stageId URL param or by containing active module)
                            const isStageActiveByUrl = activeStageId === stage.id;
                            const hasActiveModule = (stage.modules || []).some(m => m.id === activeModuleId);
                            const isStageActive = isStageActiveByUrl || hasActiveModule || (singleModule && singleModule.id === activeModuleId);

                            return (
                                <div key={stage.id} className="flex items-center group">
                                    {isSingleModule ? (
                                        singleModule ? (
                                            <Link
                                                to={`/research/${researchId}/builder/module/${singleModule.id}`}
                                                className={cn(
                                                    'flex-1 flex items-center justify-between px-2 py-1.5 text-sm rounded transition-colors cursor-pointer',
                                                    isStageActive
                                                        ? 'bg-blue-50 text-blue-600 font-medium'
                                                        : 'text-gray-700 hover:bg-gray-50'
                                                )}
                                            >
                                                <div className="font-medium flex items-center gap-1.5">
                                                    {stage.name}
                                                    {hasDraft(singleModule.id) && (
                                                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400" title="Unsaved changes" />
                                                    )}
                                                </div>
                                            </Link>
                                        ) : (
                                            <div
                                                className={cn(
                                                    'flex-1 flex items-center justify-between px-2 py-1.5 text-sm rounded transition-colors',
                                                    isStageActive
                                                        ? 'bg-blue-50 text-blue-600 font-medium'
                                                        : 'text-gray-700'
                                                )}
                                            >
                                                <div className="font-medium">{stage.name}</div>
                                                <div className="text-xs text-gray-400 italic">Creating...</div>
                                            </div>
                                        )
                                    ) : (
                                        <Link
                                            to={`/research/${researchId}/builder/stage/${stage.id}`}
                                            className={cn(
                                                'flex-1 flex items-center justify-between px-2 py-1.5 text-sm rounded transition-colors cursor-pointer',
                                                isStageActive
                                                    ? 'bg-blue-50 text-blue-600 font-medium'
                                                    : 'text-gray-700 hover:bg-gray-50'
                                            )}
                                        >
                                            <div className="font-medium">{stage.name}</div>
                                        </Link>
                                    )}
                                    <button
                                        onClick={(e) => onDeleteStageClick(e, stage.id, stage.name)}
                                        className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-600 transition-all ml-1"
                                        title="Delete stage"
                                    >
                                        <Trash2 className="h-3 w-3" />
                                    </button>
                                </div>
                            );
                        })
                ) : (
                    <p className="text-xs text-gray-400 italic px-2">No stages defined</p>
                ))}
            </div>
        </div>
    );
};
