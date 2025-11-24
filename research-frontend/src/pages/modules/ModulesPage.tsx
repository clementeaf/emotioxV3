import { useState, useEffect } from 'react';
import { Boxes, Plus, Trash2, Eye, Grid3x3, List, FolderOpen } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { ModulePreviewModal } from '../../components/modules/ModulePreviewModal';
import { ConfirmationModal } from '../../components/ui/ConfirmationModal';
import { moduleTemplatesService, type ModuleTemplate } from '../../services/moduleTemplates.service';
import { stageTemplatesService } from '../../services/stageTemplates.service';
import type { StageTemplateWithModules } from '../../types/moduleBuilder.types';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../contexts/ToastContext';
import { SearchInput } from '../../components/ui/SearchInput';

type ViewMode = 'cards' | 'list';

export const ModulesPage = () => {
    const navigate = useNavigate();
    const toast = useToast();
    const [stages, setStages] = useState<StageTemplateWithModules[]>([]);
    const [ungroupedModules, setUngroupedModules] = useState<ModuleTemplate[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedModule, setSelectedModule] = useState<ModuleTemplate | null>(null);
    const [showPreview, setShowPreview] = useState(false);
    const [viewMode, setViewMode] = useState<ViewMode>('cards');
    const [searchQuery, setSearchQuery] = useState('');

    // Delete modal state
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [moduleToDelete, setModuleToDelete] = useState<ModuleTemplate | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setIsLoading(true);
            const [stagesData, allModules] = await Promise.all([
                stageTemplatesService.getAll(),
                moduleTemplatesService.list()
            ]);

            setStages(stagesData);

            // Find modules that aren't in any stage
            const modulesInStages = new Set(
                stagesData.flatMap(stage => stage.modules.map(m => m.id))
            );
            const ungrouped = allModules.filter(m => !modulesInStages.has(m.id));
            setUngroupedModules(ungrouped);
        } catch (err: any) {
            // Handle 401 Unauthorized - redirect to login
            if (err?.response?.status === 401) {
                console.error('Unauthorized - redirecting to login');
                navigate('/login');
                return;
            }
            setError('Failed to load data');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteClick = (template: ModuleTemplate, e: React.MouseEvent) => {
        e.stopPropagation();
        setModuleToDelete(template);
        setDeleteModalOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!moduleToDelete) return;

        try {
            setIsDeleting(true);
            await moduleTemplatesService.delete(moduleToDelete.id);
            await loadData();
            toast.success('Module template deleted successfully');
            setDeleteModalOpen(false);
            setModuleToDelete(null);
        } catch (error) {
            console.error('Failed to delete template:', error);
            toast.error('Failed to delete module template');
        } finally {
            setIsDeleting(false);
        }
    };

    const handlePreview = (moduleId: string) => {
        // Find the module in all modules
        const allModules = [
            ...stages.flatMap(s => s.modules),
            ...ungroupedModules
        ];
        const module = allModules.find(m => m.id === moduleId);
        if (module) {
            // Convert to ModuleTemplate format for preview
            setSelectedModule(module as any);
            setShowPreview(true);
        }
    };

    const renderModuleCard = (module: { id: string; name: string; description?: string | null }, fullModule?: ModuleTemplate) => (
        <div
            key={module.id}
            onClick={() => navigate(`/modules/${module.id}`)}
            className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer group"
        >
            <div className="flex items-start justify-between mb-3">
                <div className="p-2 bg-blue-50 rounded-lg">
                    <Boxes className="h-5 w-5 text-blue-600" />
                </div>
                {fullModule && (
                    <button
                        onClick={(e) => handleDeleteClick(fullModule, e)}
                        className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                        title="Delete"
                    >
                        <Trash2 className="h-4 w-4" />
                    </button>
                )}
            </div>
            <h4 className="text-sm font-semibold text-gray-900 mb-1 group-hover:text-blue-600 transition-colors">
                {module.name}
            </h4>
            <p className="text-xs text-gray-500 line-clamp-2 mb-3">
                {module.description || 'No description provided'}
            </p>
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    handlePreview(module.id);
                }}
                className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 transition-colors"
            >
                <Eye className="h-3 w-3" />
                <span>Preview</span>
            </button>
        </div>
    );

    const filteredStages = stages.map(stage => ({
        ...stage,
        modules: stage.modules.filter(m =>
            m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            m.description?.toLowerCase().includes(searchQuery.toLowerCase())
        )
    })).filter(stage => stage.modules.length > 0 || !searchQuery);

    const filteredUngrouped = ungroupedModules.filter(m =>
        m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const hasResults = filteredStages.some(s => s.modules.length > 0) || filteredUngrouped.length > 0;

    return (
        <div className="h-full p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Modules Management</h1>
                    <p className="mt-1 text-sm text-gray-500">
                        Manage and configure reusable research modules organized by stages
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                        <button
                            onClick={() => setViewMode('cards')}
                            className={`p-2 rounded-md transition-colors ${viewMode === 'cards'
                                ? 'bg-white text-blue-600 shadow-sm'
                                : 'text-gray-600 hover:text-gray-900'
                                }`}
                            title="Card view"
                        >
                            <Grid3x3 className="h-4 w-4" />
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={`p-2 rounded-md transition-colors ${viewMode === 'list'
                                ? 'bg-white text-blue-600 shadow-sm'
                                : 'text-gray-600 hover:text-gray-900'
                                }`}
                            title="List view"
                        >
                            <List className="h-4 w-4" />
                        </button>
                    </div>
                    <Button onClick={() => navigate('/modules/new')}>
                        <Plus className="h-4 w-4 mr-2" />
                        Create Module
                    </Button>
                </div>
            </div>

            <div className="w-full max-w-md">
                <SearchInput
                    value={searchQuery}
                    onChange={setSearchQuery}
                    placeholder="Search module templates..."
                />
            </div>

            {isLoading ? (
                <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-500">Loading modules...</p>
                </div>
            ) : error ? (
                <div className="text-center py-12 text-red-600">
                    {error}
                </div>
            ) : !hasResults ? (
                <div className="rounded-lg border border-gray-200 bg-white p-12 text-center">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-50">
                        <Boxes className="h-6 w-6 text-blue-600" />
                    </div>
                    <h3 className="mt-4 text-lg font-semibold text-gray-900">No modules found</h3>
                    <p className="mt-2 text-gray-500">
                        {searchQuery ? 'Try adjusting your search.' : 'Get started by creating a new module template.'}
                    </p>
                    {!searchQuery && (
                        <div className="mt-6">
                            <Button onClick={() => navigate('/modules/new')}>
                                <Plus className="h-4 w-4 mr-2" />
                                Create Module
                            </Button>
                        </div>
                    )}
                </div>
            ) : (
                <div className="space-y-8">
                    {/* Stages with modules */}
                    {filteredStages.map(stage => (
                        stage.modules.length > 0 && (
                            <div key={stage.id} className="space-y-4">
                                <div className="flex items-center gap-3">
                                    <FolderOpen className="h-5 w-5 text-gray-600" />
                                    <h2 className="text-lg font-semibold text-gray-900">{stage.name}</h2>
                                    <span className="text-sm text-gray-500">({stage.modules.length})</span>
                                </div>
                                {stage.description && (
                                    <p className="text-sm text-gray-600 ml-8">{stage.description}</p>
                                )}
                                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                                    {stage.modules.map(module => renderModuleCard(module))}
                                </div>
                            </div>
                        )
                    ))}

                    {/* Ungrouped modules */}
                    {filteredUngrouped.length > 0 && (
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <Boxes className="h-5 w-5 text-gray-600" />
                                <h2 className="text-lg font-semibold text-gray-900">Other Modules</h2>
                                <span className="text-sm text-gray-500">({filteredUngrouped.length})</span>
                            </div>
                            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                                {filteredUngrouped.map(module => renderModuleCard(module, module))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            <ModulePreviewModal
                module={selectedModule}
                isOpen={showPreview}
                onClose={() => setShowPreview(false)}
                onEdit={() => {
                    if (selectedModule) {
                        navigate(`/modules/${selectedModule.id}`);
                    }
                }}
            />

            <ConfirmationModal
                isOpen={deleteModalOpen}
                onClose={() => setDeleteModalOpen(false)}
                onConfirm={handleConfirmDelete}
                title="Delete Module Template"
                message={`Are you sure you want to delete "${moduleToDelete?.name}"? This action cannot be undone.`}
                confirmText="Delete"
                cancelText="Cancel"
                variant="danger"
                isLoading={isDeleting}
            />
        </div>
    );
};
