import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { researchService, type Research } from '../../services/research.service';
import { researchTypesService } from '../../services/researchTypes.service';
import { useToast } from '../../hooks/useToast';
import { Button } from '../../components/ui/Button';
import { ConfirmationModal } from '../../components/ui/ConfirmationModal';
import { Copy, RefreshCw, Trash2 } from 'lucide-react';
import type { ResearchType } from '../../services/researchTypes.service';

/**
 * Main Dashboard page
 * Shows a table of researches with filters by type
 */
export const DashboardPage = () => {
    const navigate = useNavigate();
    const toast = useToast();
    
    // State
    const [researches, setResearches] = useState<Research[]>([]);
    const [researchTypes, setResearchTypes] = useState<ResearchType[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingTypes, setIsLoadingTypes] = useState(true);
    const [activeFilter, setActiveFilter] = useState<string>('all');
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [researchToDelete, setResearchToDelete] = useState<Research | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Load data on mount
    useEffect(() => {
        void loadResearches();
        void loadResearchTypes();
    }, []);

    const loadResearches = async () => {
        try {
            setIsLoading(true);
            const response = await researchService.list();
            setResearches(response.researches);
        } catch (error) {
            console.error('Failed to load researches:', error);
            toast.error('Failed to load researches');
        } finally {
            setIsLoading(false);
        }
    };

    const loadResearchTypes = async () => {
        try {
            setIsLoadingTypes(true);
            const response = await researchTypesService.list();
            setResearchTypes(response.researchTypes);
        } catch (error) {
            console.error('Failed to load research types:', error);
        } finally {
            setIsLoadingTypes(false);
        }
    };

    // Filter researches by type
    const filteredResearches = useMemo(() => {
        if (activeFilter === 'all') {
            return researches;
        }
        return researches.filter(r => r.research_type_id === activeFilter);
    }, [researches, activeFilter]);

    // Get status badge variant
    const getStatusVariant = (status: string) => {
        switch (status.toLowerCase()) {
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
    };

    // Calculate progress (dummy for now)
    const getProgress = (research: Research) => {
        // TODO: Calculate actual progress based on completed modules
        const stages = research.stages?.length || 0;
        if (stages === 0) return 0;
        return Math.min(100, stages * 15); // Dummy calculation
    };

    // Handle actions
    const handleRefresh = async () => {
        await loadResearches();
        toast.success('Researches refreshed');
    };

    const handleCopy = async (research: Research) => {
        try {
            await navigator.clipboard.writeText(research.id);
            toast.success('Research ID copied to clipboard');
        } catch (error) {
            console.error('Failed to copy:', error);
            toast.error('Failed to copy ID');
        }
    };

    const handleDeleteClick = (research: Research, e: React.MouseEvent) => {
        e.stopPropagation();
        setResearchToDelete(research);
        setDeleteModalOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!researchToDelete) return;

        try {
            setIsDeleting(true);
            await researchService.delete(researchToDelete.id);
            toast.success('Research deleted successfully');
            await loadResearches();
            setDeleteModalOpen(false);
            setResearchToDelete(null);
        } catch (error) {
            console.error('Failed to delete research:', error);
            toast.error('Failed to delete research');
        } finally {
            setIsDeleting(false);
        }
    };

    const handleRowClick = (researchId: string) => {
        navigate(`/research/${researchId}/builder`);
    };

    return (
        <div className="h-full p-6 space-y-6">
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-2xl font-semibold text-gray-800">Dashboard</h1>
                <p className="mt-1 text-sm text-gray-500">Manage and monitor your research projects</p>
            </div>

            {/* Main Content - Table and Sidebar */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Left Section - Research Table */}
                <div className="lg:col-span-3 bg-white rounded-lg shadow-sm border border-gray-100">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Name
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Status
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Date
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Progress
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Researcher
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {isLoading ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                                            <div className="flex justify-center">
                                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                                            </div>
                                            <p className="mt-2">Loading researches...</p>
                                        </td>
                                    </tr>
                                ) : filteredResearches.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                                            <p>No researches found</p>
                                            {activeFilter !== 'all' && (
                                                <button
                                                    onClick={() => setActiveFilter('all')}
                                                    className="mt-2 text-blue-600 hover:text-blue-800 text-sm"
                                                >
                                                    Clear filters
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ) : (
                                    filteredResearches.map((research) => {
                                        const progress = getProgress(research);
                                        return (
                                            <tr
                                                key={research.id}
                                                onClick={() => handleRowClick(research.id)}
                                                className="hover:bg-gray-50 cursor-pointer transition-colors"
                                            >
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm font-medium text-gray-900">
                                                        {research.name}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span
                                                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusVariant(
                                                            research.status
                                                        )}`}
                                                    >
                                                        {research.status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    {new Date(research.created_at).toLocaleDateString('en-US', {
                                                        month: '2-digit',
                                                        day: '2-digit',
                                                        year: 'numeric',
                                                    })}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-24 bg-gray-200 rounded-full h-2">
                                                            <div
                                                                className="bg-blue-600 h-2 rounded-full transition-all"
                                                                style={{ width: `${progress}%` }}
                                                            ></div>
                                                        </div>
                                                        <span className="text-xs text-gray-600 font-medium">
                                                            {progress}%
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                    Researcher
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                void handleRefresh();
                                                            }}
                                                            className="p-1.5 text-gray-400 hover:text-blue-600 transition-colors rounded hover:bg-blue-50"
                                                            title="Refresh"
                                                        >
                                                            <RefreshCw className="h-4 w-4" />
                                                        </button>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                void handleCopy(research);
                                                            }}
                                                            className="p-1.5 text-gray-400 hover:text-green-600 transition-colors rounded hover:bg-green-50"
                                                            title="Copy ID"
                                                        >
                                                            <Copy className="h-4 w-4" />
                                                        </button>
                                                        <button
                                                            onClick={(e) => handleDeleteClick(research, e)}
                                                            className="p-1.5 text-gray-400 hover:text-red-600 transition-colors rounded hover:bg-red-50"
                                                            title="Delete"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Right Sidebar - Research Types Filter */}
                <div className="space-y-6">
                    {/* Research Types Cards */}
                    <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
                        <h3 className="text-sm font-semibold text-gray-900 mb-4">Research&apos;s types</h3>
                        
                        {/* Filter Tabs */}
                        <div className="space-y-2 mb-4">
                            <button
                                onClick={() => setActiveFilter('all')}
                                className={`w-full text-left px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                    activeFilter === 'all'
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                            >
                                All
                            </button>
                            {isLoadingTypes ? (
                                <div className="text-center py-4 text-gray-500 text-sm">Loading types...</div>
                            ) : (
                                researchTypes.map((type) => (
                                    <button
                                        key={type.id}
                                        onClick={() => setActiveFilter(type.id)}
                                        className={`w-full text-left px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                            activeFilter === type.id
                                                ? 'bg-blue-600 text-white'
                                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                        }`}
                                    >
                                        {type.name}
                                    </button>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Sample Research Type Cards (from image) */}
                    <div className="space-y-4">
                        {researchTypes.slice(0, 4).map((type) => (
                            <div
                                key={type.id}
                                className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow cursor-pointer"
                                onClick={() => toast.info(`View details for ${type.name}`)}
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-lg flex items-center justify-center">
                                                <span className="text-white text-xs font-bold">
                                                    {type.name.substring(0, 2).toUpperCase()}
                                                </span>
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-semibold text-gray-900">
                                                    {type.name}
                                                </h4>
                                                <p className="text-xs text-gray-500">By UserEmotion</p>
                                            </div>
                                        </div>
                                    </div>
                                    <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-800">
                                        View
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Bottom Section - Research Cards by Type */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
                <div className="flex items-center gap-4 mb-6 overflow-x-auto pb-2">
                    <button
                        onClick={() => setActiveFilter('all')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                            activeFilter === 'all'
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                    >
                        All
                    </button>
                    {researchTypes.map((type) => (
                        <button
                            key={type.id}
                            onClick={() => setActiveFilter(type.id)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                                activeFilter === type.id
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                        >
                            {type.name}
                        </button>
                    ))}
                </div>

                {/* Research Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {filteredResearches.slice(0, 4).map((research) => (
                        <div
                            key={research.id}
                            onClick={() => handleRowClick(research.id)}
                            className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer"
                        >
                            <h4 className="text-sm font-semibold text-gray-900 mb-2">
                                {research.name}
                            </h4>
                            <p className="text-xs text-gray-500 mb-3">
                                By User
                            </p>
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
                isLoading={isDeleting}
            />
        </div>
    );
};

