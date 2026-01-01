import { useState, useMemo, useCallback, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useResearches, useDeleteResearch } from '../../hooks/useResearchQuery';
import { useResearchTypes } from '../../hooks/useResearchTypesQuery';
import { useToast } from '../../hooks/useToast';
import { Button } from '../../components/ui/Button';
import { ConfirmationModal } from '../../components/ui/ConfirmationModal';
import { Copy, Trash2 } from 'lucide-react';
import type { Research } from '../../services/research.service';

/**
 * Componente memoizado para fila de tabla
 * Evita re-renders innecesarios cuando solo cambian otros elementos
 */
const ResearchTableRow = memo(({
    research,
    onRowClick,
    onCopy,
    onDelete
}: {
    research: Research;
    onRowClick: (id: string) => void;
    onCopy: (research: Research) => void;
    onDelete: (research: Research, e: React.MouseEvent) => void;
}) => {
    const progress = useMemo(() => {
        const stages = research.stages?.length || 0;
        if (stages === 0) return 0;
        return Math.min(100, stages * 15);
    }, [research.stages?.length]);

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
            <td className="px-2 sm:px-3 lg:px-4 py-2 sm:py-3 lg:py-4 whitespace-nowrap">
                <div className="flex items-center gap-1.5 sm:gap-2">
                    <div className="w-16 sm:w-20 bg-gray-200 rounded-full h-1.5 sm:h-2">
                        <div
                            className="bg-blue-600 h-1.5 sm:h-2 rounded-full transition-all"
                            style={{ width: `${progress}%` }}
                        ></div>
                    </div>
                    <span className="text-[10px] sm:text-xs text-gray-600 font-medium">
                        {progress}%
                    </span>
                </div>
            </td>
            <td className="px-2 sm:px-3 lg:px-4 py-2 sm:py-3 lg:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900 hidden lg:table-cell">
                Researcher
            </td>
            <td className="px-2 sm:px-3 lg:px-4 py-2 sm:py-3 lg:py-4 whitespace-nowrap text-sm font-medium">
                <div className="flex items-center gap-0.5 sm:gap-1">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onCopy(research);
                        }}
                        className="p-1 sm:p-1.5 text-gray-400 hover:text-green-600 transition-colors rounded hover:bg-green-50"
                        title="Copy ID"
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
            <td className="px-2 sm:px-3 lg:px-4 py-2 sm:py-3 lg:py-4 whitespace-nowrap">
                <div className="flex items-center gap-1.5 sm:gap-2">
                    <div className="w-16 sm:w-20 h-1.5 sm:h-2 bg-gray-200 rounded-full"></div>
                    <div className="h-3 sm:h-4 bg-gray-200 rounded w-6 sm:w-8"></div>
                </div>
            </td>
            <td className="px-2 sm:px-3 lg:px-4 py-2 sm:py-3 lg:py-4 whitespace-nowrap hidden lg:table-cell">
                <div className="h-3 sm:h-4 bg-gray-200 rounded w-20 sm:w-24"></div>
            </td>
            <td className="px-2 sm:px-3 lg:px-4 py-2 sm:py-3 lg:py-4 whitespace-nowrap">
                <div className="flex items-center gap-0.5 sm:gap-1">
                    <div className="h-5 sm:h-6 w-5 sm:w-6 bg-gray-200 rounded"></div>
                    <div className="h-5 sm:h-6 w-5 sm:w-6 bg-gray-200 rounded"></div>
                </div>
            </td>
        </tr>
    );
});

TableSkeletonRow.displayName = 'TableSkeletonRow';

/**
 * Componente memoizado para tarjeta de tipo de investigación
 */
const ResearchTypeCard = memo(({
    type,
    onView
}: {
    type: { id: string; name: string };
    onView: (name: string) => void;
}) => {
    const initials = useMemo(() => type.name.substring(0, 2).toUpperCase(), [type.name]);

    return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-2 sm:p-2.5 lg:p-3 hover:shadow-md transition-shadow h-full flex flex-col justify-between">
            <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                    <div className="w-8 h-8 sm:w-9 sm:h-9 lg:w-10 lg:h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                        <span className="text-white text-[10px] sm:text-xs font-bold">{initials}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                        <h4 className="text-xs sm:text-sm font-semibold text-gray-900 leading-tight truncate">{type.name}</h4>
                        <p className="text-[9px] sm:text-[10px] text-gray-500">By UserEmotion</p>
                    </div>
                </div>
                <Button
                    variant="ghost"
                    size="sm"
                    className="text-blue-600 hover:text-blue-800 h-7 sm:h-8 px-1.5 sm:px-2 text-[10px] sm:text-xs flex-shrink-0"
                    onClick={() => onView(type.name)}
                >
                    View
                </Button>
            </div>
        </div>
    );
});

