import { useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import {
    Trash2,
    BarChart3,
    ChevronDown,
    ChevronUp,
    Image as ImageIcon,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useModuleDraftStore } from '../../stores/useModuleDraftStore';
import { sortStages, isStageSingleModule, FIXED_STAGES } from './ResearchBuilderSidebar.utils';

interface Stage {
    id: string;
    name: string;
    description?: string;
    stage_type?: string;
    order_index?: number;
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
    onReorderStage?: (stageId: string, direction: 'up' | 'down') => void;
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
    onReorderStage,
}: SidebarStageListProps) => {
    const location = useLocation();
    const { moduleId, stageId: activeStageId } = useParams<{ moduleId?: string; stageId?: string }>();
    const { hasDraft } = useModuleDraftStore();
    const activeModuleId = moduleId;

    const [collapsed, setCollapsed] = useState(false);

    // Website Tracking has no sidebar stages/stimuli — config is in the main panel
    if (isWebsiteTracking) return null;

    const sectionLabel = isFileBasedResearch ? (isClientsBenchmark ? 'Researches' : isInsightsFinding ? 'Files' : 'Stimuli') : 'Stages';

    const sorted = !isFileBasedResearch && stages && stages.length > 0
        ? sortStages(stages).filter((stage) => stage.description !== 'Automatically created during migration')
        : [];
    const movableIds = sorted.filter(s => !FIXED_STAGES.has(s.name.toLowerCase())).map(s => s.id);

    return (
        <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
                <button
                    type="button"
                    onClick={() => setCollapsed(prev => !prev)}
                    className="flex items-center gap-1 text-xs font-semibold text-gray-400 uppercase tracking-wider hover:text-gray-600 transition-colors"
                >
                    <ChevronDown className={cn('w-3 h-3 transition-transform', collapsed && '-rotate-90')} />
                    {sectionLabel}
                </button>
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
            <div
                className="space-y-2 mt-2 overflow-hidden transition-all duration-200 ease-in-out"
                style={{ maxHeight: collapsed ? 0 : 1000, opacity: collapsed ? 0 : 1, marginTop: collapsed ? 0 : 8 }}
            >
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
                    sorted.length > 0 ? (
                        sorted.map((stage) => {
                            const isSingleModule = isStageSingleModule(stage);
                            let singleModule = isSingleModule && stage.modules?.[0] ? stage.modules[0] : null;

                            if (isSingleModule && !singleModule && stages) {
                                const allModules = stages.flatMap(s => s.modules || []);
                                singleModule = allModules.find(m => m.name.toLowerCase() === stage.name.toLowerCase()) || null;
                            }

                            const isStageActiveByUrl = activeStageId === stage.id;
                            const hasActiveModule = (stage.modules || []).some(m => m.id === activeModuleId);
                            const isStageActive = isStageActiveByUrl || hasActiveModule || (singleModule && singleModule.id === activeModuleId);

                            const movableIndex = movableIds.indexOf(stage.id);
                            const isMovable = movableIndex !== -1;
                            const canMoveUp = isMovable && movableIndex > 0;
                            const canMoveDown = isMovable && movableIndex < movableIds.length - 1;

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
                                    {isMovable && onReorderStage && !isViewer && (
                                        <div className="flex flex-col opacity-0 group-hover:opacity-100 transition-all">
                                            <button
                                                onClick={() => onReorderStage(stage.id, 'up')}
                                                className={cn('p-0.5 text-gray-400 hover:text-blue-600 transition-colors', !canMoveUp && 'invisible')}
                                            >
                                                <ChevronUp className="h-3 w-3" />
                                            </button>
                                            <button
                                                onClick={() => onReorderStage(stage.id, 'down')}
                                                className={cn('p-0.5 text-gray-400 hover:text-blue-600 transition-colors', !canMoveDown && 'invisible')}
                                            >
                                                <ChevronDown className="h-3 w-3" />
                                            </button>
                                        </div>
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
