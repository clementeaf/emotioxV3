import { useState, useEffect } from 'react';
import { Boxes, Plus, Pencil, Trash2 } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { moduleTemplatesService, type ModuleTemplate } from '../../services/moduleTemplates.service';
import { useNavigate } from 'react-router-dom';

export const ModulesPage = () => {
    const navigate = useNavigate();
    const [templates, setTemplates] = useState<ModuleTemplate[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

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

    const handleDelete = async (id: string) => {
        if (!window.confirm('Are you sure you want to delete this module template?')) return;
        try {
            await moduleTemplatesService.delete(id);
            await loadTemplates();
        } catch (err) {
            console.error('Failed to delete template:', err);
            alert('Failed to delete module template');
        }
    };

    return (
        <div className="h-full p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Modules Management</h1>
                    <p className="mt-1 text-sm text-gray-500">
                        Manage and configure reusable research modules
                    </p>
                </div>
                <Button onClick={() => navigate('/modules/new')}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Module
                </Button>
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
            ) : templates.length === 0 ? (
                <div className="rounded-lg border border-gray-200 bg-white p-12 text-center">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-50">
                        <Boxes className="h-6 w-6 text-blue-600" />
                    </div>
                    <h3 className="mt-4 text-lg font-semibold text-gray-900">No modules found</h3>
                    <p className="mt-2 text-gray-500">
                        Get started by creating a new module template.
                    </p>
                    <div className="mt-6">
                        <Button onClick={() => navigate('/modules/new')}>
                            <Plus className="h-4 w-4 mr-2" />
                            Create Module
                        </Button>
                    </div>
                </div>
            ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {templates.map((template) => (
                        <div
                            key={template.id}
                            className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow"
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div className="p-2 bg-blue-50 rounded-lg">
                                    <Boxes className="h-6 w-6 text-blue-600" />
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => navigate(`/modules/${template.id}`)}
                                        className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                                        title="Edit"
                                    >
                                        <Pencil className="h-4 w-4" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(template.id)}
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
                            <div className="text-xs text-gray-400">
                                Updated {new Date(template.updated_at).toLocaleDateString()}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
