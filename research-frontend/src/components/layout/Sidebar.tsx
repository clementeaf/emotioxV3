import { Link, useLocation, matchPath } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
    BrainCircuit,
    LayoutDashboard,
    Settings,
    Boxes,
    Wrench,
    ClipboardList,
    ArrowLeft,
    Loader2,
    ChevronDown,
    ChevronRight,
    Trash2,
    BarChart3
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

interface NavItem {
    path: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
}

const navItems: NavItem[] = [
    { path: '/dashboard', label: 'Home', icon: LayoutDashboard },
    { path: '/research', label: 'Research', icon: Boxes },
    { path: '/research-types', label: 'Research Type Builder', icon: Wrench },
    { path: '/modules', label: 'Modules', icon: Boxes },
    { path: '/research-in-progress', label: "Research's in Progress", icon: ClipboardList },
];

/**
 * Main navigation sidebar
 * Displays logo, navigation items and settings
 * Dynamically changes content when in Research Builder
 */
export const Sidebar = () => {
    const location = useLocation();
    const queryClient = useQueryClient();
    const toast = useToast();
    const [showStageSelector, setShowStageSelector] = useState(false);
    const [isAddingStage, setIsAddingStage] = useState(false);
    const [expandedStages, setExpandedStages] = useState<Set<string>>(new Set());
    const [deleteStageModalOpen, setDeleteStageModalOpen] = useState(false);
    const [deleteModuleModalOpen, setDeleteModuleModalOpen] = useState(false);
    const [stageToDelete, setStageToDelete] = useState<{ id: string; name: string } | null>(null);
    const [moduleToDelete, setModuleToDelete] = useState<{ id: string; name: string; stageId: string } | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [showStatusModal, setShowStatusModal] = useState(false);
    const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
    const [availableStages, setAvailableStages] = useState<StageTemplateWithModules[]>([]);
    const [loadingStages, setLoadingStages] = useState(false);
    const [pendingStageNameToExpand, setPendingStageNameToExpand] = useState<string | null>(null);

    const researchId = useMemo((): string | null => {
        // Supports /builder, /builder/settings, /builder/module/:moduleId
        const builderMatch = location.pathname.match(/^\/research\/([^/]+)\/builder/);
        return builderMatch ? builderMatch[1] : null;
    }, [location.pathname]);

    const { data: activeResearch, isLoading: loadingResearch } = useResearch(researchId);

    useEffect((): void => {
        if (!pendingStageNameToExpand) return;
        if (!activeResearch?.stages) return;

        const newStage = activeResearch.stages.find((s) => s.name === pendingStageNameToExpand);
        if (newStage?.modules && newStage.modules.length > 0) {
            setExpandedStages((prev) => new Set([...prev, newStage.id]));
        }
        setPendingStageNameToExpand(null);
    }, [activeResearch, pendingStageNameToExpand]);

    /**
     * Invalida y refresca el research activo en caché
     * @param id - ID del research
     */
    const invalidateActiveResearch = async (id: string): Promise<void> => {
        await queryClient.invalidateQueries({ queryKey: researchKeys.detail(id) });
    };

    // Load available stage templates only when modal opens
    const loadStageTemplates = async () => {
        if (availableStages.length > 0) return; // Already loaded
        
        try {
            setLoadingStages(true);
            const stages = await stageTemplatesService.getAll();
            setAvailableStages(stages);
        } catch (error: unknown) {
            console.error('Failed to load stage templates', error);
            
            // Check if it's a connection error
            if (error instanceof Error && ('code' in error && error.code === 'ERR_NETWORK' || error.message?.includes('ERR_CONNECTION_REFUSED'))) {
                toast.error('Cannot connect to backend. Please ensure the server is running.');
            } else {
                toast.error('Failed to load available stages');
            }
        } finally {
            setLoadingStages(false);
        }
    };

    /**
     * Determina si un stage es un módulo único o un conjunto de módulos
     * Usa el campo stage_type del stage, o fallback a lógica heurística si no está disponible
     */
    const isStageSingleModule = (stage: { name: string; stage_type?: string; modules?: Array<{ name: string }> }): boolean => {
        // Si tiene stage_type explícito, usarlo
        if (stage.stage_type === 'single_module') return true;
        if (stage.stage_type === 'module_collection') return false;

        // Fallback a lógica heurística si no tiene stage_type
        if (!stage.modules || stage.modules.length === 0) return false;
        if (stage.modules.length > 1) return false;
        // Si tiene exactamente 1 módulo, verificar si el nombre coincide
        return stage.modules[0].name.toLowerCase() === stage.name.toLowerCase();
    };

    /**
     * Maneja el toggle de expansión de un stage
     */
    const toggleStageExpansion = (stageId: string): void => {
        setExpandedStages(prev => {
            const newSet = new Set(prev);
            if (newSet.has(stageId)) {
                newSet.delete(stageId);
            } else {
                newSet.add(stageId);
            }
            return newSet;
        });
    };

    /**
     * Maneja la selección de un stage para agregar
     * @param stageName - Nombre del stage seleccionado
     */
    const handleAddStage = async (stageName: string): Promise<void> => {
        if (!activeResearch) return;

        try {
            setIsAddingStage(true);
            await researchService.addStage(activeResearch.id, stageName);
            toast.success(`Stage "${stageName}" added successfully`);
            setShowStageSelector(false);
            setPendingStageNameToExpand(stageName);
            await invalidateActiveResearch(activeResearch.id);
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to add stage';
            console.error('Error adding stage:', error);
            toast.error(errorMessage);

            // Si es un error de autenticación, redirigir al login
            if (errorMessage.includes('token') || errorMessage.includes('401') || errorMessage.includes('Unauthorized')) {
                window.location.href = '/login';
            }
        } finally {
            setIsAddingStage(false);
        }
    };

    /**
     * Maneja el clic en el botón de eliminar stage
     */
    const handleDeleteStageClick = (e: React.MouseEvent, stageId: string, stageName: string) => {
        e.stopPropagation();
        setStageToDelete({ id: stageId, name: stageName });
        setDeleteStageModalOpen(true);
    };

    /**
     * Maneja la confirmación de eliminación de stage
     */
    const handleConfirmDeleteStage = async () => {
        if (!activeResearch || !stageToDelete) return;

        try {
            setIsDeleting(true);
            await researchService.deleteStage(activeResearch.id, stageToDelete.id);
            toast.success(`Stage "${stageToDelete.name}" deleted successfully`);
            await invalidateActiveResearch(activeResearch.id);

            setDeleteStageModalOpen(false);
            setStageToDelete(null);
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to delete stage';
            console.error('Error deleting stage:', error);
            toast.error(errorMessage);
        } finally {
            setIsDeleting(false);
        }
    };

    /**
     * Maneja el clic en el botón de eliminar módulo
     */
    const handleDeleteModuleClick = (e: React.MouseEvent, moduleId: string, moduleName: string, stageId: string) => {
        e.stopPropagation();
        setModuleToDelete({ id: moduleId, name: moduleName, stageId });
        setDeleteModuleModalOpen(true);
    };

    /**
     * Maneja la confirmación de eliminación de módulo
     */
    const handleConfirmDeleteModule = async () => {
        if (!activeResearch || !moduleToDelete) return;

        try {
            setIsDeleting(true);
            await researchService.deleteModule(activeResearch.id, moduleToDelete.id);
            toast.success(`Module "${moduleToDelete.name}" deleted successfully`);
            await invalidateActiveResearch(activeResearch.id);

            setDeleteModuleModalOpen(false);
            setModuleToDelete(null);
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to delete module';
            console.error('Error deleting module:', error);
            toast.error(errorMessage);
        } finally {
            setIsDeleting(false);
        }
    };

    /**
     * Maneja la activación de la investigación
     */
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

    // Render Research Context Sidebar
    if (activeResearch) {
        return (
            <div className="w-64 bg-white border-r border-gray-100 flex flex-col h-full rounded-lg transition-all duration-300">
                {/* Header with Back Button */}
                <div className="p-4 border-b border-gray-100">
                    <Link
                        to="/research-in-progress"
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
                            onClick={() => {
                                setShowStatusModal(true);
                            }}
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
                                    void loadStageTemplates();
                                }}
                                className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                            >
                                + Add Stage
                            </button>
                        </div>
                        <div className="space-y-2 mt-2">
                            {activeResearch.stages && activeResearch.stages.length > 0 ? (
                                (() => {
                                    // Obtener el módulo activo una sola vez
                                    const activeModuleId = location.pathname.match(/\/module\/([^/]+)/)?.[1];

                                    // Buscar el módulo activo en todos los stages para obtener su información
                                    let activeModule: { id: string; name: string; stageId: string } | null = null;
                                    if (activeModuleId && activeResearch.stages) {
                                        // Primero buscar por ID
                                        for (const stage of activeResearch.stages) {
                                            const stageModules = stage.modules || [];
                                            const foundModule = stageModules.find(m => m.id === activeModuleId);
                                            if (foundModule) {
                                                activeModule = {
                                                    id: foundModule.id,
                                                    name: foundModule.name,
                                                    stageId: stage.id
                                                };
                                                break;
                                            }
                                        }

                                        // Si no se encontró por ID, buscar en ResearchBuilderPage para obtener el nombre del módulo
                                        // Esto es un fallback para casos donde el módulo no está en stage.modules
                                        if (!activeModule) {
                                            // Intentar obtener el módulo desde todos los stages (puede estar en cualquier stage)
                                            const allModules = activeResearch.stages.flatMap(s => s.modules || []);
                                            const foundModule = allModules.find(m => m.id === activeModuleId);
                                            if (foundModule) {
                                                // Encontrar en qué stage está
                                                for (const stage of activeResearch.stages) {
                                                    if (stage.modules?.some(m => m.id === activeModuleId)) {
                                                        activeModule = {
                                                            id: foundModule.id,
                                                            name: foundModule.name,
                                                            stageId: stage.id
                                                        };
                                                        break;
                                                    }
                                                }
                                            }
                                        }
                                    }

                                    return activeResearch.stages
                                        .filter((stage) => stage.description !== 'Automatically created during migration')
                                        .map((stage) => {
                                            const isSingleModule = isStageSingleModule(stage);
                                            const isExpanded = expandedStages.has(stage.id);

                                            // Para módulo único: obtener el módulo directo
                                            let singleModule: (typeof stage.modules)[0] | null = isSingleModule && stage.modules?.[0] ? stage.modules[0] : null;

                                            // Si no se encuentra el módulo en stage.modules pero es single_module, buscar por nombre en todos los módulos
                                            if (isSingleModule && !singleModule && activeResearch.stages) {
                                                const allModules = activeResearch.stages.flatMap(s => s.modules || []);
                                                singleModule = allModules.find(m => m.name.toLowerCase() === stage.name.toLowerCase()) || null;
                                            }

                                            // Para conjunto: obtener todos los módulos ordenados por order_index
                                            const modules = !isSingleModule 
                                                ? (stage.modules || []).sort((a, b) => (a.order_index || 0) - (b.order_index || 0))
                                                : [];

                                            // Verificar si algún módulo está activo
                                            const hasActiveModule = modules.some(m => m.id === activeModuleId) || (singleModule && singleModule.id === activeModuleId);

                                            // Determinar si el stage está activo:
                                            // 1. Si tiene el módulo activo directamente
                                            // 2. Si el módulo activo pertenece a este stage (por stageId) - ESTO ES LO MÁS IMPORTANTE
                                            // 3. Si el módulo activo tiene el mismo nombre que el stage (para single_module stages)
                                            let isStageActive = hasActiveModule ||
                                                (activeModule && activeModule.stageId === stage.id);

                                            // Si aún no está activo, verificar por nombre del módulo (útil para single_module stages)
                                            if (!isStageActive && activeModule && activeModuleId) {
                                                // Si el módulo activo tiene el mismo nombre que el stage, destacarlo
                                                if (activeModule.name.toLowerCase() === stage.name.toLowerCase()) {
                                                    isStageActive = true;
                                                }
                                            }

                                            return (
                                                <div key={stage.id} className="space-y-1">
                                                    {/* Stage Header */}
                                                    {isSingleModule ? (
                                                        // Stage = Módulo único: Link directo (puede o no tener módulo)
                                                        singleModule ? (
                                                            <div className="flex items-center group">
                                                                <Link
                                                                    to={`/research/${activeResearch.id}/builder/module/${singleModule.id}`}
                                                                    className={cn(
                                                                        'flex-1 flex items-center justify-between px-2 py-1.5 text-sm rounded transition-colors cursor-pointer',
                                                                        isStageActive
                                                                            ? 'bg-blue-50 text-blue-600 font-medium'
                                                                            : 'text-gray-700 hover:bg-gray-50'
                                                                    )}
                                                                >
                                                                    <div className="flex-1">
                                                                        <div className="font-medium">{stage.name}</div>
                                                                        {stage.description && (
                                                                            <div className="text-xs text-gray-500 mt-0.5">{stage.description}</div>
                                                                        )}
                                                                    </div>
                                                                </Link>
                                                                <button
                                                                    onClick={(e) => handleDeleteStageClick(e, stage.id, stage.name)}
                                                                    className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-600 transition-all ml-1"
                                                                    title="Delete stage"
                                                                >
                                                                    <Trash2 className="h-3 w-3" />
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            // Stage single_module sin módulo aún - mostrar como div no clickeable
                                                            <div
                                                                className={cn(
                                                                    'flex items-center justify-between px-2 py-1.5 text-sm rounded transition-colors',
                                                                    isStageActive
                                                                        ? 'bg-blue-50 text-blue-600 font-medium'
                                                                        : 'text-gray-700'
                                                                )}
                                                            >
                                                                <div className="flex-1">
                                                                    <div className="font-medium">{stage.name}</div>
                                                                    {stage.description && (
                                                                        <div className="text-xs text-gray-500 mt-0.5">{stage.description}</div>
                                                                    )}
                                                                    <div className="text-xs text-gray-400 italic mt-1">Creating module...</div>
                                                                </div>
                                                            </div>
                                                        )
                                                    ) : (
                                                        // Stage = Conjunto de módulos: Botón expandible
                                                        <div>
                                                            <div className="flex items-center group">
                                                                <button
                                                                    onClick={() => toggleStageExpansion(stage.id)}
                                                                    className={cn(
                                                                        'flex-1 flex items-center justify-between px-2 py-1.5 text-sm rounded transition-colors',
                                                                        isStageActive
                                                                            ? 'bg-blue-50 text-blue-600 font-medium'
                                                                            : 'text-gray-700 hover:bg-gray-50'
                                                                    )}
                                                                >
                                                                    <div className="flex-1 text-left">
                                                                        <div className="font-medium">{stage.name}</div>
                                                                        {stage.description && (
                                                                            <div className="text-xs text-gray-500 mt-0.5">{stage.description}</div>
                                                                        )}
                                                                    </div>
                                                                    {modules.length > 0 && (
                                                                        isExpanded ? (
                                                                            <ChevronDown className="h-4 w-4 text-gray-400" />
                                                                        ) : (
                                                                            <ChevronRight className="h-4 w-4 text-gray-400" />
                                                                        )
                                                                    )}
                                                                </button>
                                                                <button
                                                                    onClick={(e) => handleDeleteStageClick(e, stage.id, stage.name)}
                                                                    className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-600 transition-all ml-1"
                                                                    title="Delete stage"
                                                                >
                                                                    <Trash2 className="h-3 w-3" />
                                                                </button>
                                                            </div>

                                                            {/* Lista de módulos (expandible) */}
                                                            {isExpanded && modules.length > 0 && (
                                                                <div className="ml-4 mt-1 space-y-1 border-l-2 border-gray-200 pl-3">
                                                                    {modules.map((module) => {
                                                                        const isModuleActive = module.id === activeModuleId;
                                                                        return (
                                                                            <div key={module.id} className="flex items-center group">
                                                                                <Link
                                                                                    to={`/research/${activeResearch.id}/builder/module/${module.id}`}
                                                                                    className={cn(
                                                                                        'flex-1 block px-2 py-1.5 text-xs rounded transition-colors',
                                                                                        isModuleActive
                                                                                            ? 'bg-blue-50 text-blue-600 font-medium'
                                                                                            : 'text-gray-600 hover:bg-gray-50'
                                                                                    )}
                                                                                >
                                                                                    {module.name}
                                                                                </Link>
                                                                                <button
                                                                                    onClick={(e) => handleDeleteModuleClick(e, module.id, module.name, stage.id)}
                                                                                    className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-600 transition-all ml-1"
                                                                                    title="Delete module"
                                                                                >
                                                                                    <Trash2 className="h-3 w-3" />
                                                                                </button>
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        });
                                })()
                            ) : (
                                <p className="text-xs text-gray-400 italic px-2">No stages defined</p>
                            )}
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

                {/* Delete Stage Confirmation Modal */}
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

                {/* Delete Module Confirmation Modal */}
                <ConfirmationModal
                    isOpen={deleteModuleModalOpen}
                    onClose={() => setDeleteModuleModalOpen(false)}
                    onConfirm={handleConfirmDeleteModule}
                    title="Delete Module"
                    message={`Are you sure you want to delete the module "${moduleToDelete?.name}"? This action cannot be undone.`}
                    confirmText="Delete"
                    cancelText="Cancel"
                    variant="danger"
                    isLoading={isDeleting}
                />

                {/* Stage Selector Modal */}
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

                {/* Activate Research Modal */}
                <Modal
                    isOpen={showStatusModal}
                    onClose={() => {
                        setShowStatusModal(false);
                    }}
                    title="Activate Research"
                    size="md"
                    footer={
                        <div className="flex justify-end gap-3">
                            <Button
                                variant="ghost"
                                onClick={() => {
                                    setShowStatusModal(false);
                                }}
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
    }

    // Render Loading State (optional, keeps sidebar present but loading)
    if (loadingResearch && matchPath('/research/:id/builder', location.pathname)) {
        return (
            <div className="w-64 bg-white border-r border-gray-100 flex flex-col h-full rounded-lg items-center justify-center">
                <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
            </div>
        );
    }

    // Render Standard Navigation Sidebar
    return (
        <div className="w-64 bg-white border-r border-gray-100 flex flex-col h-full rounded-lg">
            {/* Logo y dropdown */}
            <div className="p-4 border-b border-gray-100">
                <div className="flex flex-col items-center justify-between gap-4">
                    <div className="flex items-center">
                        <div className="rounded-full bg-blue-500 p-2">
                            <BrainCircuit className="h-5 w-5 text-white" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Navigation Items */}
            <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
                {navItems.map((item) => {
                    const Icon = item.icon;
                    // Exact match or starts with path followed by a slash
                    const isActive = location.pathname === item.path ||
                        (item.path !== '/dashboard' && location.pathname.startsWith(item.path + '/'));

                    return (
                        <Link
                            key={item.path}
                            to={item.path}
                            className={cn(
                                'flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                                isActive
                                    ? 'bg-blue-50 text-blue-600'
                                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                            )}
                        >
                            <Icon className={cn('h-5 w-5 mr-3', isActive ? 'text-blue-600' : 'text-gray-400')} />
                            {item.label}
                        </Link>
                    );
                })}
            </nav>

            {/* Settings */}
            <div className="p-4 border-t border-gray-100">
                <Link
                    to="/settings"
                    className={cn(
                        'flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                        location.pathname === '/settings'
                            ? 'bg-blue-50 text-blue-600'
                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    )}
                >
                    <Settings className={cn('h-5 w-5 mr-3', location.pathname === '/settings' ? 'text-blue-600' : 'text-gray-400')} />
                    Settings
                </Link>
            </div>
        </div>
    );
};
