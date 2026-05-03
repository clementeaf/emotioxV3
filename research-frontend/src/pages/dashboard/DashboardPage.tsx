import { useState, useMemo, useCallback, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useResearches, useDeleteResearch, useDuplicateResearch, useDashboardSummary, useArchiveResearch, useUnarchiveResearch } from '../../hooks/useResearchQuery';
import { useResearchTypes } from '../../hooks/useResearchTypesQuery';
import { ConfirmationModal } from '../../components/ui/ConfirmationModal';
import { Trash2, Copy, Users, FileText, BarChart3, CheckCircle, Archive, ArchiveRestore, Search } from 'lucide-react';
import type { Research } from '../../services/research.service';

/* ─── Summary Card ──────────────────────────────────────────────── */

const SummaryCard = memo(({ label, value, icon: Icon, color }: {
    label: string;
    value: string | number;
    icon: React.ElementType;
    color: string;
}) => (
    <div className="bg-white rounded-lg border border-gray-100 p-4 flex items-center gap-4">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
            <Icon className="h-5 w-5 text-white" />
        </div>
        <div>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            <p className="text-xs text-gray-500">{label}</p>
        </div>
    </div>
));
SummaryCard.displayName = 'SummaryCard';

/* ─── Activity Chart (simple bar) ───────────────────────────────── */

