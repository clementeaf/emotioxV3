import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useEffect, useState, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
    ArrowLeft,
    BarChart3,
    TrendingUp,
    LogOut,
    Users
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { researchService } from '../../services/research.service';
import { stageTemplatesService } from '../../services/stageTemplates.service';
import type { StageTemplateWithModules } from '../../types/moduleBuilder.types';
import { ConfirmationModal } from '../ui/ConfirmationModal';
import { SidebarSkeleton } from '../ui/Skeleton';
import { useToast } from '../../hooks/useToast';
import { researchKeys, useResearch } from '../../hooks/useResearchQuery';
import { useAuthStore } from '../../stores/auth.store';
import { ShareResearchDrawer } from '../research/ShareResearchDrawer';
import { checkedResearchIds, SINGLETON_STAGES } from './ResearchBuilderSidebar.utils';
import { StatusModal } from './StatusModal';
import { AddStageDrawer } from './AddStageDrawer';
import { SidebarStageList } from './SidebarStageList';

interface ResearchBuilderSidebarProps {
    researchId: string;
}

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
    const isViewer = useAuthStore((state) => state.user?.role === 'viewer');

    const { data: activeResearch, isLoading: loadingResearch } = useResearch(researchId);
    const [showStageSelector, setShowStageSelector] = useState(false);
    const [isAddingStage, setIsAddingStage] = useState(false);
    const [showIatTypeSelector, setShowIatTypeSelector] = useState(false);
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
    const [showShareDrawer, setShowShareDrawer] = useState(false);
    const currentUserId = useAuthStore((state) => state.user?.id);
    const isOwner = activeResearch?.created_by === currentUserId || useAuthStore.getState().user?.role === 'admin';

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
                        {[activeResearch.creator_first_name, activeResearch.creator_last_name].filter(Boolean).join(' ') || '—'}
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
                <SidebarStageList
                    researchId={activeResearch.id}
                    stages={activeResearch.stages || []}
                    stimuli={stimuli}
                    isFileBasedResearch={isFileBasedResearch}
                    isClientsBenchmark={isClientsBenchmark}
                    isInsightsFinding={isInsightsFinding}
                    isViewer={isViewer}
                    onAddStageClick={() => {
                        setShowStageSelector(true);
                        // Reset available stages to force reload with current research state
                        setAvailableStages([]);
                        void loadStageTemplates();
                    }}
                    onDeleteStageClick={handleDeleteStageClick}
                />

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

                {/* Share */}
                {!isFileBasedResearch && (
                    <div className="mt-6">
                        <button
                            onClick={() => setShowShareDrawer(true)}
                            className="flex items-center w-full px-2 py-1.5 text-sm text-gray-700 hover:bg-gray-50 rounded transition-colors"
                        >
                            <Users className="h-4 w-4 mr-2" />
                            Share Research
                        </button>
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

            <AddStageDrawer
                isOpen={showStageSelector}
                onClose={() => setShowStageSelector(false)}
                showIatTypeSelector={showIatTypeSelector}
                setShowIatTypeSelector={setShowIatTypeSelector}
                loadingStages={loadingStages}
                availableStages={availableStages}
                isAddingStage={isAddingStage}
                onAddStage={handleAddStage}
            />

            <StatusModal
                isOpen={showStatusModal}
                onClose={() => setShowStatusModal(false)}
                currentStatus={activeResearch?.status}
                isUpdatingStatus={isUpdatingStatus}
                onChangeStatus={handleChangeStatus}
            />

            {activeResearch && (
                <ShareResearchDrawer
                    isOpen={showShareDrawer}
                    onClose={() => setShowShareDrawer(false)}
                    researchId={activeResearch.id}
                    isOwner={isOwner}
                />
            )}
        </div>
    );
};
