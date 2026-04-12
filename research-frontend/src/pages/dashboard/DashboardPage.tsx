import { useState, useMemo, useCallback, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useResearches, useDeleteResearch, useDuplicateResearch } from '../../hooks/useResearchQuery';
import { useResearchTypes } from '../../hooks/useResearchTypesQuery';
import { Button } from '../../components/ui/Button';
import { ConfirmationModal } from '../../components/ui/ConfirmationModal';
import { Trash2, Copy } from 'lucide-react';
import type { Research } from '../../services/research.service';

/**
 * Componente memoizado para fila de tabla
 * Evita re-renders innecesarios cuando solo cambian otros elementos
 */
const ResearchTableRow = memo(({
    research,
    onRowClick,
    onDelete,
    onDuplicate
}: {
    research: Research;
    onRowClick: (id: string) => void;
    onDelete: (research: Research, e: React.MouseEvent) => void;
    onDuplicate: (research: Research, e: React.MouseEvent) => void;
}) => {
    const statusVariant = useMemo(() => {
        switch (research.status.toLowerCase()) {
            case 'rejected':
                return 'bg-red-100 text-red-800';
            case 'pending':
                return 'bg-yellow-100 text-yellow-800';
            case 'approved':
            case 'active':
                return 'bg-green-100 text-green-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    }, [research.status]);

    const formattedDate = useMemo(() => {
        return new Date(research.created_at).toLocaleDateString('en-US', {
            month: '2-digit',
            day: '2-digit',
            year: 'numeric',
        });
    }, [research.created_at]);

    const formattedUpdatedDate = useMemo(() => {
        return new Date(research.updated_at).toLocaleDateString('en-US', {
            month: '2-digit',
            day: '2-digit',
            year: 'numeric',
        });
    }, [research.updated_at]);

    return (
        <tr
            onClick={() => onRowClick(research.id)}
            className="hover:bg-gray-50 cursor-pointer transition-colors"
        >
            <td className="px-2 sm:px-3 lg:px-4 py-2 sm:py-3 lg:py-4 whitespace-nowrap">
                <div className="text-xs sm:text-sm font-medium text-gray-900">
                    {research.name}
                </div>
            </td>
            <td className="px-2 sm:px-3 lg:px-4 py-2 sm:py-3 lg:py-4 whitespace-nowrap">
                <span className={`inline-flex px-1.5 sm:px-2 py-0.5 sm:py-1 text-[10px] sm:text-xs font-semibold rounded-full ${statusVariant}`}>
                    {research.status}
                </span>
            </td>
            <td className="px-2 sm:px-3 lg:px-4 py-2 sm:py-3 lg:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500 hidden md:table-cell">
                {formattedDate}
            </td>
            <td className="px-2 sm:px-3 lg:px-4 py-2 sm:py-3 lg:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500 hidden md:table-cell">
                {formattedUpdatedDate}
            </td>
            <td className="px-2 sm:px-3 lg:px-4 py-2 sm:py-3 lg:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900 hidden xl:table-cell">
                <span className="block truncate max-w-[180px]">
                    {research.creator_first_name
                        ? `${research.creator_first_name} ${research.creator_last_name || ''}`.trim()
                        : research.creator_email || '—'}
                </span>
            </td>
            <td className="px-2 sm:px-3 lg:px-4 py-2 sm:py-3 lg:py-4 whitespace-nowrap text-sm font-medium">
                <div className="flex items-center gap-1">
                    <button
                        onClick={(e) => onDuplicate(research, e)}
                        className="p-1 sm:p-1.5 text-gray-400 hover:text-blue-600 transition-colors rounded hover:bg-blue-50"
                        title="Duplicate"
                    >
                        <Copy className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    </button>
                    <button
                        onClick={(e) => onDelete(research, e)}
                        className="p-1 sm:p-1.5 text-gray-400 hover:text-red-600 transition-colors rounded hover:bg-red-50"
                        title="Delete"
                    >
                        <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    </button>
                </div>
            </td>
        </tr>
    );
});

ResearchTableRow.displayName = 'ResearchTableRow';

/**
 * Componente skeleton para filas de tabla durante la carga
 */
const TableSkeletonRow = memo(() => {
    return (
        <tr className="animate-pulse">
            <td className="px-2 sm:px-3 lg:px-4 py-2 sm:py-3 lg:py-4 whitespace-nowrap">
                <div className="h-3 sm:h-4 bg-gray-200 rounded w-24 sm:w-32"></div>
            </td>
            <td className="px-2 sm:px-3 lg:px-4 py-2 sm:py-3 lg:py-4 whitespace-nowrap">
                <div className="h-5 sm:h-6 bg-gray-200 rounded-full w-16 sm:w-20"></div>
            </td>
            <td className="px-2 sm:px-3 lg:px-4 py-2 sm:py-3 lg:py-4 whitespace-nowrap hidden md:table-cell">
                <div className="h-3 sm:h-4 bg-gray-200 rounded w-20 sm:w-24"></div>
            </td>
            <td className="px-2 sm:px-3 lg:px-4 py-2 sm:py-3 lg:py-4 whitespace-nowrap hidden md:table-cell">
                <div className="h-3 sm:h-4 bg-gray-200 rounded w-20 sm:w-24"></div>
            </td>
            <td className="px-2 sm:px-3 lg:px-4 py-2 sm:py-3 lg:py-4 whitespace-nowrap hidden xl:table-cell">
                <div className="h-3 sm:h-4 bg-gray-200 rounded w-20 sm:w-24"></div>
            </td>
            <td className="px-2 sm:px-3 lg:px-4 py-2 sm:py-3 lg:py-4 whitespace-nowrap">
                <div className="h-5 sm:h-6 w-5 sm:w-6 bg-gray-200 rounded"></div>
            </td>
        </tr>
    );
});

TableSkeletonRow.displayName = 'TableSkeletonRow';

import eyeTrackingIcon from '../../assets/eye-tracking-icon.png';
import attentionPredictionIcon from '../../assets/attention-prediction-icon.png';
import implicitPrimingIcon from '../../assets/implicit-priming-test-icon.png';
import cognitiveAnalysisIcon from '../../assets/cognitive-analysis-icon.png';

const TECHNIQUE_CARDS = [
    { name: 'Eye Tracking', icon: eyeTrackingIcon },
    { name: 'Attention Prediction', icon: attentionPredictionIcon },
    { name: 'Implicit Priming Test', icon: implicitPrimingIcon },
    { name: 'Cognitive Analysis', icon: cognitiveAnalysisIcon },
] as const;

/**
 * Main Dashboard page - Optimizado con React Query y memoización
 * Shows a table of researches with filters by type
 */
export const DashboardPage = () => {
    const navigate = useNavigate();
    // Usar React Query para datos optimizados con caché
    const { data: researches = [], isLoading } = useResearches();
    const { data: researchTypes = [] } = useResearchTypes();
    const deleteResearch = useDeleteResearch();
    const duplicateResearch = useDuplicateResearch();

    // Type assertions para TypeScript
    const typedResearches = researches as Research[];
    const typedResearchTypes = researchTypes as Array<{ id: string; name: string }>;

    // State local solo para UI
    const [activeFilter, setActiveFilter] = useState<string>('all');
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [researchToDelete, setResearchToDelete] = useState<Research | null>(null);
    const [duplicateModalOpen, setDuplicateModalOpen] = useState(false);
    const [researchToDuplicate, setResearchToDuplicate] = useState<Research | null>(null);
    const [duplicateName, setDuplicateName] = useState('');

    // Filtrar investigaciones - memoizado para evitar recálculos
    const filteredResearches = useMemo(() => {
        if (activeFilter === 'all') {
            return typedResearches;
        }
        return typedResearches.filter((r: Research) => r.research_type_id === activeFilter);
    }, [typedResearches, activeFilter]);

    // Handlers memoizados con useCallback

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

    const handleDuplicateClick = useCallback((research: Research, e: React.MouseEvent) => {
        e.stopPropagation();
        setResearchToDuplicate(research);
        setDuplicateName(`${research.name} - Copy`);
        setDuplicateModalOpen(true);
    }, []);

    const handleDuplicateConfirm = useCallback(async () => {
        if (!researchToDuplicate) return;
        try {
            await duplicateResearch.mutateAsync({ id: researchToDuplicate.id, name: duplicateName });
            setDuplicateModalOpen(false);
            setResearchToDuplicate(null);
        } catch (error) {
            console.error('Failed to duplicate research:', error);
        }
    }, [researchToDuplicate, duplicateName, duplicateResearch]);

    const handleRowClick = useCallback((researchId: string) => {
        navigate(`/research/${researchId}/builder`);
    }, [navigate]);


    return (
        <div className="h-full w-full flex flex-col p-3 sm:p-4 lg:p-6 overflow-hidden">
            {/* Main Content - Table and Sidebar */}
            <div className="flex flex-col xl:flex-row gap-3 sm:gap-4 lg:gap-6 flex-1 min-h-0">
                {/* Left Section - Research Table */}
                <div className="flex-1 rounded-lg shadow-sm border border-gray-100 overflow-hidden min-w-0 flex flex-col min-h-0">
                    <div className={`flex-1 min-h-0 ${filteredResearches.length > 0 || isLoading ? 'overflow-auto' : 'overflow-hidden'}`}>
                        <table className="w-full min-w-[600px] table-fixed">
                                <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
                                    <tr>
                                        <th className="px-2 sm:px-3 lg:px-4 py-2 sm:py-2.5 lg:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[35%] xl:w-[28%]">
                                            Name
                                        </th>
                                        <th className="px-2 sm:px-3 lg:px-4 py-2 sm:py-2.5 lg:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[15%] xl:w-[12%]">
                                            Status
                                        </th>
                                        <th className="px-2 sm:px-3 lg:px-4 py-2 sm:py-2.5 lg:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell w-[15%] xl:w-[12%]">
                                            Created
                                        </th>
                                        <th className="px-2 sm:px-3 lg:px-4 py-2 sm:py-2.5 lg:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell w-[15%] xl:w-[12%]">
                                            Updated
                                        </th>
                                        <th className="px-2 sm:px-3 lg:px-4 py-2 sm:py-2.5 lg:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden xl:table-cell w-[18%]">
                                            Researcher
                                        </th>
                                        <th className="px-2 sm:px-3 lg:px-4 py-2 sm:py-2.5 lg:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[10%]">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {isLoading ? (
                                    <>
                                        {[...Array(3)].map((_, index) => (
                                            <TableSkeletonRow key={`skeleton-${index}`} />
                                        ))}
                                    </>
                                ) : filteredResearches.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-2 sm:px-3 lg:px-4 py-8 sm:py-12 text-center text-gray-500 h-[400px] align-middle">
                                            <div className="flex flex-col items-center justify-center h-full">
                                                <p className="text-xs sm:text-sm">No researches found</p>
                                                {activeFilter !== 'all' && (
                                                    <button
                                                        onClick={() => setActiveFilter('all')}
                                                        className="mt-2 text-blue-600 hover:text-blue-800 text-xs sm:text-sm"
                                                    >
                                                        Clear filters
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredResearches.map((research) => (
                                        <ResearchTableRow
                                            key={research.id}
                                            research={research}
                                            onRowClick={handleRowClick}
                                            onDelete={handleDeleteClick}
                                            onDuplicate={handleDuplicateClick}
                                        />
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Right Sidebar - Technique Cards */}
                <div className="w-full xl:w-64 2xl:w-72 flex-shrink-0 flex flex-col gap-2">
                    {TECHNIQUE_CARDS.map((card) => (
                        <div
                            key={card.name}
                            className="flex-1 bg-white rounded-lg border border-gray-100 px-3 hover:bg-gray-50 transition-colors flex items-center gap-3 cursor-pointer"
                        >
                            <img src={card.icon} alt={card.name} className="w-9 h-9 rounded object-cover flex-shrink-0" />
                            <div className="min-w-0 flex-1">
                                <p className="text-xs font-medium text-gray-900 truncate">{card.name}</p>
                                <p className="text-[10px] text-gray-400">By UserEmotion</p>
                            </div>
                            <button className="text-[10px] font-medium text-blue-600 hover:text-blue-800 flex-shrink-0">
                                View
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            {/* Bottom Section - Research Cards by Type */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-3 sm:p-4 lg:p-6 mt-3 sm:mt-4 lg:mt-6 flex-shrink-0 hidden xl:block">
                <div className="flex items-center gap-2 sm:gap-3 lg:gap-4 mb-4 sm:mb-5 lg:mb-6 overflow-x-auto pb-2">
                    <button
                        onClick={() => setActiveFilter('all')}
                        className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap transition-colors flex-shrink-0 ${activeFilter === 'all'
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                    >
                        All
                    </button>
                    {typedResearchTypes.map((type) => (
                        <button
                            key={type.id}
                            onClick={() => setActiveFilter(type.id)}
                            className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap transition-colors flex-shrink-0 ${activeFilter === type.id
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                        >
                            {type.name}
                        </button>
                    ))}
                </div>

                {/* Research Cards Grid - Altura fija para mantener consistencia */}
                <div className="min-h-[180px]">
                    {filteredResearches.length === 0 ? (
                        <div className="flex items-center justify-center h-full min-h-[180px] text-center">
                            <p className="text-xs sm:text-sm text-gray-500">No researches found for this type</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
                            {filteredResearches.slice(0, 4).map((research: Research) => (
                                <div
                                    key={research.id}
                                    onClick={() => handleRowClick(research.id)}
                                    className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer"
                                >
                                    <h4 className="text-sm font-semibold text-gray-900 mb-2">
                                        {research.name}
                                    </h4>
                                    <p className="text-xs text-gray-500 mb-3">By User</p>
                                    <p className="text-xs text-gray-400 mb-3">
                                        Last modified:{' '}
                                        {new Date(research.updated_at || research.created_at).toLocaleDateString('en-US', {
                                            year: 'numeric',
                                            month: '2-digit',
                                            day: '2-digit',
                                        })}
                                    </p>
                                    <Button variant="outline" size="sm" className="w-full">
                                        Review
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Delete Confirmation Modal */}
            <ConfirmationModal
                isOpen={deleteModalOpen}
                onClose={() => setDeleteModalOpen(false)}
                onConfirm={handleConfirmDelete}
                title="Delete Research"
                message={`Are you sure you want to delete "${researchToDelete?.name}"? This action cannot be undone.`}
                confirmText="Delete"
                cancelText="Cancel"
                variant="danger"
                isLoading={deleteResearch.isPending}
            />

            {/* Duplicate modal with name input */}
            {duplicateModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                    <div className="bg-white rounded-lg shadow-lg p-6 max-w-sm w-full mx-4">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Duplicate Research</h3>
                        <p className="text-sm text-gray-600 mb-4">Enter a name for the duplicated research:</p>
                        <input
                            type="text"
                            value={duplicateName}
                            onChange={(e) => setDuplicateName(e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 mb-4"
                            autoFocus
                            onKeyDown={(e) => { if (e.key === 'Enter' && duplicateName.trim()) handleDuplicateConfirm(); }}
                        />
                        <div className="flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => { setDuplicateModalOpen(false); setResearchToDuplicate(null); }}
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleDuplicateConfirm}
                                disabled={!duplicateName.trim() || duplicateResearch.isPending}
                                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
                            >
                                {duplicateResearch.isPending ? 'Duplicating...' : 'Duplicate'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
