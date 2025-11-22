import { useState, useEffect } from 'react';
import { FileText, Plus, Pencil, Trash2 } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { researchTypesService, type ResearchType } from '../../services/researchTypes.service';
import { useNavigate } from 'react-router-dom';

export const ResearchTypesPage = () => {
    const navigate = useNavigate();
    const [researchTypes, setResearchTypes] = useState<ResearchType[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadResearchTypes();
    }, []);

    const loadResearchTypes = async () => {
        try {
            setIsLoading(true);
            const response = await researchTypesService.list();
            setResearchTypes(response.researchTypes);
        } catch (err) {
            setError('Failed to load research types');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Are you sure you want to delete this research type?')) return;
        try {
            await researchTypesService.delete(id);
            await loadResearchTypes();
        } catch (err) {
            console.error('Failed to delete research type:', err);
            alert('Failed to delete research type');
        }
    };

    return (
        <div className="h-full p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Research Type Builder</h1>
                    <p className="mt-1 text-sm text-gray-500">
                        Create and manage research types with module assignments
                    </p>
                </div>
                <Button onClick={() => navigate('/research-types/new')}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Research Type
                </Button>
            </div>

            {isLoading ? (
                <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-500">Loading research types...</p>
                </div>
            ) : error ? (
                <div className="text-center py-12 text-red-600">
                    {error}
                </div>
            ) : researchTypes.length === 0 ? (
                <div className="rounded-lg border border-gray-200 bg-white p-12 text-center">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-50">
                        <FileText className="h-6 w-6 text-blue-600" />
                    </div>
                    <h3 className="mt-4 text-lg font-semibold text-gray-900">No research types found</h3>
                    <p className="mt-2 text-gray-500">
                        Get started by creating a new research type.
                    </p>
                    <div className="mt-6">
                        <Button onClick={() => navigate('/research-types/new')}>
                            <Plus className="h-4 w-4 mr-2" />
                            Create Research Type
                        </Button>
                    </div>
                </div>
            ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {researchTypes.map((type) => (
                        <div
                            key={type.id}
                            className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-shadow relative"
                        >
                            {/* Action buttons - top right */}
                            <div className="absolute top-4 right-4 flex gap-2">
                                <button
                                    onClick={() => navigate(`/research-types/${type.id}`)}
                                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                                    title="Edit"
                                >
                                    <Pencil className="h-4 w-4" />
                                </button>
                                <button
                                    onClick={() => handleDelete(type.id)}
                                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                                    title="Delete"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </button>
                            </div>

                            {/* Icon */}
                            <div className="mb-4">
                                <div className="inline-flex p-3 bg-blue-50 rounded-lg">
                                    <FileText className="h-6 w-6 text-blue-600" />
                                </div>
                            </div>

                            {/* Content */}
                            <h3 className="text-lg font-semibold text-gray-900 mb-2 pr-16">
                                {type.name}
                            </h3>
                            <p className="text-sm text-gray-500 line-clamp-2 mb-4">
                                {type.description || 'No description provided'}
                            </p>
                            <div className="text-xs text-gray-400">
                                Updated {new Date(type.updated_at || type.created_at).toLocaleDateString()}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
