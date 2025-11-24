import { Link, useLocation, matchPath } from 'react-router-dom';
import { useEffect, useState } from 'react';
import {
    BrainCircuit,
    LayoutDashboard,
    Settings,
    FileText,
    Boxes,
    Wrench,
    ClipboardList,
    ArrowLeft,
    Loader2,
    ChevronDown,
    ChevronRight
} from 'lucide-react';
import { cn } from '../ui/Button';
import { researchService, type Research } from '../../services/research.service';
import { Modal } from '../ui/Modal';
import { useToast } from '../../contexts/ToastContext';

interface NavItem {
    path: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
}

const navItems: NavItem[] = [
    { path: '/dashboard', label: 'Home', icon: LayoutDashboard },
    { path: '/research', label: 'Research', icon: FileText },
    { path: '/research-types', label: 'Research Type Builder', icon: Wrench },
    { path: '/modules', label: 'Modules', icon: Boxes },
    { path: '/research-in-progress', label: "Research's in Progress", icon: ClipboardList },
];

/**
 * Main navigation sidebar
 * Displays logo, navigation items and settings
 * Dynamically changes content when in Research Builder
 */
const AVAILABLE_STAGES = [
    { name: 'Welcome Screen', description: 'Introduction screen for participants' },
    { name: 'Thank You Screen', description: 'Completion screen after research' },
    { name: 'Research Configuration', description: 'Research settings and configuration' },
    { name: 'Smart VOC', description: 'Voice of Customer module' },
    { name: 'Cognitive Task', description: 'Cognitive performance assessment' },
];

export const Sidebar = () => {
    const location = useLocation();
    const [activeResearch, setActiveResearch] = useState<Research | null>(null);
    const [loadingResearch, setLoadingResearch] = useState(false);
    const [showStageSelector, setShowStageSelector] = useState(false);
    const [isAddingStage, setIsAddingStage] = useState(false);
    const [expandedStages, setExpandedStages] = useState<Set<string>>(new Set());
    const toast = useToast();

    useEffect(() => {
        // Check if we're in a research builder route (supports /builder, /builder/settings, /builder/module/:moduleId)
        const builderMatch = location.pathname.match(/^\/research\/([^\/]+)\/builder/);
        const researchId = builderMatch ? builderMatch[1] : null;

        const fetchResearch = async (id: string) => {
            try {
                setLoadingResearch(true);
                const response = await researchService.getById(id);
                setActiveResearch(response.research);
            } catch (error) {
                console.error('Failed to fetch research for sidebar', error);
                setActiveResearch(null);
            } finally {
                setLoadingResearch(false);
            }
        };

        if (researchId) {
            // Only fetch if we don't have it or it's a different ID
            if (!activeResearch || activeResearch.id !== researchId) {
                void fetchResearch(researchId);
            }
        } else {
            // Reset if we leave the builder
            if (activeResearch) {
                setActiveResearch(null);
            }
        }
    }, [location.pathname]);

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

            // Recargar el research para obtener los nuevos stages
            const response = await researchService.getById(activeResearch.id);
            setActiveResearch(response.research);
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

                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-blue-100 rounded-lg">
                            <FileText className="h-5 w-5 text-blue-600" />
                        </div>
                    </div>

                    <h2 className="font-bold text-gray-900 truncate text-lg" title={activeResearch.name}>
                        {activeResearch.name}
                    </h2>
                </div>

                {/* Research Details */}
                <div className="flex-1 p-4 space-y-6 overflow-y-auto">
                    <div>
                        <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-1">
                            Research Type
                        </label>
                        <p className="text-sm font-medium text-gray-900 bg-gray-50 p-2 rounded border border-gray-100">
                            {activeResearch.research_type_name || 'Unknown Type'}
                        </p>
                    </div>

                    <div>
                        <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-1">
                            Technique
                        </label>
                        <p className="text-sm font-medium text-gray-900 bg-gray-50 p-2 rounded border border-gray-100">
                            {activeResearch.research_technique_name || 'Unknown Technique'}
                        </p>
                    </div>

                    <div>
                        <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-1">
                            Status
                        </label>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 capitalize">
                            {activeResearch.status}
                        </span>
                    </div>

                    {/* Stages Section */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">
                                Stages
                            </label>
                            <button
                                onClick={() => setShowStageSelector(true)}
                                className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                            >
                                + Add Stage
                            </button>
                        </div>
                        <div className="space-y-2 mt-2">
                            {activeResearch.stages && activeResearch.stages.length > 0 ? (
                                (() => {
                                    // Obtener el módulo activo una sola vez
                                    const activeModuleId = location.pathname.match(/\/module\/([^\/]+)/)?.[1];
                                    
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
                                            const singleModule = isSingleModule && stage.modules?.[0];
                                            
                                            // Para conjunto: obtener todos los módulos
                                            const modules = !isSingleModule ? (stage.modules || []) : [];
                                            
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
                                                        <Link
                                                            to={`/research/${activeResearch.id}/builder/module/${singleModule.id}`}
                                                            className={cn(
                                                                'flex items-center justify-between px-2 py-1.5 text-sm rounded transition-colors cursor-pointer',
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
                                                    ) : (
                                                        // Stage single_module sin módulo aún - mostrar como div destacable
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
                                                            </div>
                                                        </div>
                                                    )
                                                ) : (
                                                    // Stage = Conjunto de módulos: Botón expandible
                                                    <div>
                                                        <button
                                                            onClick={() => toggleStageExpansion(stage.id)}
                                                            className={cn(
                                                                'w-full flex items-center justify-between px-2 py-1.5 text-sm rounded transition-colors',
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
                                                        
                                                        {/* Lista de módulos (expandible) */}
                                                        {isExpanded && modules.length > 0 && (
                                                            <div className="ml-4 mt-1 space-y-1 border-l-2 border-gray-200 pl-3">
                                                                {modules.map((module) => {
                                                                    const isModuleActive = module.id === activeModuleId;
                                                                    return (
                                                                        <Link
                                                                            key={module.id}
                                                                            to={`/research/${activeResearch.id}/builder/module/${module.id}`}
                                                                            className={cn(
                                                                                'block px-2 py-1.5 text-xs rounded transition-colors',
                                                                                isModuleActive
                                                                                    ? 'bg-blue-50 text-blue-600 font-medium'
                                                                                    : 'text-gray-600 hover:bg-gray-50'
                                                                            )}
                                                                        >
                                                                            {module.name}
                                                                        </Link>
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
                </div>

                {/* Stage Selector Modal */}
                <Modal
                    isOpen={showStageSelector}
                    onClose={() => setShowStageSelector(false)}
                    title="Select Stage to Add"
                    size="md"
                >
                    <div className="space-y-2 py-4">
                        {AVAILABLE_STAGES.map((stage) => (
                            <button
                                key={stage.name}
                                onClick={() => void handleAddStage(stage.name)}
                                disabled={isAddingStage}
                                className="w-full text-left px-4 py-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <div className="font-medium text-gray-900">{stage.name}</div>
                                {stage.description && (
                                    <div className="text-sm text-gray-500 mt-1">{stage.description}</div>
                                )}
                            </button>
                        ))}
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
