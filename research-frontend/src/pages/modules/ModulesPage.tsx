import { useState, useEffect } from 'react';
import { Boxes, Plus, Pencil, Trash2, Eye, Grid3x3, List } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { ModulePreviewModal } from '../../components/modules/ModulePreviewModal';
import { ConfirmationModal } from '../../components/ui/ConfirmationModal';
import { moduleTemplatesService, type ModuleTemplate } from '../../services/moduleTemplates.service';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../contexts/ToastContext';
import { SearchInput } from '../../components/ui/SearchInput';

type ViewMode = 'cards' | 'list';

export const ModulesPage = () => {
    const navigate = useNavigate();
    const toast = useToast();
    const [templates, setTemplates] = useState<ModuleTemplate[]>([]);
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
        loadTemplates();
    }, []);

    const loadTemplates = async () => {
        try {
            setIsLoading(true);
            const data = await moduleTemplatesService.list();
            setTemplates(data);
        } catch (err) {
            setError('Failed to load module templates');
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
            await loadTemplates();
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

    const handlePreview = (template: ModuleTemplate) => {
        setSelectedModule(template);
        setShowPreview(true);
    };

    const handleEdit = (id: string, e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent card click
        navigate(`/modules/${id}`);
    };

    const filteredTemplates = templates.filter(template =>
        template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        template.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="h-full p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Modules Management</h1>
                    <p className="mt-1 text-sm text-gray-500">
                        Manage and configure reusable research modules
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    {/* View Toggle */}
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
            ) : filteredTemplates.length === 0 ? (
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
            ) : viewMode === 'cards' ? (
                /* Card View */
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {filteredTemplates.map((template) => (
                        <div
                            key={template.id}
                            onClick={() => handlePreview(template)}
                            className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer"
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div className="p-2 bg-blue-50 rounded-lg">
                                    <Boxes className="h-6 w-6 text-blue-600" />
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={(e) => handleEdit(template.id, e)}
                                        className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                                        title="Edit"
                                    >
                                        <Pencil className="h-4 w-4" />
                                    </button>
                                    <button
                                        onClick={(e) => handleDeleteClick(template, e)}
                                        className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                                        title="Delete"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                {template.name}
                            </h3>
                            <p className="text-sm text-gray-500 line-clamp-2 mb-4">
                                {template.description || 'No description provided'}
                            </p>
                            <div className="flex items-center justify-between">
                                <div className="text-xs text-gray-400">
                                    Updated {new Date(template.updated_at).toLocaleDateString()}
                                </div>
                                <div className="flex items-center gap-1 text-xs text-blue-600">
                                    <Eye className="h-3 w-3" />
                                    <span>Click to preview</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                /* List View */
                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Module
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Description
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Updated
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {filteredTemplates.map((template) => (
                                <tr
                                    key={template.id}
                                    onClick={() => handlePreview(template)}
                                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                                >
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-blue-50 rounded-lg">
                                                <Boxes className="h-5 w-5 text-blue-600" />
                                            </div>
                                            <div className="font-medium text-gray-900">{template.name}</div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm text-gray-500 line-clamp-1">
                                            {template.description || 'No description provided'}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-gray-500">
                                            {new Date(template.updated_at).toLocaleDateString()}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <button
                                                onClick={(e) => handleEdit(template.id, e)}
                                                className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                                                title="Edit"
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </button>
                                            <button
                                                onClick={(e) => handleDeleteClick(template, e)}
                                                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                                                title="Delete"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            <ModulePreviewModal
                module={selectedModule}
                isOpen={showPreview}
                onClose={() => setShowPreview(false)}
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
