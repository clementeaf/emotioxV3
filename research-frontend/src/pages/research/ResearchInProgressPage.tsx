import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { researchService, type Research } from '../../services/research.service';
import { Button } from '../../components/ui/Button';
import { ConfirmationModal } from '../../components/ui/ConfirmationModal';
import { useToast } from '../../hooks/useToast';
import { ClipboardList, ArrowRight, Calendar, Folder, Trash2 } from 'lucide-react';

export const ResearchInProgressPage = () => {
    const navigate = useNavigate();
    const toast = useToast();
    const [researches, setResearches] = useState<Research[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string>('');
    const [deleteModalOpen, setDeleteModalOpen] = useState<boolean>(false);
    const [researchToDelete, setResearchToDelete] = useState<Research | null>(null);
    const [isDeleting, setIsDeleting] = useState<boolean>(false);

    useEffect(() => {
        const fetchRecentResearches = async () => {
            try {
                setLoading(true);
                const response = await researchService.list();
                // Get the 3 most recent researches (sorted by created_at descending)
                const sortedResearches = response.researches
                    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                    .slice(0, 3);
                setResearches(sortedResearches);
            } catch (err: unknown) {
                const errorMessage = err instanceof Error ? err.message : 'Failed to load researches';
                setError(errorMessage);
            } finally {
                setLoading(false);
            }
        };

        void fetchRecentResearches();
    }, []);

    const handleResearchClick = (researchId: string) => {
        navigate(`/research/${researchId}/builder`);
    };

    const handleDeleteClick = (e: React.MouseEvent, research: Research) => {
        e.stopPropagation();
        setResearchToDelete(research);
        setDeleteModalOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!researchToDelete) return;

        try {
            setIsDeleting(true);
            await researchService.delete(researchToDelete.id);
            toast.success('Research deleted successfully!');
            
            // Refresh the list
            const response = await researchService.list();
            const sortedResearches = response.researches
                .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                .slice(0, 3);
            setResearches(sortedResearches);
            
            setDeleteModalOpen(false);
            setResearchToDelete(null);
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to delete research';
            toast.error(errorMessage);
            console.error('Failed to delete research:', err);
        } finally {
            setIsDeleting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                    <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
                    <p className="mt-4 text-gray-600">Loading researches...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="max-w-4xl mx-auto mt-8">
                <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                    <h2 className="text-lg font-semibold text-red-800 mb-2">Error Loading Researches</h2>
                    <p className="text-red-600 mb-4">{error}</p>
                    <Button onClick={() => window.location.reload()} variant="outline">
                        Try Again
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center justify-between">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-blue-100 rounded-lg">
                                <ClipboardList className="h-6 w-6 text-blue-600" />
                            </div>
                            <h1 className="text-3xl font-bold text-gray-900">Research's in Progress</h1>
                        </div>
                        <p className="text-gray-600">Your 3 most recent research projects</p>
                    </div>
                    <Button onClick={() => navigate('/research')}>
                        View All Research
                    </Button>
                </div>
            </div>

            {/* Research List */}
            {researches.length === 0 ? (
                <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-12 text-center">
                    <ClipboardList className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Research Projects Yet</h3>
                    <p className="text-gray-500 mb-6">
                        Create your first research project to get started
                    </p>
                    <Button onClick={() => navigate('/research')}>
                        Create Research
                    </Button>
                </div>
            ) : (
                <div className="space-y-4">
                    {researches.map((research) => (
                        <div
                            key={research.id}
                            className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow cursor-pointer"
                            onClick={() => handleResearchClick(research.id)}
                        >
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                        <h3 className="text-xl font-semibold text-gray-900">
                                            {research.name}
                                        </h3>
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                            {research.status}
                                        </span>
                                    </div>

                                    {research.description && (
                                        <p className="text-gray-600 mb-4">{research.description}</p>
                                    )}

                                    <div className="flex items-center gap-6 text-sm text-gray-500">
                                        <div className="flex items-center gap-2">
                                            <Calendar className="h-4 w-4" />
                                            <span>
                                                Created {new Date(research.created_at).toLocaleDateString('en-US', {
                                                    month: 'short',
                                                    day: 'numeric',
                                                    year: 'numeric'
                                                })}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Folder className="h-4 w-4" />
                                            <span className="font-medium">
                                                {research.research_type_name || 'Unknown Type'}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="ml-4 flex items-center gap-2">
                                    <Button
                                        variant="outline"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleResearchClick(research.id);
                                        }}
                                    >
                                        <span className="flex items-center gap-2">
                                            Open
                                            <ArrowRight className="h-4 w-4" />
                                        </span>
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        onClick={(e) => handleDeleteClick(e, research)}
                                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* View All Link */}
            {researches.length > 0 && (
                <div className="mt-6 text-center">
                    <button
                        onClick={() => navigate('/research')}
                        className="text-blue-600 hover:text-blue-700 font-medium text-sm inline-flex items-center gap-2"
                    >
                        View all research projects
                        <ArrowRight className="h-4 w-4" />
                    </button>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            <ConfirmationModal
                isOpen={deleteModalOpen}
                onClose={() => {
                    setDeleteModalOpen(false);
                    setResearchToDelete(null);
                }}
                onConfirm={handleConfirmDelete}
                title="Delete Research"
                message={`Are you sure you want to delete "${researchToDelete?.name}"? This action cannot be undone.`}
                confirmText="Delete"
                cancelText="Cancel"
                variant="danger"
                isLoading={isDeleting}
            />
        </div>
    );
};
