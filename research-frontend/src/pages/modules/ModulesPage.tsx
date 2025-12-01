import { useState, useEffect, useMemo, useRef } from 'react';
import { Boxes, Plus, Trash2, Eye, FolderOpen, Copy, CheckSquare, Square, Download, Upload, X, SortAsc } from 'lucide-react';
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
import { flat } from '../../utils/radashi';

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

    // Multi-select state
    const [selectedModules, setSelectedModules] = useState<Set<string>>(new Set());
    const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);

    // Sort and filter state
    const [sortBy, setSortBy] = useState<'name' | 'date' | 'usage'>('name');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

    // Import state
    const [isImporting, setIsImporting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Module usage state
    const [moduleUsage, setModuleUsage] = useState<Map<string, { count: number; researches: Array<{ id: string; name: string }> }>>(new Map());
    const usageLoadingRef = useRef<Set<string>>(new Set());

    useEffect(() => {
        loadData();
    }, []);

    // Recalculate tabs when data or search changes
    const { allTabs, currentTab, hasResults } = useMemo(() => {
        // Filter modules by search query
        const matchesSearch = (m: any) =>
            m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            m.description?.toLowerCase().includes(searchQuery.toLowerCase());

        // Filter stages and their modules
        const filteredStages = stages.map(stage => ({
            ...stage,
            modules: stage.modules.filter(matchesSearch)
        })).filter(stage => stage.modules.length > 0 || !searchQuery);

        const filteredUngrouped = ungroupedModules.filter(matchesSearch);

        // Separate screen stages from other stages
        const isScreenStage = (s: StageTemplateWithModules) =>
            s.stage_type === 'single_module' &&
            (s.name === 'Welcome Screen' || s.name === 'Thank You Screen');

        const screenStages = filteredStages.filter(isScreenStage);
        const otherStages = filteredStages.filter(s => !isScreenStage(s));

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

    // Load usage data only for modules in the current visible tab (lazy loading)
    useEffect(() => {
        if (currentTab && currentTab.modules.length > 0) {
            const moduleIds = currentTab.modules.map(m => m.id);
            loadModuleUsage(moduleIds);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTab]); // Only reload when active tab changes

    const loadData = async () => {
        try {
            setIsLoading(true);
            const allModules = await moduleTemplatesService.list();
            const stagesData = await stageTemplatesService.getAll();

            setStages(stagesData);

            // Get all module IDs that are in stages
            const modulesInStages = new Set(
                flat(stagesData.map(stage => stage.modules.map(m => m.id)))
            );

            // Filter out modules that are already in stages
            const ungrouped = allModules.filter(m => !modulesInStages.has(m.id));
            setUngroupedModules(ungrouped);

            // Set initial active tab to first stage with modules
            if (ungrouped.length > 0 || stagesData.length > 0) {
                const firstStageWithModules = stagesData.find(s => s.modules.length > 0);
                setActiveTab(firstStageWithModules?.id || 'ungrouped');
            }

            // Don't load usage data here - will be loaded lazily when needed
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

    const loadModuleUsage = async (moduleIds: string[]) => {
        // Filter out modules that are already being loaded or already have usage data
        const idsToLoad = moduleIds.filter(id => 
            !usageLoadingRef.current.has(id) && !moduleUsage.has(id)
        );
        
        if (idsToLoad.length === 0) {
            return; // Nothing to load
        }
        
        // Mark as loading
        idsToLoad.forEach(id => usageLoadingRef.current.add(id));
        
        // Load usage data in parallel - don't block UI
        const usageMap = new Map<string, { count: number; researches: Array<{ id: string; name: string }> }>();
        
        // Use Promise.allSettled to load all in parallel and handle failures gracefully
        const results = await Promise.allSettled(
            idsToLoad.map(async (id) => {
                try {
                    const usage = await moduleTemplatesService.getUsage(id);
                    return { id, usage };
                } catch (error) {
                    // Silently fail - backend endpoint might not be ready yet
                    return { id, usage: null };
                }
            })
        );
        
        // Process results
        results.forEach((result) => {
            if (result.status === 'fulfilled' && result.value.usage) {
                usageMap.set(result.value.id, result.value.usage);
            }
        });
        
        // Remove from loading set
        idsToLoad.forEach(id => usageLoadingRef.current.delete(id));
        
        // Update state with new usage data
        if (usageMap.size > 0) {
            setModuleUsage(prev => {
                const updated = new Map(prev);
                usageMap.forEach((value, key) => updated.set(key, value));
                return updated;
            });
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
        } catch (error: unknown) {
            console.error('Failed to delete template:', error);
            const errorMessage = error instanceof Error ? error.message : 'Failed to delete module template';
            toast.error(errorMessage);
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
        } catch (error: unknown) {
            console.error('Failed to load module for preview:', error);
            const errorMessage = error instanceof Error ? error.message : 'Failed to load module template';
            toast.error(errorMessage);
        }
    };

    const handleDuplicateClick = (template: ModuleTemplate, e: React.MouseEvent) => {
        e.stopPropagation();
        const newName = prompt(`Enter a name for the duplicated module:`, `${template.name} (Copy)`);
        if (newName && newName.trim()) {
            handleConfirmDuplicate(template.id, newName.trim());
        }
    };

    const handleConfirmDuplicate = async (id: string, newName: string) => {
        try {
            await moduleTemplatesService.duplicate(id, newName);
            await loadData();
            toast.success('Module template duplicated successfully');
        } catch (error: unknown) {
            console.error('Failed to duplicate template:', error);
            const errorMessage = error instanceof Error ? error.message : 'Failed to duplicate module template';
            toast.error(errorMessage);
        }
    };

    const handleToggleSelect = (moduleId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const newSelected = new Set(selectedModules);
        if (newSelected.has(moduleId)) {
            newSelected.delete(moduleId);
        } else {
            newSelected.add(moduleId);
        }
        setSelectedModules(newSelected);
    };

    const handleSelectAll = () => {
        if (!currentTab) return;
        const allIds = new Set(currentTab.modules.map(m => m.id));
        setSelectedModules(allIds);
    };

    const handleDeselectAll = () => {
        setSelectedModules(new Set());
    };

    const handleBulkDelete = async () => {
        if (selectedModules.size === 0) return;

        try {
            setIsDeleting(true);
            await moduleTemplatesService.bulkDelete(Array.from(selectedModules));
            await loadData();
            toast.success(`${selectedModules.size} module template(s) deleted successfully`);
            setSelectedModules(new Set());
            setIsMultiSelectMode(false);
        } catch (error: unknown) {
            console.error('Failed to delete templates:', error);
            const errorMessage = error instanceof Error ? error.message : 'Failed to delete module templates';
            toast.error(errorMessage);
        } finally {
            setIsDeleting(false);
        }
    };

    const handleExportSelected = () => {
        if (selectedModules.size === 0) return;

        const modulesToExport = [...selectedModules].map(id => {
            const module = ungroupedModules.find(m => m.id === id) ||
                stages.flatMap(s => s.modules).find(m => m.id === id);
            return module;
        }).filter(Boolean);

        const dataStr = JSON.stringify(modulesToExport, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
        const exportFileDefaultName = `module-templates-${new Date().toISOString().split('T')[0]}.json`;

        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();

        toast.success(`${selectedModules.size} module(s) exported`);
    };

    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        try {
            setIsImporting(true);
            const text = await file.text();
            const modules = JSON.parse(text);

            if (!Array.isArray(modules)) {
                toast.error('Invalid file format. Expected an array of modules.');
                return;
            }

            const result = await moduleTemplatesService.importFromJson(modules);
            
            if (result.imported > 0) {
                await loadData();
                toast.success(`Successfully imported ${result.imported} module(s)`);
            }

            if (result.errors.length > 0) {
                console.warn('Import errors:', result.errors);
                toast.error(`${result.errors.length} module(s) failed to import. Check console for details.`);
            }

            if (result.imported === 0 && result.errors.length === 0) {
                toast.error('No valid modules found in file');
            }
        } catch (error) {
            console.error('Failed to import modules:', error);
            toast.error('Failed to import modules. Please check the file format.');
        } finally {
            setIsImporting(false);
            // Reset input
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const renderModuleCard = (module: { id: string; name: string; description?: string | null }, fullModule?: ModuleTemplate) => {
        const isSelected = selectedModules.has(module.id);
        const usage = moduleUsage.get(module.id);
        
        return (
            <div
                key={module.id}
                onClick={() => !isMultiSelectMode && navigate(`/modules/${module.id}`)}
                className={cn(
                    "bg-white rounded-lg border p-4 hover:shadow-md transition-all cursor-pointer group relative",
                    isSelected ? "border-blue-500 ring-2 ring-blue-200" : "border-gray-200"
                )}
            >
                {isMultiSelectMode && (
                    <div 
                        className="absolute top-2 left-2 z-10"
                        onClick={(e) => handleToggleSelect(module.id, e)}
                    >
                        {isSelected ? (
                            <CheckSquare className="h-5 w-5 text-blue-600" />
                        ) : (
                            <Square className="h-5 w-5 text-gray-400" />
                        )}
                    </div>
                )}
                <div className="flex items-start justify-between mb-3">
                    <div className="p-2 bg-blue-50 rounded-lg">
                        <Boxes className="h-5 w-5 text-blue-600" />
                    </div>
                    {fullModule && !isMultiSelectMode && (
                        <div className="flex items-center gap-1">
                            <button
                                onClick={(e) => handleDuplicateClick(fullModule, e)}
                                className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                                title="Duplicate"
                            >
                                <Copy className="h-4 w-4" />
                            </button>
                            <button
                                onClick={(e) => handleDeleteClick(fullModule, e)}
                                className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                                title="Delete"
                            >
                                <Trash2 className="h-4 w-4" />
                            </button>
                        </div>
                    )}
                </div>
                <h4 className="text-sm font-semibold text-gray-900 mb-1 group-hover:text-blue-600 transition-colors">
                    {module.name}
                </h4>
                <p className="text-xs text-gray-500 line-clamp-2 mb-3">
                    {module.description || 'No description provided'}
                </p>
                <div className="flex items-center justify-between">
                    {!isMultiSelectMode && (
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
                    )}
                    {usage && usage.count > 0 && (
                        <span 
                            className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full font-medium"
                            title={`Used in ${usage.count} research${usage.count !== 1 ? 'es' : ''}: ${usage.researches.map(r => r.name).join(', ')}`}
                        >
                            {usage.count} use{usage.count !== 1 ? 's' : ''}
                        </span>
                    )}
                </div>
            </div>
        );
    };


    return (
        <div className="h-full p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Modules Management</h1>
                    <p className="mt-1 text-sm text-gray-500">
                        Manage and configure reusable research modules organized by stages
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {!isMultiSelectMode ? (
                        <>
                            <Button 
                                variant="outline" 
                                onClick={handleImportClick}
                                isLoading={isImporting}
                                disabled={isImporting}
                            >
                                <Upload className="h-4 w-4 mr-2" />
                                Import Modules
                            </Button>
                            <Button 
                                variant="outline" 
                                onClick={() => {
                                    setIsMultiSelectMode(true);
                                    setSelectedModules(new Set());
                                }}
                            >
                                <CheckSquare className="h-4 w-4 mr-2" />
                                Select Multiple
                            </Button>
                            <Button onClick={() => navigate('/modules/new')}>
                                <Plus className="h-4 w-4 mr-2" />
                                Create Module
                            </Button>
                        </>
                    ) : (
                        <Button 
                            variant="outline" 
                            onClick={() => {
                                setIsMultiSelectMode(false);
                                setSelectedModules(new Set());
                            }}
                        >
                            <X className="h-4 w-4 mr-2" />
                            Exit Selection Mode
                        </Button>
                    )}
                </div>
            </div>

            <div className="flex items-center gap-4">
                <div className="flex-1 max-w-md">
                    <SearchInput
                        value={searchQuery}
                        onChange={setSearchQuery}
                        placeholder="Search module templates..."
                    />
                </div>
                {!isMultiSelectMode && (
                    <div className="flex items-center gap-2">
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value as 'name' | 'date' | 'usage')}
                            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="name">Sort by Name</option>
                            <option value="date">Sort by Date</option>
                        </select>
                        <button
                            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                            className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                            title={`Sort ${sortOrder === 'asc' ? 'Descending' : 'Ascending'}`}
                        >
                            <SortAsc className={cn('h-4 w-4 text-gray-600', sortOrder === 'desc' && 'rotate-180')} />
                        </button>
                    </div>
                )}
            </div>

            {/* Bulk Actions Bar */}
            {isMultiSelectMode && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <span className="text-sm font-medium text-blue-900">
                            {selectedModules.size} module{selectedModules.size !== 1 ? 's' : ''} selected
                        </span>
                        {currentTab && currentTab.modules.length > 0 && (
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleSelectAll}
                                    className="text-blue-600 hover:text-blue-700"
                                >
                                    Select All ({currentTab.modules.length})
                                </Button>
                                {selectedModules.size > 0 && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={handleDeselectAll}
                                        className="text-blue-600 hover:text-blue-700"
                                    >
                                        Deselect All
                                    </Button>
                                )}
                            </div>
                        )}
                    </div>
                    {selectedModules.size > 0 && (
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleExportSelected}
                            >
                                <Download className="h-4 w-4 mr-2" />
                                Export Selected
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleBulkDelete}
                                isLoading={isDeleting}
                                className="text-red-600 hover:text-red-700 border-red-200 hover:bg-red-50"
                            >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete Selected
                            </Button>
                        </div>
                    )}
                </div>
            )}

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

            {/* Hidden file input for import */}
            <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                onChange={handleFileImport}
                className="hidden"
            />
        </div>
    );
};
