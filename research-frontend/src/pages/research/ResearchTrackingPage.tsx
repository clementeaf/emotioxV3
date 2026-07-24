import { useEffect, useMemo, useState } from 'react';
import { Clock3, User, Search, X } from 'lucide-react';
import { researchService, type ResearchActivity } from '../../services/research.service';
import { ResearchDetailDrawer } from '../../components/tracking/ResearchDetailDrawer';

const ACTION_STYLES: Record<string, { bg: string; text: string }> = {
    created:   { bg: 'bg-emerald-50', text: 'text-emerald-700' },
    updated:   { bg: 'bg-blue-50',    text: 'text-blue-700' },
    deleted:   { bg: 'bg-red-50',     text: 'text-red-700' },
    activated: { bg: 'bg-emerald-50', text: 'text-emerald-700' },
    archived:  { bg: 'bg-orange-50',  text: 'text-orange-700' },
};

export const ResearchTrackingPage = () => {
    const [activities, setActivities] = useState<ResearchActivity[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [researchFilter, setResearchFilter] = useState('all');
    const [actionFilter, setActionFilter] = useState('all');
    const [selectedResearchId, setSelectedResearchId] = useState<string | null>(null);

    useEffect(() => {
        void (async () => {
            try {
                const response = await researchService.getAllActivity();
                setActivities(response.activities || []);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to load');
            } finally {
                setIsLoading(false);
            }
        })();
    }, []);

    const researchNames = useMemo(() =>
        Array.from(new Set(activities.map(a => a.researchName).filter(Boolean))).sort() as string[]
    , [activities]);

    const actionTypes = useMemo(() =>
        Array.from(new Set(activities.map(a => a.action))).sort()
    , [activities]);

    const hasActiveFilters = searchQuery.trim() || researchFilter !== 'all' || actionFilter !== 'all';

    const filteredActivities = useMemo(() => {
        let result = activities;
        if (researchFilter !== 'all') result = result.filter(a => a.researchName === researchFilter);
        if (actionFilter !== 'all') result = result.filter(a => a.action === actionFilter);
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            result = result.filter(a =>
                a.summary.toLowerCase().includes(q) ||
                (a.actorName?.toLowerCase().includes(q) ?? false) ||
                (a.actorEmail?.toLowerCase().includes(q) ?? false) ||
                (a.researchTechniqueName?.toLowerCase().includes(q) ?? false)
            );
        }
        return result;
    }, [activities, searchQuery, researchFilter, actionFilter]);

    return (
        <div className="h-full w-full flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-5 pb-3 flex-shrink-0">
                <div>
                    <h1 className="text-lg font-semibold text-gray-900">Tracking</h1>
                    <p className="text-[13px] text-gray-400 mt-0.5">Activity log across all researches</p>
                </div>
                <span className="text-[13px] text-gray-400">{filteredActivities.length} event{filteredActivities.length !== 1 ? 's' : ''}</span>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-2 px-6 pb-3 flex-shrink-0">
                <div className="relative flex-shrink-0">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg w-48 focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder:text-gray-400"
                    />
                </div>

                <select
                    value={researchFilter}
                    onChange={(e) => setResearchFilter(e.target.value)}
                    className={`px-2 py-1.5 text-xs border rounded-lg appearance-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                        researchFilter !== 'all' ? 'border-blue-300 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-500'
                    }`}
                >
                    <option value="all">All researches</option>
                    {researchNames.map(n => <option key={n} value={n}>{n}</option>)}
                </select>

                <select
                    value={actionFilter}
                    onChange={(e) => setActionFilter(e.target.value)}
                    className={`px-2 py-1.5 text-xs border rounded-lg appearance-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                        actionFilter !== 'all' ? 'border-blue-300 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-500'
                    }`}
                >
                    <option value="all">All actions</option>
                    {actionTypes.map(a => <option key={a} value={a}>{a}</option>)}
                </select>

                {hasActiveFilters && (
                    <button
                        onClick={() => { setSearchQuery(''); setResearchFilter('all'); setActionFilter('all'); }}
                        className="px-2 py-1.5 rounded-lg text-xs font-medium text-gray-400 hover:text-red-500 transition-colors flex items-center gap-1"
                    >
                        <X className="h-3 w-3" /> Clear
                    </button>
                )}
            </div>

            {/* Content */}
            <div className="flex-1 min-h-0 overflow-auto px-6 pb-4">
                {isLoading ? (
                    <div className="space-y-3">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <div key={i} className="animate-pulse rounded-xl border border-gray-100 bg-white px-4 py-3">
                                <div className="h-4 w-3/5 bg-gray-100 rounded mb-2" />
                                <div className="flex gap-3"><div className="h-3 w-24 bg-gray-100 rounded" /><div className="h-3 w-20 bg-gray-100 rounded" /></div>
                            </div>
                        ))}
                    </div>
                ) : error ? (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-5 text-center">
                        <p className="text-[13px] text-red-700">{error}</p>
                    </div>
                ) : filteredActivities.length === 0 ? (
                    <div className="rounded-xl border border-gray-100 bg-white p-12 text-center">
                        <p className="text-[13px] text-gray-400">No activity matches filters</p>
                        {hasActiveFilters && (
                            <button onClick={() => { setSearchQuery(''); setResearchFilter('all'); setActionFilter('all'); }} className="mt-2 text-[13px] text-blue-600 hover:text-blue-700 font-medium">Clear filters</button>
                        )}
                    </div>
                ) : (
                    <div className="rounded-xl border border-gray-100 overflow-hidden">
                        <table className="w-full min-w-[700px]">
                            <thead className="bg-gray-50/80 border-b border-gray-100 sticky top-0 z-10">
                                <tr>
                                    <th className="px-3 py-2 text-left text-[11px] font-medium text-gray-400 uppercase tracking-wider">Summary</th>
                                    <th className="px-3 py-2 text-left text-[11px] font-medium text-gray-400 uppercase tracking-wider">Research</th>
                                    <th className="px-3 py-2 text-left text-[11px] font-medium text-gray-400 uppercase tracking-wider hidden lg:table-cell">Technique</th>
                                    <th className="px-3 py-2 text-left text-[11px] font-medium text-gray-400 uppercase tracking-wider hidden md:table-cell">Researcher</th>
                                    <th className="px-3 py-2 text-left text-[11px] font-medium text-gray-400 uppercase tracking-wider">Action</th>
                                    <th className="px-3 py-2 text-left text-[11px] font-medium text-gray-400 uppercase tracking-wider">Date</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {filteredActivities.map(activity => {
                                    const actorLabel = activity.actorName || activity.actorEmail || 'System';
                                    const actionStyle = ACTION_STYLES[activity.action.toLowerCase()] ?? { bg: 'bg-gray-50', text: 'text-gray-600' };
                                    return (
                                        <tr
                                            key={activity.id}
                                            className="group hover:bg-gray-50/80 cursor-pointer transition-colors"
                                            onClick={() => setSelectedResearchId(activity.researchId)}
                                        >
                                            <td className="px-3 py-2.5 text-[13px] font-medium text-gray-900">{activity.summary}</td>
                                            <td className="px-3 py-2.5 text-[13px] text-gray-500">{activity.researchName || '—'}</td>
                                            <td className="px-3 py-2.5 text-[13px] text-gray-400 hidden lg:table-cell">{activity.researchTechniqueName || '—'}</td>
                                            <td className="px-3 py-2.5 text-[13px] text-gray-500 hidden md:table-cell">
                                                <span className="inline-flex items-center gap-1.5">
                                                    <User className="h-3 w-3 text-gray-400" />
                                                    {actorLabel}
                                                </span>
                                            </td>
                                            <td className="px-3 py-2.5">
                                                <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium ${actionStyle.bg} ${actionStyle.text}`}>
                                                    {activity.action}
                                                </span>
                                            </td>
                                            <td className="px-3 py-2.5 text-[13px] text-gray-400 whitespace-nowrap">
                                                <span className="inline-flex items-center gap-1.5">
                                                    <Clock3 className="h-3 w-3" />
                                                    {new Date(activity.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <ResearchDetailDrawer
                researchId={selectedResearchId}
                onClose={() => setSelectedResearchId(null)}
            />
        </div>
    );
};
