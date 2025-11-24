import { useState, useEffect, useMemo } from 'react';
import { Boxes, Plus, Trash2, Eye, FolderOpen } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { ModulePreviewModal } from '../../components/modules/ModulePreviewModal';
import { ConfirmationModal } from '../../components/ui/ConfirmationModal';
import { moduleTemplatesService, type ModuleTemplate } from '../../services/moduleTemplates.service';
import { stageTemplatesService } from '../../services/stageTemplates.service';
import type { StageTemplateWithModules } from '../../types/moduleBuilder.types';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../contexts/ToastContext';
import { SearchInput } from '../../components/ui/SearchInput';
import { cn } from '../../components/ui/Button';

export const ModulesPage = () => {
    const navigate = useNavigate();
    const toast = useToast();
    const [stages, setStages] = useState<StageTemplateWithModules[]>([]);
    const [ungroupedModules, setUngroupedModules] = useState<ModuleTemplate[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedModule, setSelectedModule] = useState<ModuleTemplate | null>(null);
    const [showPreview, setShowPreview] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState<string | null>(null);

    // Delete modal state
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [moduleToDelete, setModuleToDelete] = useState<ModuleTemplate | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    // Recalculate tabs when data or search changes
    const { allTabs, currentTab, hasResults } = useMemo(() => {
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

        const screenStages = filteredStages.filter(s => 
            s.stage_type === 'single_module' && 
            (s.name === 'Welcome Screen' || s.name === 'Thank You Screen')
        );
        const otherStages = filteredStages.filter(s => 
            !(s.stage_type === 'single_module' && 
            (s.name === 'Welcome Screen' || s.name === 'Thank You Screen'))
        );

        const tabs = [
            ...(screenStages.length > 0 ? [{
                id: 'screen-modules',
                name: 'Screen Modules',
                modules: screenStages.flatMap(s => s.modules),
                description: 'Welcome and Thank You screens'
            }] : []),
            ...otherStages.map(s => ({
                id: s.id,
                name: s.name,
                modules: s.modules,
                description: s.description || null
            })),
            ...(filteredUngrouped.length > 0 ? [{
                id: 'ungrouped',
                name: 'Other Modules',
                modules: filteredUngrouped,
                description: null
            }] : [])
        ];

        const results = filteredStages.some(s => s.modules.length > 0) || filteredUngrouped.length > 0;
        const tab = tabs.find(t => t.id === activeTab) || tabs[0];

        return { allTabs: tabs, currentTab: tab, hasResults: results };
    }, [stages, ungroupedModules, searchQuery, activeTab]);

    // Update active tab when search changes or tabs change
    useEffect(() => {
        if (allTabs.length > 0) {
            const currentTabExists = allTabs.some(t => t.id === activeTab);
            if (!currentTabExists || (currentTab && currentTab.modules.length === 0 && allTabs.some(t => t.modules.length > 0))) {
                const firstTabWithModules = allTabs.find(t => t.modules.length > 0);
                if (firstTabWithModules) {
                    setActiveTab(firstTabWithModules.id);
                } else if (allTabs.length > 0) {
                    setActiveTab(allTabs[0].id);
                }
            }
        }
    }, [searchQuery, allTabs, activeTab, currentTab]);

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

            // Set initial active tab to first stage with modules
            if (stagesData.length > 0) {
                const firstStageWithModules = stagesData.find(s => s.modules.length > 0);
                if (firstStageWithModules) {
                    setActiveTab(firstStageWithModules.id);
                } else if (ungrouped.length > 0) {
                    setActiveTab('ungrouped');
                }
            } else if (ungrouped.length > 0) {
                setActiveTab('ungrouped');
            }
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

    const handlePreview = async (moduleId: string) => {
        try {
            // Load the full module template with structure
            const module = await moduleTemplatesService.getById(moduleId);
            setSelectedModule(module);
            setShowPreview(true);
        } catch (error) {
            console.error('Failed to load module for preview:', error);
            toast.error('Failed to load module template');
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


    return (
        <div className="h-full p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Modules Management</h1>
                    <p className="mt-1 text-sm text-gray-500">
                        Manage and configure reusable research modules organized by stages
                    </p>
                </div>
                <Button onClick={() => navigate('/modules/new')}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Module
                </Button>
            </div>

            <div className="flex items-center gap-4">
                <div className="flex-1 max-w-md">
                    <SearchInput
                        value={searchQuery}
                        onChange={setSearchQuery}
                        placeholder="Search module templates..."
                    />
                </div>
            </div>

            {/* Horizontal Tabs */}
            {hasResults && allTabs.length > 0 && (
                <div className="border-b border-gray-200">
                    <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
                        {allTabs.map((tab) => {
                            const isActive = activeTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={cn(
                                        'px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors',
                                        isActive
                                            ? 'border-blue-600 text-blue-600'
                                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                    )}
                                >
                                    <span className="flex items-center gap-2">
                                        <FolderOpen className={cn('h-4 w-4', isActive ? 'text-blue-600' : 'text-gray-400')} />
                                        {tab.name}
                                        <span className={cn(
                                            'px-2 py-0.5 rounded-full text-xs',
                                            isActive ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                                        )}>
                                            {tab.modules.length}
                                        </span>
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

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
                currentTab && (
                    <div className="space-y-4">
                        {currentTab.description && (
                            <p className="text-sm text-gray-600">{currentTab.description}</p>
                        )}
                        {currentTab.modules.length > 0 ? (
                            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                                {currentTab.modules.map(module => {
                                    const fullModule = ungroupedModules.find(m => m.id === module.id) || 
                                                     stages.flatMap(s => s.modules).find(m => m.id === module.id);
                                    return renderModuleCard(module, fullModule as ModuleTemplate | undefined);
                                })}
                            </div>
                        ) : (
                            <div className="rounded-lg border border-gray-200 bg-white p-12 text-center">
                                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gray-50">
                                    <Boxes className="h-6 w-6 text-gray-400" />
                                </div>
                                <h3 className="mt-4 text-lg font-semibold text-gray-900">No modules in this stage</h3>
                                <p className="mt-2 text-gray-500">
                                    {searchQuery ? 'Try adjusting your search.' : 'This stage has no modules yet.'}
                                </p>
                            </div>
                        )}
                    </div>
                )
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