ResearchTypeCard.displayName = 'ResearchTypeCard';

/**
 * Main Dashboard page - Optimizado con React Query y memoización
 * Shows a table of researches with filters by type
 */
export const DashboardPage = () => {
    const navigate = useNavigate();
    const toast = useToast();

    // Usar React Query para datos optimizados con caché
    const { data: researches = [], isLoading } = useResearches();
    const { data: researchTypes = [] } = useResearchTypes();
    const deleteResearch = useDeleteResearch();

    // Type assertions para TypeScript
    const typedResearches = researches as Research[];
    const typedResearchTypes = researchTypes as Array<{ id: string; name: string }>;

    // State local solo para UI
    const [activeFilter, setActiveFilter] = useState<string>('all');
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [researchToDelete, setResearchToDelete] = useState<Research | null>(null);

    // Filtrar investigaciones - memoizado para evitar recálculos
    const filteredResearches = useMemo(() => {
        if (activeFilter === 'all') {
            return typedResearches;
        }
        return typedResearches.filter((r: Research) => r.research_type_id === activeFilter);
    }, [typedResearches, activeFilter]);

    // Handlers memoizados con useCallback

    const handleCopy = useCallback(async (research: Research) => {
        try {
            await navigator.clipboard.writeText(research.id);
            toast.success('Research ID copied to clipboard');
        } catch (error) {
            console.error('Failed to copy:', error);
            toast.error('Failed to copy ID');
        }
    }, [toast]);

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

    const handleRowClick = useCallback((researchId: string) => {
        navigate(`/research/${researchId}/builder`);
    }, [navigate]);

    const handleViewType = useCallback((name: string) => {
        toast.info(`View details for ${name}`);
    }, [toast]);

    return (
        <div className="h-full w-full flex flex-col p-3 sm:p-4 lg:p-6 overflow-hidden">
            {/* Main Content - Table and Sidebar */}
            <div className="flex flex-col xl:flex-row gap-3 sm:gap-4 lg:gap-6 flex-1 min-h-0">
                {/* Left Section - Research Table */}
                <div className="flex-1 rounded-lg shadow-sm border border-gray-100 overflow-hidden min-w-0 flex flex-col min-h-0">
                    <div className="flex-1 overflow-auto min-h-0">
                        <table className="w-full min-w-[600px]">
                                <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
                                    <tr>
                                        <th className="px-2 sm:px-3 lg:px-4 py-2 sm:py-2.5 lg:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Name
                                        </th>
                                        <th className="px-2 sm:px-3 lg:px-4 py-2 sm:py-2.5 lg:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Status
                                        </th>
                                        <th className="px-2 sm:px-3 lg:px-4 py-2 sm:py-2.5 lg:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">
                                            Date
                                        </th>
                                        <th className="px-2 sm:px-3 lg:px-4 py-2 sm:py-2.5 lg:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Progress
                                        </th>
                                        <th className="px-2 sm:px-3 lg:px-4 py-2 sm:py-2.5 lg:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">
                                            Researcher
                                        </th>
                                        <th className="px-2 sm:px-3 lg:px-4 py-2 sm:py-2.5 lg:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
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
                                        <td colSpan={6} className="px-2 sm:px-4 py-8 sm:py-12 text-center text-gray-500">
                                            <p className="text-xs sm:text-sm">No researches found</p>
                                            {activeFilter !== 'all' && (
                                                <button
                                                    onClick={() => setActiveFilter('all')}
                                                    className="mt-2 text-blue-600 hover:text-blue-800 text-xs sm:text-sm"
                                                >
                                                    Clear filters
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ) : (
                                    filteredResearches.map((research) => (
                                        <ResearchTableRow
                                            key={research.id}
                                            research={research}
                                            onRowClick={handleRowClick}
                                            onCopy={handleCopy}
                                            onDelete={handleDeleteClick}
                                        />
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Right Sidebar - Research Types Filter */}
                <div className="w-full xl:w-64 2xl:w-80 flex-shrink-0 flex flex-col gap-2 xl:max-h-full overflow-y-auto">
                    {typedResearchTypes.slice(0, 4).map((type) => (
                        <ResearchTypeCard
                            key={type.id}
                            type={type}
                            onView={handleViewType}
                        />
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

                {/* Research Cards Grid */}
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
        </div>
    );
};
