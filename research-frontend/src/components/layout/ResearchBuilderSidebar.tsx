import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
    ArrowLeft,
    Loader2,
    Trash2,
    BarChart3,
    TrendingUp,
    LogOut
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from '../ui/Button';
import { researchService } from '../../services/research.service';
import { stageTemplatesService } from '../../services/stageTemplates.service';
import type { StageTemplateWithModules } from '../../types/moduleBuilder.types';
import { Modal } from '../ui/Modal';
import { ConfirmationModal } from '../ui/ConfirmationModal';
import { useToast } from '../../hooks/useToast';
import { researchKeys, useResearch } from '../../hooks/useResearchQuery';
import { useAuthStore } from '../../stores/auth.store';

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
    const logout = useAuthStore((state) => state.logout);
    
    const { data: activeResearch, isLoading: loadingResearch } = useResearch(researchId);
    const [showStageSelector, setShowStageSelector] = useState(false);
    const [isAddingStage, setIsAddingStage] = useState(false);
    const { stageId: activeStageId } = useParams<{ stageId?: string }>();
    const [deleteStageModalOpen, setDeleteStageModalOpen] = useState(false);
    const [stageToDelete, setStageToDelete] = useState<{ id: string; name: string } | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [showStatusModal, setShowStatusModal] = useState(false);
    const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
    const [availableStages, setAvailableStages] = useState<StageTemplateWithModules[]>([]);
    const [loadingStages, setLoadingStages] = useState(false);
    const [hasCheckedWelcomeThankYou, setHasCheckedWelcomeThankYou] = useState(false);

    // Reset available stages when research changes to ensure fresh filtering
    useEffect(() => {
        if (activeResearch) {
            setAvailableStages([]);
            setHasCheckedWelcomeThankYou(false);
        }
    }, [activeResearch?.id]);

    // Automatically add Welcome Screen and Thank You Screen if they're missing
    useEffect(() => {
        if (!activeResearch || loadingResearch || hasCheckedWelcomeThankYou) {
            return;
        }

        // Check if Welcome Screen and Thank You Screen STAGES exist (not modules)
        // This is more robust because stages are always created, but modules might have different names
        const stages = activeResearch.stages || [];
        const hasWelcomeStage = stages.some(s => s.name === 'Welcome Screen');
        const hasThankYouStage = stages.some(s => s.name === 'Thank You Screen');

        // Also check modules as fallback (in case stage name is different)
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
            researchId: activeResearch.id,
            stagesCount: stages.length,
            stageNames: stages.map(s => s.name)
        });

        // Always set flag to true to prevent multiple attempts, regardless of outcome
        setHasCheckedWelcomeThankYou(true);

        if (!hasWelcome || !hasThankYou) {
            void (async () => {
                try {
                    console.log('[ResearchBuilderSidebar] Automatically adding Welcome/Thank You stages for research:', activeResearch.id);
                    const result = await researchService.addWelcomeAndThankYouStages(activeResearch.id);
                    console.log('[ResearchBuilderSidebar] Add result:', result);
                    await queryClient.invalidateQueries({ queryKey: researchKeys.detail(activeResearch.id) });
                    await queryClient.refetchQueries({ queryKey: researchKeys.detail(activeResearch.id) });
                    console.log('[ResearchBuilderSidebar] Successfully added Welcome/Thank You stages');
                } catch (error: unknown) {
                    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                    console.error('[ResearchBuilderSidebar] Error automatically adding Welcome/Thank You stages:', errorMessage, error);
                }
            })();
        }
    }, [activeResearch?.id, loadingResearch, hasCheckedWelcomeThankYou, queryClient]);

    const invalidateActiveResearch = async (id: string): Promise<void> => {
        await queryClient.invalidateQueries({ queryKey: researchKeys.detail(id) });
    };

    const loadStageTemplates = async () => {
        try {
            setLoadingStages(true);
            const allStages = await stageTemplatesService.getAll();
            
            // Filter out stages that already exist in the research
            const existingStageNames = new Set(
                (activeResearch?.stages || []).map(stage => stage.name)
            );
            
            const availableStagesFiltered = allStages.filter(
                stage => !existingStageNames.has(stage.name)
            );
            
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

    const handleAddStage = async (stageName: string): Promise<void> => {
        if (!activeResearch) return;

        try {
            setIsAddingStage(true);
            await researchService.addStage(activeResearch.id, stageName);
            toast.success(`Stage "${stageName}" added successfully`);
            setShowStageSelector(false);
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

    const handleActivateResearch = async () => {
        if (!activeResearch) return;

        try {
            setIsUpdatingStatus(true);
            await researchService.activate(activeResearch.id);
            toast.success('Research activated successfully');
            await invalidateActiveResearch(activeResearch.id);
            setShowStatusModal(false);
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to activate research';
            console.error('Error activating research:', error);
            toast.error(errorMessage);
        } finally {
            setIsUpdatingStatus(false);
        }
    };

    const handleLogout = async () => {
        try {
            await logout();
            navigate('/login');
        } catch (error) {
            toast.error('Error al cerrar sesión');
        }
    };


    if (loadingResearch) {
        return (
            <div className="w-64 bg-white border-r border-gray-100 flex flex-col h-full rounded-lg items-center justify-center">
                <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
            </div>
        );
    }

    if (!activeResearch) {
        return null;
    }

    const activeModuleId = moduleId;

    return (
        <div className="w-64 bg-white border-r border-gray-100 flex flex-col h-full rounded-lg transition-all duration-300">
            {/* Header with Back Button */}
            <div className="p-4 border-b border-gray-100">
                <Link
                    to="/research"
                    className="flex items-center text-sm text-gray-500 hover:text-gray-900 mb-4 transition-colors"
                >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to List
                </Link>
                <h2 className="font-bold text-gray-900 truncate text-lg" title={activeResearch.name}>
                    {activeResearch.name}
                </h2>
            </div>

            {/* Research Details */}
            <div className="flex-1 p-4 space-y-6 overflow-y-auto">
                <div>
                    <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-2">
                        Research Title
                    </h3>
                    <p className="text-sm font-medium text-gray-900">
                        {activeResearch.name}
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

                <div>
                    <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-2">
                        Research Technique
                    </h3>
                    <p className="text-sm font-medium text-gray-900">
                        {activeResearch.research_technique_name || 'Unknown Technique'}
                    </p>
                </div>

                <div>
                    <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-2">
                        Status
                    </h3>
                    <button
                        type="button"
                        onClick={() => setShowStatusModal(true)}
                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 capitalize hover:bg-blue-200 transition-colors cursor-pointer"
                    >
                        {activeResearch.status}
                    </button>
                </div>

                {/* Stages Section */}
                <div className="mb-6">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">
                            Stages
                        </h3>
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
                    </div>
                    <div className="space-y-2 mt-2">
                        {activeResearch.stages && activeResearch.stages.length > 0 ? (
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
                                                        <div className="font-medium">{stage.name}</div>
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
                        )}
                    </div>
                </div>

                {/* Progress Section */}
                <div>
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

                {/* Results Section */}
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
            </div>

            {/* Logout */}
            <div className="p-4 border-t border-gray-100 space-y-2">
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

            <Modal
                isOpen={showStageSelector}
                onClose={() => setShowStageSelector(false)}
                title="Select Stage to Add"
                size="md"
            >
                <div className="space-y-2 py-4">
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
                    ) : (
                        availableStages.map((stage) => (
                            <button
                                key={stage.id}
                                onClick={() => void handleAddStage(stage.name)}
                                disabled={isAddingStage}
                                className="w-full text-left px-4 py-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
            </Modal>

            <Modal
                isOpen={showStatusModal}
                onClose={() => setShowStatusModal(false)}
                title="Activate Research"
                size="md"
                footer={
                    <div className="flex justify-end gap-3">
                        <Button
                            variant="ghost"
                            onClick={() => setShowStatusModal(false)}
                            disabled={isUpdatingStatus}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleActivateResearch}
                            isLoading={isUpdatingStatus}
                            disabled={isUpdatingStatus || activeResearch?.status === 'active'}
                        >
                            Activate Research
                        </Button>
                    </div>
                }
            >
                <div className="space-y-4 py-4">
                    <div>
                        <p className="text-sm text-gray-600 mb-4">
                            Activating this research will change its status to <span className="font-medium text-blue-600">Active</span> and make it available for participants.
                        </p>
                        <div className="p-3 bg-gray-50 rounded-lg">
                            <p className="text-sm text-gray-600">
                                Current status: <span className="font-medium capitalize">{activeResearch?.status}</span>
                            </p>
                            <p className="text-sm text-gray-600 mt-1">
                                New status: <span className="font-medium capitalize text-blue-600">Active</span>
                            </p>
                        </div>
                    </div>
                    {activeResearch?.status === 'active' && (
                        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                            <p className="text-sm text-yellow-800">
                                This research is already active.
                            </p>
                        </div>
                    )}
                </div>
            </Modal>
        </div>
    );
};

