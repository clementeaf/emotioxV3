import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useEffect, useState, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';

// Global set to track which researches have been checked for Welcome/Thank You
// This persists across StrictMode remounts and component unmounts
const checkedResearchIds = new Set<string>();
import {
    ArrowLeft,
    Loader2,
    Trash2,
    BarChart3,
    TrendingUp,
    LogOut,
    Image as ImageIcon
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { researchService } from '../../services/research.service';
import { stageTemplatesService } from '../../services/stageTemplates.service';
import type { StageTemplateWithModules } from '../../types/moduleBuilder.types';
import { Modal } from '../ui/Modal';
import { Drawer } from '../ui/Drawer';
import { ConfirmationModal } from '../ui/ConfirmationModal';
import { SidebarSkeleton } from '../ui/Skeleton';
import { useToast } from '../../hooks/useToast';
import { researchKeys, useResearch } from '../../hooks/useResearchQuery';
import { useAuthStore } from '../../stores/auth.store';
import { useModuleDraftStore } from '../../stores/useModuleDraftStore';

interface ResearchBuilderSidebarProps {
    researchId: string;
}

/**
 * Sorts stages in the correct order:
 * 1. Welcome Screen (first)
 * 2. Research Configuration (second)
 * 3. Other stages (middle, in their original order)
 * 4. Thank You Screen (last)
 */
const sortStages = <T extends { name: string }>(stages: T[]): T[] => {
    const getStageOrder = (name: string): number => {
        const lowerName = name.toLowerCase();
        if (lowerName === 'welcome screen') return 0;
        if (lowerName === 'research configuration') return 1;
        if (lowerName === 'thank you screen') return 999;
        return 2; // All other stages go in the middle
    };

    return [...stages].sort((a, b) => {
        const orderA = getStageOrder(a.name);
        const orderB = getStageOrder(b.name);
        return orderA - orderB;
    });
};

/**
 * Determines if a stage is a single module or a collection of modules
 */
const isStageSingleModule = (stage: { name: string; stage_type?: string; modules?: Array<{ name: string }> }): boolean => {
    if (stage.stage_type === 'single_module') return true;
    if (stage.stage_type === 'module_collection') return false;

    if (!stage.modules || stage.modules.length === 0) return false;
    if (stage.modules.length > 1) return false;
    return stage.modules[0].name.toLowerCase() === stage.name.toLowerCase();
};

/**
 * Research Builder Sidebar
 * Displays research details, stages, modules, and actions
 */
export const ResearchBuilderSidebar = ({ researchId }: ResearchBuilderSidebarProps) => {
    const location = useLocation();
    const navigate = useNavigate();
    const { moduleId } = useParams<{ moduleId?: string }>();
    const queryClient = useQueryClient();
    const toast = useToast();
    const { hasDraft } = useModuleDraftStore();
    const user = useAuthStore((state) => state.user);
    const logout = useAuthStore((state) => state.logout);
    
    const { data: activeResearch, isLoading: loadingResearch } = useResearch(researchId);
    const [showStageSelector, setShowStageSelector] = useState(false);
    const [isAddingStage, setIsAddingStage] = useState(false);
    const [showIatTypeSelector, setShowIatTypeSelector] = useState(false);
    const { stageId: activeStageId } = useParams<{ stageId?: string }>();
    const [deleteStageModalOpen, setDeleteStageModalOpen] = useState(false);
    const [stageToDelete, setStageToDelete] = useState<{ id: string; name: string } | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [showStatusModal, setShowStatusModal] = useState(false);
    const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
    const [availableStages, setAvailableStages] = useState<StageTemplateWithModules[]>([]);
    const [loadingStages, setLoadingStages] = useState(false);
    const [isEditingName, setIsEditingName] = useState(false);
    const [editingName, setEditingName] = useState('');
    const nameInputRef = useRef<HTMLInputElement>(null);

    const handleStartEditName = useCallback(() => {
        if (!activeResearch) return;
        setEditingName(activeResearch.name);
        setIsEditingName(true);
        setTimeout(() => nameInputRef.current?.select(), 50);
    }, [activeResearch]);

    const handleSaveName = useCallback(async () => {
        if (!activeResearch || !editingName.trim() || editingName.trim() === activeResearch.name) {
            setIsEditingName(false);
            return;
        }
        try {
            await researchService.update(activeResearch.id, { name: editingName.trim() });
            queryClient.invalidateQueries({ queryKey: ['research'] });
        } catch (error) {
            console.error('Failed to rename research:', error);
        }
        setIsEditingName(false);
    }, [activeResearch, editingName, queryClient]);

    const isAttentionPrediction = activeResearch?.research_type_name === 'Attention Prediction' ||
                                activeResearch?.research_type_name === "Attention's Prediction";
    const isInsightsFinding = activeResearch?.research_type_name === 'Insights Finding';
    const isClientsBenchmark = activeResearch?.research_type_name === "Client's Benchmark";
    const isFileBasedResearch = isAttentionPrediction || isInsightsFinding || isClientsBenchmark;

    // Get stimuli from settings if it exists
    const settings = (activeResearch?.settings as Record<string, unknown>) || {};
    const stimuli = (settings.stimuli as Array<{ url: string; mediaId: string; name: string }>) || [];

    useEffect(() => {
        if (isAttentionPrediction && activeResearch) {
            console.log('[ResearchBuilderSidebar] Attention Prediction debug:', {
                settings,
                stimuliCount: stimuli.length,
                researchId: activeResearch.id
            });
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- activeResearch read only for .id (already in deps via ?.id)
    }, [isAttentionPrediction, settings, stimuli, activeResearch?.id]);

    // Use ref to track if we're currently adding stages (prevents race conditions)
    const isAddingStagesRef = useRef(false);

    // Reset available stages when research changes to ensure fresh filtering
    useEffect(() => {
        if (activeResearch?.id) {
            setAvailableStages([]);
        }
    }, [activeResearch?.id]);

    // Automatically add Welcome Screen and Thank You Screen if they're missing
    useEffect(() => {
        if (!activeResearch || loadingResearch) {
            return;
        }

        const researchId = activeResearch.id;

        // Skip for file-based research types - no automatic screens needed
        if (isFileBasedResearch) {
            return;
        }

        // Skip if already checked this research (persists across StrictMode remounts)
        if (checkedResearchIds.has(researchId)) {
            return;
        }

        // Skip if currently adding stages (prevents race condition)
        if (isAddingStagesRef.current) {
            return;
        }

        // Check if Welcome Screen and Thank You Screen STAGES exist (not modules)
        const stages = activeResearch.stages || [];
        const hasWelcomeStage = stages.some(s => s.name === 'Welcome Screen');
        const hasThankYouStage = stages.some(s => s.name === 'Thank You Screen');

        // Also check modules as fallback
        const allModules = stages.flatMap(s => s.modules || []);
        const hasWelcomeModule = allModules.some(m => m.name === 'Welcome Screen');
        const hasThankYouModule = allModules.some(m => m.name === 'Thank You Screen');

        const hasWelcome = hasWelcomeStage || hasWelcomeModule;
        const hasThankYou = hasThankYouStage || hasThankYouModule;

        console.log('[ResearchBuilderSidebar] Checking Welcome/Thank You:', {
            hasWelcomeStage,
            hasWelcomeModule,
            hasThankYouStage,
            hasThankYouModule,
            hasWelcome,
            hasThankYou,
            researchId,
            stagesCount: stages.length,
            stageNames: stages.map(s => s.name),
            alreadyChecked: checkedResearchIds.has(researchId)
        });

        // Mark as checked BEFORE any async operation
        checkedResearchIds.add(researchId);

        if (!hasWelcome || !hasThankYou) {
            isAddingStagesRef.current = true;
            void (async () => {
                try {
                    console.log('[ResearchBuilderSidebar] Automatically adding Welcome/Thank You stages for research:', researchId);
                    const result = await researchService.addWelcomeAndThankYouStages(researchId);
                    console.log('[ResearchBuilderSidebar] Add result:', result);
                    await queryClient.invalidateQueries({ queryKey: researchKeys.detail(researchId) });
                    await queryClient.refetchQueries({ queryKey: researchKeys.detail(researchId) });
                    console.log('[ResearchBuilderSidebar] Successfully added Welcome/Thank You stages');
                } catch (error: unknown) {
                    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                    console.error('[ResearchBuilderSidebar] Error automatically adding Welcome/Thank You stages:', errorMessage, error);
                } finally {
                    isAddingStagesRef.current = false;
                }
            })();
        }
    }, [activeResearch, loadingResearch, queryClient, isFileBasedResearch]);

    const invalidateActiveResearch = async (id: string): Promise<void> => {
        await queryClient.invalidateQueries({ queryKey: researchKeys.detail(id) });
    };

    // Stages that can only exist once per research (singletons)
    const SINGLETON_STAGES = new Set(['Welcome Screen', 'Thank You Screen', 'Research Configuration']);

    const loadStageTemplates = async () => {
        try {
            setLoadingStages(true);
            const allStages = await stageTemplatesService.getAll();

            const existingStageNames = new Set(
                (activeResearch?.stages || []).map(stage => stage.name)
            );

            // If the technique defines default_stages, only allow those stage names
            const techniqueStageNames = activeResearch?.technique_default_stages
                ? new Set(activeResearch.technique_default_stages.map(s => s.name))
                : null;

            const availableStagesFiltered = allStages.filter(stage => {
                // If technique restricts stages, only show those
                if (techniqueStageNames && !techniqueStageNames.has(stage.name)) {
                    return false;
                }
                // Singleton stages: hide if already exists
                if (SINGLETON_STAGES.has(stage.name)) {
                    return !existingStageNames.has(stage.name);
                }
                // Repeatable stages (Screener, Cognitive Tasks, Implicit Association, etc.): always show
                return true;
            });

            setAvailableStages(availableStagesFiltered);
        } catch (error: unknown) {
            console.error('Failed to load stage templates', error);
            if (error instanceof Error && ('code' in error && error.code === 'ERR_NETWORK' || error.message?.includes('ERR_CONNECTION_REFUSED'))) {
                toast.error('Cannot connect to backend. Please ensure the server is running.');
            } else {
                toast.error('Failed to load available stages');
            }
        } finally {
            setLoadingStages(false);
        }
    };

    const IAT_MODULE_TYPES = [
        { name: 'Attribute Testing', description: '2 targets, up to 5 criteria' },
        { name: 'Comparing Attribute', description: 'Up to 3 objects, 2 dimensions, up to 15 criteria' },
        { name: 'Objects Comparing', description: 'Up to 5 targets, positive/negative criteria' },
    ];

    const handleAddStage = async (stageName: string, defaultModuleName?: string): Promise<void> => {
        if (!activeResearch) return;

        try {
            setIsAddingStage(true);
            await researchService.addStage(activeResearch.id, stageName, undefined, defaultModuleName);
            toast.success(`Stage "${stageName}" added successfully`);
            setShowStageSelector(false);
            setShowIatTypeSelector(false);
            await invalidateActiveResearch(activeResearch.id);
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to add stage';
            console.error('Error adding stage:', error);
            toast.error(errorMessage);

            if (errorMessage.includes('token') || errorMessage.includes('401') || errorMessage.includes('Unauthorized')) {
                window.location.href = '/login';
            }
        } finally {
            setIsAddingStage(false);
        }
    };

    const handleDeleteStageClick = (e: React.MouseEvent, stageId: string, stageName: string) => {
        e.stopPropagation();
        setStageToDelete({ id: stageId, name: stageName });
        setDeleteStageModalOpen(true);
    };

    const handleConfirmDeleteStage = async () => {
        if (!activeResearch || !stageToDelete) return;

        try {
            setIsDeleting(true);
            console.log('[ResearchBuilderSidebar] Deleting stage:', { researchId: activeResearch.id, stageId: stageToDelete.id, stageName: stageToDelete.name });
            
            // Check if the stage being deleted contains the active module
            const stageToDeleteData = activeResearch.stages?.find(s => s.id === stageToDelete.id);
            const modulesInStage = stageToDeleteData?.modules || [];
            const activeModuleId = moduleId;
            const isActiveModuleInDeletedStage = activeModuleId && modulesInStage.some(m => m.id === activeModuleId);
            
            // 1. Critical operation (server)
            await researchService.deleteStage(activeResearch.id, stageToDelete.id);
            console.log('[ResearchBuilderSidebar] Stage deleted successfully');

            // If the active module was in the deleted stage, navigate to builder root
            if (isActiveModuleInDeletedStage) {
                console.log('[ResearchBuilderSidebar] Active module was in deleted stage, navigating to builder root');
                navigate(`/research/${activeResearch.id}/builder`);
            }
            
            // 3. Notify user of success BEFORE cache refresh
            toast.success(`Stage "${stageToDelete.name}" deleted successfully`);
            setDeleteStageModalOpen(false);
            setStageToDelete(null);
            
            // 4. Cache synchronization (non-critical, can fail silently)
            try {
                await invalidateActiveResearch(activeResearch.id);
                await queryClient.refetchQueries({ queryKey: researchKeys.detail(activeResearch.id) });
            } catch (cacheError) {
                console.warn('[ResearchBuilderSidebar] Cache refresh failed, data will sync on next navigation:', cacheError);
            }
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to delete stage';
            console.error('[ResearchBuilderSidebar] Error deleting stage:', error);
            toast.error(errorMessage);
        } finally {
            setIsDeleting(false);
        }
    };

    const handleChangeStatus = async (newStatus: string) => {
        if (!activeResearch || activeResearch.status === newStatus) return;

        try {
            setIsUpdatingStatus(true);
            if (newStatus === 'active') {
                await researchService.activate(activeResearch.id);
            } else {
                await researchService.updateStatus(activeResearch.id, newStatus);
            }
            toast.success(`Research status changed to ${newStatus}`);
            await invalidateActiveResearch(activeResearch.id);
            setShowStatusModal(false);
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to update research status';
            console.error('Error updating research status:', error);
            toast.error(errorMessage);
        } finally {
            setIsUpdatingStatus(false);
        }
    };

    const handleLogout = async () => {
        try {
            await logout();
            navigate('/login');
        } catch {
            toast.error('Error al cerrar sesión');
        }
    };


    if (loadingResearch) {
        return <SidebarSkeleton />;
    }

    if (!activeResearch) {
        return null;
    }

    const activeModuleId = moduleId;

    return (
        <div className="w-64 bg-white border-r border-gray-100 flex flex-col h-full rounded-lg transition-all duration-300">
            {/* Logo */}
            <div className="p-4 border-b border-gray-100 flex-shrink-0">
                <div className="flex items-center justify-center">
                    <img src={`${import.meta.env.BASE_URL}EmotioCX-logo.svg`} alt="EmotioCX" className="h-8" />
                </div>
            </div>

            {/* Header with Back Button */}
            <div className="p-4 border-b border-gray-100">
                <Link
                    to="/research"
                    className="flex items-center text-sm text-gray-500 hover:text-gray-900 mb-4 transition-colors"
                >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to List
                </Link>
                {isEditingName ? (
                    <input
                        ref={nameInputRef}
                        type="text"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onBlur={handleSaveName}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveName();
                            if (e.key === 'Escape') setIsEditingName(false);
                        }}
                        className="font-bold text-gray-900 text-lg w-full px-1 py-0 border border-blue-400 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                        autoFocus
                    />
                ) : (
                    <h2
                        className="font-bold text-gray-900 truncate text-lg cursor-pointer hover:text-blue-600 transition-colors"
                        title="Click to rename"
                        onClick={handleStartEditName}
                    >
                        {activeResearch.name}
                    </h2>
                )}
            </div>

            {/* Research Details */}
            <div className="flex-1 p-4 space-y-6 overflow-y-auto scrollbar-hide">
                <div>
                    <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-2">
                        User
                    </h3>
                    <p className="text-sm font-medium text-gray-900">
                        {user ? `${user.first_name} ${user.last_name}` : '—'}
                    </p>
                </div>

                <div>
                    <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-2">
                        Enterprise
                    </h3>
                    <p className="text-sm font-medium text-gray-900">
                        {activeResearch.enterprise_name || '—'}
                    </p>
                </div>

                <div>
                    <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-2">
                        Research Type
                    </h3>
                    <p className="text-sm font-medium text-gray-900">
                        {activeResearch.research_type_name || 'Unknown Type'}
                    </p>
                </div>

                {!isFileBasedResearch && (
                    <div>
                        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-2">
                            Research Technique
                        </h3>
                        <p className="text-sm font-medium text-gray-900">
                            {activeResearch.research_technique_name || 'Unknown Technique'}
                        </p>
                    </div>
                )}

                <div>
                    <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-2">
                        Status
                    </h3>
                    <button
                        type="button"
                        onClick={() => setShowStatusModal(true)}
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize hover:opacity-80 transition-colors cursor-pointer ${
                            activeResearch.status === 'active' ? 'bg-blue-100 text-blue-800' :
                            activeResearch.status === 'completed' ? 'bg-green-100 text-green-800' :
                            'bg-gray-100 text-gray-800'
                        }`}
                    >
                        {activeResearch.status}
                    </button>
                </div>

                {/* Stages Section or Stimuli Section for Attention Prediction */}
                <div className="mb-6">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">
                            {isFileBasedResearch ? (isClientsBenchmark ? 'Researches' : isInsightsFinding ? 'Files' : 'Stimuli') : 'Stages'}
                        </h3>
                        {!isFileBasedResearch && (
                            <button
                                onClick={() => {
                                    setShowStageSelector(true);
                                    // Reset available stages to force reload with current research state
                                    setAvailableStages([]);
                                    void loadStageTemplates();
                                }}
                                className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                            >
                                + Add Stage
                            </button>
                        )}
                    </div>
                    <div className="space-y-2 mt-2">
                        {isFileBasedResearch ? (
                            stimuli.length > 0 ? (
                                stimuli.map((stimulus, index) => (
                                    <Link
                                        key={stimulus.mediaId || index}
                                        to={`/research/${activeResearch.id}/builder/stimulus/${stimulus.mediaId}`}
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
                            activeResearch.stages && activeResearch.stages.length > 0 ? (
                                sortStages(activeResearch.stages)
                                    .filter((stage) => stage.description !== 'Automatically created during migration')
                                    .map((stage) => {
                                    const isSingleModule = isStageSingleModule(stage);
                                    let singleModule = isSingleModule && stage.modules?.[0] ? stage.modules[0] : null;

                                    if (isSingleModule && !singleModule && activeResearch.stages) {
                                        const allModules = activeResearch.stages.flatMap(s => s.modules || []);
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
                                                        to={`/research/${activeResearch.id}/builder/module/${singleModule.id}`}
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
                                                    to={`/research/${activeResearch.id}/builder/stage/${stage.id}`}
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
                                                onClick={(e) => handleDeleteStageClick(e, stage.id, stage.name)}
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

                {/* Progress Section - Hide for file-based research */}
                {!isFileBasedResearch && (
                    <div className="mb-6">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">
                                Progress
                            </h3>
                        </div>
                        <div className="space-y-1 mt-2">
                            <Link
                                to={`/research/${activeResearch.id}/builder/progress`}
                                className={cn(
                                    'flex items-center px-2 py-1.5 text-sm rounded transition-colors',
                                    location.pathname.includes('/builder/progress')
                                        ? 'bg-blue-50 text-blue-600 font-medium'
                                        : 'text-gray-700 hover:bg-gray-50'
                                )}
                            >
                                <TrendingUp className="h-4 w-4 mr-2" />
                                View Progress
                            </Link>
                        </div>
                    </div>
                )}

                {/* Results Section - Hide for file-based research */}
                {!isFileBasedResearch && (
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">
                                Results
                            </h3>
                        </div>
                        <div className="space-y-1 mt-2">
                            <Link
                                to={`/research/${activeResearch.id}/builder/results`}
                                className={cn(
                                    'flex items-center px-2 py-1.5 text-sm rounded transition-colors',
                                    location.pathname.includes('/builder/results')
                                        ? 'bg-blue-50 text-blue-600 font-medium'
                                        : 'text-gray-700 hover:bg-gray-50'
                                )}
                            >
                                <BarChart3 className="h-4 w-4 mr-2" />
                                View Results
                            </Link>
                        </div>
                    </div>
                )}
                </div>

                {/* Logout */}            <div className="p-4 border-t border-gray-100 space-y-2">
                <button
                    onClick={handleLogout}
                    className={cn(
                        'w-full flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                        'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    )}
                >
                    <LogOut className="h-5 w-5 mr-3 text-gray-400" />
                    Logout
                </button>
            </div>

            {/* Modals */}
            <ConfirmationModal
                isOpen={deleteStageModalOpen}
                onClose={() => setDeleteStageModalOpen(false)}
                onConfirm={handleConfirmDeleteStage}
                title="Delete Stage"
                message={
                    stageToDelete?.name?.toLowerCase().includes('cognitive')
                        ? `Are you sure you want to delete the stage "${stageToDelete.name}"? This will also delete all modules in this stage. This action cannot be undone.\n\nNote: You can safely delete this stage if you only want to use Smart VOC modules in your research.`
                        : `Are you sure you want to delete the stage "${stageToDelete?.name}"? This will also delete all modules in this stage. This action cannot be undone.`
                }
                confirmText="Delete"
                cancelText="Cancel"
                variant="danger"
                isLoading={isDeleting}
            />

            <Drawer
                isOpen={showStageSelector}
                onClose={() => { setShowStageSelector(false); setShowIatTypeSelector(false); }}
                title={showIatTypeSelector ? 'Select Implicit Association type' : 'Add Stage'}
                width="sm"
            >
                <div className="space-y-2">
                    {loadingStages ? (
                        <div className="text-center py-8">
                            <Loader2 className="h-6 w-6 animate-spin mx-auto text-blue-600" />
                            <p className="mt-2 text-sm text-gray-500">Loading stages...</p>
                        </div>
                    ) : availableStages.length === 0 ? (
                        <div className="text-center py-8">
                            <p className="text-sm text-gray-500">No stages available</p>
                            <p className="text-xs text-gray-400 mt-1">Create stages in Module Management</p>
                        </div>
                    ) : showIatTypeSelector ? (
                        <div className="space-y-2">
                            <button
                                onClick={() => setShowIatTypeSelector(false)}
                                className="text-sm text-gray-500 hover:text-gray-700 mb-3 flex items-center gap-1"
                            >
                                ← Back to stages
                            </button>
                            {IAT_MODULE_TYPES.map((iatType) => (
                                <button
                                    key={iatType.name}
                                    onClick={() => void handleAddStage('Implicit Association', iatType.name)}
                                    disabled={isAddingStage}
                                    className="w-full text-left px-4 py-3 rounded-lg border border-gray-200 hover:border-accent-600 hover:bg-accent-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <div className="font-medium text-gray-900">{iatType.name}</div>
                                    <div className="text-sm text-gray-500 mt-1">{iatType.description}</div>
                                </button>
                            ))}
                        </div>
                    ) : (
                        availableStages.map((stage) => (
                            <button
                                key={stage.id}
                                onClick={() => {
                                    if (stage.name === 'Implicit Association') {
                                        setShowIatTypeSelector(true);
                                    } else {
                                        void handleAddStage(stage.name);
                                    }
                                }}
                                disabled={isAddingStage}
                                className="w-full text-left px-4 py-3 rounded-lg border border-gray-200 hover:border-accent-600 hover:bg-accent-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <div className="font-medium text-gray-900">{stage.name}</div>
                                {stage.description && (
                                    <div className="text-sm text-gray-500 mt-1">{stage.description}</div>
                                )}
                                {stage.modules && stage.modules.length > 0 && (
                                    <div className="text-xs text-gray-400 mt-1">
                                        {stage.modules.length} module{stage.modules.length !== 1 ? 's' : ''}
                                    </div>
                                )}
                            </button>
                        ))
                    )}
                </div>
            </Drawer>

            <Modal
                isOpen={showStatusModal}
                onClose={() => setShowStatusModal(false)}
                title="Change Research Status"
                size="md"
            >
                <div className="space-y-3 py-4">
                    <p className="text-sm text-gray-600 mb-4">
                        Current status: <span className="font-medium capitalize">{activeResearch?.status}</span>
                    </p>
                    {activeResearch?.status !== 'draft' && (
                        <button
                            type="button"
                            onClick={() => void handleChangeStatus('draft')}
                            disabled={isUpdatingStatus}
                            className="w-full text-left p-3 rounded-lg border-2 border-gray-200 hover:border-gray-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <div className="font-medium text-gray-900">Draft</div>
                            <p className="text-xs text-gray-500 mt-1">
                                Return to draft to edit configuration, participation mode, and modules.
                            </p>
                        </button>
                    )}
                    {activeResearch?.status !== 'active' && (
                        <button
                            type="button"
                            onClick={() => void handleChangeStatus('active')}
                            disabled={isUpdatingStatus}
                            className="w-full text-left p-3 rounded-lg border-2 border-blue-200 hover:border-blue-400 bg-blue-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <div className="font-medium text-blue-900">Active</div>
                            <p className="text-xs text-blue-700 mt-1">
                                Make available for participants.
                            </p>
                        </button>
                    )}
                    {activeResearch?.status !== 'completed' && (
                        <button
                            type="button"
                            onClick={() => void handleChangeStatus('completed')}
                            disabled={isUpdatingStatus}
                            className="w-full text-left p-3 rounded-lg border-2 border-green-200 hover:border-green-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <div className="font-medium text-green-900">Completed</div>
                            <p className="text-xs text-green-700 mt-1">
                                Close the research. No new responses will be accepted.
                            </p>
                        </button>
                    )}
                    {isUpdatingStatus && (
                        <p className="text-sm text-gray-500 text-center">Updating status...</p>
                    )}
                </div>
            </Modal>
        </div>
    );
};