const ActivityChart = memo(({ data }: { data: Array<{ month: string; count: number }> }) => {
    if (!data.length) return null;
    const maxCount = Math.max(...data.map(d => d.count), 1);

    return (
        <div className="bg-white rounded-lg border border-gray-100 p-4">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Research Activity</h3>
            <div className="flex items-end gap-1 h-24">
                {data.map(d => (
                    <div key={d.month} className="flex-1 flex flex-col items-center gap-1">
                        <div
                            className="w-full bg-blue-500 rounded-t"
                            style={{ height: `${Math.max((d.count / maxCount) * 100, 4)}%` }}
                            title={`${d.month}: ${d.count} researches`}
                        />
                        <span className="text-[9px] text-gray-400 truncate w-full text-center">
                            {d.month.slice(5)}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
});
ActivityChart.displayName = 'ActivityChart';

/* ─── Status Badge ──────────────────────────────────────────────── */

const STATUS_STYLES: Record<string, string> = {
    active: 'bg-green-100 text-green-800',
    approved: 'bg-green-100 text-green-800',
    completed: 'bg-blue-100 text-blue-800',
    closed: 'bg-blue-100 text-blue-800',
    draft: 'bg-gray-100 text-gray-800',
    pending: 'bg-yellow-100 text-yellow-800',
    rejected: 'bg-red-100 text-red-800',
};

/* ─── Research Table Row ────────────────────────────────────────── */

const ResearchTableRow = memo(({
    research,
    participantCount,
    responseCount,
    onRowClick,
    onDelete,
    onDuplicate,
    onArchive,
}: {
    research: Research;
    participantCount: number;
    responseCount: number;
    onRowClick: (id: string) => void;
    onDelete: (research: Research, e: React.MouseEvent) => void;
    onDuplicate: (research: Research, e: React.MouseEvent) => void;
    onArchive: (research: Research, e: React.MouseEvent) => void;
}) => {
    const isArchived = Boolean(research.archived_at);
    const statusClass = isArchived
        ? 'bg-orange-100 text-orange-800'
        : STATUS_STYLES[research.status.toLowerCase()] || 'bg-gray-100 text-gray-800';

    return (
        <tr onClick={() => onRowClick(research.id)} className={`hover:bg-gray-50 cursor-pointer transition-colors ${isArchived ? 'opacity-60' : ''}`}>
            <td className="px-3 py-3 whitespace-nowrap">
                <div className="text-sm font-medium text-gray-900">{research.name}</div>
                <div className="text-xs text-gray-400">{research.research_technique_name || ''}</div>
            </td>
            <td className="px-3 py-3 whitespace-nowrap">
                <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${statusClass}`}>
                    {isArchived ? 'archived' : research.status}
                </span>
            </td>
            <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-600 hidden md:table-cell">
                {participantCount > 0 ? participantCount : '—'}
            </td>
            <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-600 hidden lg:table-cell">
                {responseCount > 0 ? responseCount : '—'}
            </td>
            <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-500 hidden xl:table-cell">
                {new Date(research.updated_at || research.created_at).toLocaleDateString('en-US', {
                    month: '2-digit', day: '2-digit', year: 'numeric',
                })}
            </td>
            <td className="px-3 py-3 whitespace-nowrap text-sm font-medium">
                <div className="flex items-center gap-1">
                    <button onClick={(e) => onDuplicate(research, e)} className="p-1.5 text-gray-400 hover:text-blue-600 rounded hover:bg-blue-50" title="Duplicate">
                        <Copy className="h-4 w-4" />
                    </button>
                    <button onClick={(e) => onArchive(research, e)} className={`p-1.5 text-gray-400 rounded ${isArchived ? 'hover:text-green-600 hover:bg-green-50' : 'hover:text-orange-600 hover:bg-orange-50'}`} title={isArchived ? 'Unarchive' : 'Archive'}>
                        {isArchived ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
                    </button>
                    <button onClick={(e) => onDelete(research, e)} className="p-1.5 text-gray-400 hover:text-red-600 rounded hover:bg-red-50" title="Delete">
                        <Trash2 className="h-4 w-4" />
                    </button>
                </div>
            </td>
        </tr>
    );
});
ResearchTableRow.displayName = 'ResearchTableRow';

/* ─── Table Skeleton ────────────────────────────────────────────── */

const TableSkeletonRow = memo(() => (
    <tr className="animate-pulse">
        <td className="px-3 py-3"><div className="h-4 bg-gray-200 rounded w-32" /></td>
        <td className="px-3 py-3"><div className="h-6 bg-gray-200 rounded-full w-16" /></td>
        <td className="px-3 py-3 hidden md:table-cell"><div className="h-4 bg-gray-200 rounded w-12" /></td>
        <td className="px-3 py-3 hidden lg:table-cell"><div className="h-4 bg-gray-200 rounded w-12" /></td>
        <td className="px-3 py-3 hidden xl:table-cell"><div className="h-4 bg-gray-200 rounded w-20" /></td>
        <td className="px-3 py-3"><div className="h-6 w-6 bg-gray-200 rounded" /></td>
    </tr>
));
TableSkeletonRow.displayName = 'TableSkeletonRow';

/* ─── Main Dashboard ────────────────────────────────────────────── */

export const DashboardPage = () => {
    const navigate = useNavigate();
    const { data: researches = [], isLoading } = useResearches();
    const { data: researchTypes = [] } = useResearchTypes();
    const { data: summary } = useDashboardSummary();
    const deleteResearch = useDeleteResearch();
    const duplicateResearch = useDuplicateResearch();
    const archiveResearch = useArchiveResearch();
    const unarchiveResearch = useUnarchiveResearch();

    const typedResearches = researches as Research[];
    const typedResearchTypes = researchTypes as Array<{ id: string; name: string }>;

    const [activeFilter, setActiveFilter] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [showArchived, setShowArchived] = useState(false);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [researchToDelete, setResearchToDelete] = useState<Research | null>(null);
    const [duplicateModalOpen, setDuplicateModalOpen] = useState(false);
    const [researchToDuplicate, setResearchToDuplicate] = useState<Research | null>(null);
    const [duplicateName, setDuplicateName] = useState('');

    const filteredResearches = useMemo(() => {
        let result = typedResearches;

        // Filter by archive status
        if (!showArchived) {
            result = result.filter(r => !r.archived_at);
        }

        // Filter by type
        if (activeFilter !== 'all') {
            result = result.filter(r => r.research_type_id === activeFilter);
        }

        // Filter by search
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            result = result.filter(r =>
                r.name.toLowerCase().includes(q) ||
                r.research_technique_name?.toLowerCase().includes(q) ||
                r.research_type_name?.toLowerCase().includes(q)
            );
        }

        return result;
    }, [typedResearches, activeFilter, searchQuery, showArchived]);

    // Build participant/response lookup from summary
    const metricsMap = useMemo(() => {
        const map = new Map<string, { participants: number; responses: number }>();
        if (summary?.topResearches) {
            for (const r of summary.topResearches) {
                map.set(r.id, { participants: r.participantCount, responses: r.responseCount });
            }
        }
        return map;
    }, [summary]);

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

    const handleArchiveClick = useCallback((research: Research, e: React.MouseEvent) => {
        e.stopPropagation();
        if (research.archived_at) {
            unarchiveResearch.mutate(research.id);
        } else {
            archiveResearch.mutate(research.id);
        }
    }, [archiveResearch, unarchiveResearch]);

    const handleRowClick = useCallback((researchId: string) => {
        navigate(`/research/${researchId}/builder`);
    }, [navigate]);

    return (
        <div className="h-full w-full flex flex-col p-4 lg:p-6 overflow-hidden gap-4">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 flex-shrink-0">
                <SummaryCard label="Total Researches" value={summary?.totalResearches ?? '—'} icon={FileText} color="bg-blue-500" />
                <SummaryCard label="Active" value={summary?.byStatus?.active ?? '—'} icon={BarChart3} color="bg-green-500" />
                <SummaryCard label="Total Participants" value={summary?.totalParticipants ?? '—'} icon={Users} color="bg-purple-500" />
                <SummaryCard label="Completion Rate" value={summary ? `${summary.avgCompletionRate}%` : '—'} icon={CheckCircle} color="bg-amber-500" />
            </div>

            {/* Main Content */}
            <div className="flex flex-col xl:flex-row gap-4 flex-1 min-h-0">
                {/* Left: Research Table */}
                <div className="flex-1 rounded-lg shadow-sm border border-gray-100 overflow-hidden min-w-0 flex flex-col min-h-0">
                    {/* Search + filters */}
                    <div className="flex items-center gap-2 p-3 border-b border-gray-100 overflow-x-auto flex-shrink-0">
                        <div className="relative flex-shrink-0">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg w-44 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                        <button
                            onClick={() => setShowArchived(!showArchived)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                                showArchived ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                            }`}
                        >
                            <Archive className="h-3 w-3" />
                            {showArchived ? 'Hide archived' : 'Show archived'}
                        </button>
                        <div className="w-px h-5 bg-gray-200 flex-shrink-0" />
                        <button
                            onClick={() => setActiveFilter('all')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                                activeFilter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                        >
                            All
                        </button>
                        {typedResearchTypes.map(type => (
                            <button
                                key={type.id}
                                onClick={() => setActiveFilter(type.id)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                                    activeFilter === type.id ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                            >
                                {type.name}
                            </button>
                        ))}
                    </div>

                    <div className={`flex-1 min-h-0 ${filteredResearches.length > 0 || isLoading ? 'overflow-auto' : 'overflow-hidden'}`}>
                        <table className="w-full min-w-[600px] table-fixed">
                            <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
                                <tr>
                                    <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[30%]">Name</th>
                                    <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[12%]">Status</th>
                                    <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell w-[12%]">Participants</th>
                                    <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell w-[12%]">Responses</th>
                                    <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden xl:table-cell w-[14%]">Updated</th>
                                    <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[10%]">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {isLoading ? (
                                    [...Array(5)].map((_, i) => <TableSkeletonRow key={i} />)
                                ) : filteredResearches.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-3 py-12 text-center text-gray-500">
                                            <p className="text-sm">No researches found</p>
                                            {activeFilter !== 'all' && (
                                                <button onClick={() => setActiveFilter('all')} className="mt-2 text-blue-600 hover:text-blue-800 text-sm">
                                                    Clear filters
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ) : (
                                    filteredResearches.map(research => {
                                        const metrics = metricsMap.get(research.id);
                                        return (
                                            <ResearchTableRow
                                                key={research.id}
                                                research={research}
                                                participantCount={metrics?.participants ?? 0}
                                                responseCount={metrics?.responses ?? 0}
                                                onRowClick={handleRowClick}
                                                onDelete={handleDeleteClick}
                                                onDuplicate={handleDuplicateClick}
                                                onArchive={handleArchiveClick}
                                            />
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Right Sidebar: Activity + Status breakdown */}
                <div className="w-full xl:w-72 flex-shrink-0 flex flex-col gap-3">
                    {/* Activity chart */}
                    {summary?.researchesOverTime && summary.researchesOverTime.length > 0 && (
                        <ActivityChart data={summary.researchesOverTime} />
                    )}

                    {/* Status breakdown */}
                    {summary && (
                        <div className="bg-white rounded-lg border border-gray-100 p-4">
                            <h3 className="text-sm font-medium text-gray-700 mb-3">Status Overview</h3>
                            <div className="space-y-2">
                                {Object.entries(summary.byStatus).map(([status, count]) => (
                                    <div key={status} className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className={`w-2.5 h-2.5 rounded-full ${
                                                status === 'active' ? 'bg-green-500' :
                                                status === 'completed' ? 'bg-blue-500' : 'bg-gray-400'
                                            }`} />
                                            <span className="text-sm text-gray-600 capitalize">{status}</span>
                                        </div>
                                        <span className="text-sm font-semibold text-gray-900">{count}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Participants over time */}
                    {summary?.participantsOverTime && summary.participantsOverTime.length > 0 && (
                        <div className="bg-white rounded-lg border border-gray-100 p-4">
                            <h3 className="text-sm font-medium text-gray-700 mb-3">Participants Over Time</h3>
                            <div className="flex items-end gap-1 h-20">
                                {summary.participantsOverTime.map(d => {
                                    const maxP = Math.max(...summary.participantsOverTime.map(x => x.count), 1);
                                    return (
                                        <div key={d.month} className="flex-1 flex flex-col items-center gap-1">
                                            <div
                                                className="w-full bg-purple-500 rounded-t"
                                                style={{ height: `${Math.max((d.count / maxP) * 100, 4)}%` }}
                                                title={`${d.month}: ${d.count} participants`}
                                            />
                                            <span className="text-[9px] text-gray-400 truncate w-full text-center">{d.month.slice(5)}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* SmartVOC Metrics Trends */}
                    {summary?.metricsTrends && summary.metricsTrends.some(m => m.avgNps !== null || m.avgCsat !== null || m.avgCes !== null) && (
                        <div className="bg-white rounded-lg border border-gray-100 p-4">
                            <h3 className="text-sm font-medium text-gray-700 mb-3">Metrics Trends</h3>
                            <div className="space-y-2">
                                {(['avgNps', 'avgCsat', 'avgCes'] as const).map(metric => {
                                    const label = metric === 'avgNps' ? 'NPS' : metric === 'avgCsat' ? 'CSAT' : 'CES';
                                    const color = metric === 'avgNps' ? 'bg-blue-500' : metric === 'avgCsat' ? 'bg-green-500' : 'bg-amber-500';
                                    const values = summary.metricsTrends.filter(m => m[metric] !== null);
                                    if (values.length === 0) return null;
                                    const latest = values[values.length - 1]?.[metric];
                                    const prev = values.length >= 2 ? values[values.length - 2]?.[metric] : null;
                                    const trend = latest !== null && prev !== null ? (latest as number) - (prev as number) : null;
                                    return (
                                        <div key={metric} className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <div className={`w-2.5 h-2.5 rounded-full ${color}`} />
                                                <span className="text-sm text-gray-600">{label}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-semibold text-gray-900">{latest}</span>
                                                {trend !== null && (
                                                    <span className={`text-xs ${trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                        {trend >= 0 ? '+' : ''}{Math.round(trend * 10) / 10}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Top researches by participants */}
                    {summary?.topResearches && summary.topResearches.length > 0 && (
                        <div className="bg-white rounded-lg border border-gray-100 p-4">
                            <h3 className="text-sm font-medium text-gray-700 mb-3">Top by Participants</h3>
                            <div className="space-y-2">
                                {summary.topResearches
                                    .filter(r => r.participantCount > 0)
                                    .sort((a, b) => b.participantCount - a.participantCount)
                                    .slice(0, 5)
                                    .map(r => (
                                        <button
                                            key={r.id}
                                            onClick={() => navigate(`/research/${r.id}/builder`)}
                                            className="w-full flex items-center justify-between text-left hover:bg-gray-50 rounded px-2 py-1 -mx-2 transition-colors"
                                        >
                                            <span className="text-sm text-gray-700 truncate mr-2">{r.name}</span>
                                            <span className="text-xs font-medium text-gray-500 flex-shrink-0">{r.participantCount}</span>
                                        </button>
                                    ))}
                            </div>
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

            {/* Duplicate modal */}
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
