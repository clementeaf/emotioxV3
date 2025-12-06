import { useState, useCallback, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { CreateResearchForm } from '../../components/research/CreateResearchForm';
import { CreateResearchTechniqueModal } from '../../components/research/CreateResearchTechniqueModal';
import { CreateEnterpriseModal } from '../../components/research/CreateEnterpriseModal';
import { useResearches, useDeleteResearch } from '../../hooks/useResearchQuery';
import { Button } from '../../components/ui/Button';
import { ConfirmationModal } from '../../components/ui/ConfirmationModal';
import { ArrowRight, Calendar, Folder, Plus, Trash2 } from 'lucide-react';
import type { Research } from '../../services/research.service';

/**
 * Componente memoizado para tarjeta de investigación
 */
const ResearchCard = memo(({ 
    research, 
    onResearchClick, 
    onDelete 
}: { 
    research: Research; 
    onResearchClick: (id: string) => void;
    onDelete: (research: Research, e: React.MouseEvent) => void;
}) => {
    const formattedDate = new Date(research.created_at).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });

    return (
        <div
            className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => onResearchClick(research.id)}
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
                            <span>Created {formattedDate}</span>
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
                            onResearchClick(research.id);
                        }}
                    >
                        <span className="flex items-center gap-2">
                            Open
                            <ArrowRight className="h-4 w-4" />
                        </span>
                    </Button>
                    <Button
                        variant="ghost"
                        onClick={(e) => onDelete(research, e)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        </div>
    );
});

ResearchCard.displayName = 'ResearchCard';

/**
 * Main Research page - Optimizado con React Query
 * Lists all research projects and allows creating new ones
 */
export const ResearchPage = () => {
    const navigate = useNavigate();
    const [showTechniqueModal, setShowTechniqueModal] = useState<boolean>(false);
    const [showEnterpriseModal, setShowEnterpriseModal] = useState<boolean>(false);
    const [showCreateForm, setShowCreateForm] = useState<boolean>(false);
    const [deleteModalOpen, setDeleteModalOpen] = useState<boolean>(false);
    const [researchToDelete, setResearchToDelete] = useState<Research | null>(null);

    // Usar React Query para datos optimizados
    const { data: researches = [], isLoading, error } = useResearches();
    const deleteResearch = useDeleteResearch();

    // Type assertion para TypeScript
    const typedResearches = researches as Research[];

    const handleResearchClick = useCallback((researchId: string) => {
        navigate(`/research/${researchId}/builder`);
    }, [navigate]);

    const handleDeleteClick = useCallback((research: Research, e: React.MouseEvent) => {
        e.stopPropagation();
        setResearchToDelete(research);
        setDeleteModalOpen(true);
    }, []);

    const handleConfirmDelete = useCallback(async () => {
        if (!researchToDelete) return;

        try {
            await deleteResearch.mutateAsync(researchToDelete.id);
            setDeleteModalOpen(false);
            setResearchToDelete(null);
        } catch (error) {
            console.error('Failed to delete research:', error);
        }
    }, [researchToDelete, deleteResearch]);

    if (showCreateForm) {
        return (
            <div className="h-full p-6">
                <div className="mb-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-semibold text-gray-800">Create Research</h1>
                            <p className="mt-1 text-sm text-gray-500">Create new research projects</p>
                        </div>
                        <Button variant="outline" onClick={() => setShowCreateForm(false)}>
                            Back to List
                        </Button>
                    </div>
                </div>

                <CreateResearchForm onSuccess={() => {
                    setShowCreateForm(false);
                }} />

                <CreateResearchTechniqueModal
                    isOpen={showTechniqueModal}
                    onClose={() => setShowTechniqueModal(false)}
                />

                <CreateEnterpriseModal
                    isOpen={showEnterpriseModal}
                    onClose={() => setShowEnterpriseModal(false)}
                />
            </div>
        );
    }

    if (isLoading) {
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
        const errorMessage = error instanceof Error ? error.message : 'Failed to load researches';
        return (
            <div className="max-w-4xl mx-auto mt-8">
                <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                    <h2 className="text-lg font-semibold text-red-800 mb-2">Error Loading Researches</h2>
                    <p className="text-red-600 mb-4">{errorMessage}</p>
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
                        <h1 className="text-3xl font-bold text-gray-900">All Research Projects</h1>
                        <p className="text-gray-600 mt-1">Manage and view all your research projects</p>
                    </div>
                    <Button onClick={() => setShowCreateForm(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Create Research
                    </Button>
                </div>
            </div>

            {/* Research List */}
            {typedResearches.length === 0 ? (
                <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-12 text-center">
                    <Folder className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Research Projects Yet</h3>
                    <p className="text-gray-500 mb-6">
                        Create your first research project to get started
                    </p>
                    <Button onClick={() => setShowCreateForm(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Create Research
                    </Button>
                </div>
            ) : (
                <div className="space-y-4">
                    {typedResearches.map((research) => (
                        <ResearchCard
                            key={research.id}
                            research={research}
                            onResearchClick={handleResearchClick}
                            onDelete={handleDeleteClick}
                        />
                    ))}
                </div>
            )}

            <CreateResearchTechniqueModal
                isOpen={showTechniqueModal}
                onClose={() => setShowTechniqueModal(false)}
            />

            <CreateEnterpriseModal
                isOpen={showEnterpriseModal}
                onClose={() => setShowEnterpriseModal(false)}
            />

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
                isLoading={deleteResearch.isPending}
            />
        </div>
    );
};
