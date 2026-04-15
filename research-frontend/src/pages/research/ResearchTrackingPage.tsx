import { useEffect, useMemo, useState } from 'react';
import { Clock3, History, Search, User } from 'lucide-react';
import { researchService, type ResearchActivity } from '../../services/research.service';

export const ResearchTrackingPage = () => {
    const [activities, setActivities] = useState<ResearchActivity[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [researchFilter, setResearchFilter] = useState('all');
    const [techniqueFilter, setTechniqueFilter] = useState('all');
    const [actorFilter, setActorFilter] = useState('all');
    const [actionFilter, setActionFilter] = useState('all');

    useEffect(() => {
        const load = async () => {
            try {
                const response = await researchService.getAllActivity();
                setActivities(response.activities || []);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to load research tracking');
            } finally {
                setIsLoading(false);
            }
        };

        void load();
    }, []);

    const researchOptions = useMemo(
        () => Array.from(new Set(activities.map((item) => item.researchName).filter(Boolean))).sort(),
        [activities]
    );
    const techniqueOptions = useMemo(
        () => Array.from(new Set(activities.map((item) => item.researchTechniqueName).filter(Boolean))).sort(),
        [activities]
    );
    const actorOptions = useMemo(
        () => Array.from(new Set(activities.map((item) => item.actorName || item.actorEmail).filter(Boolean))).sort(),
        [activities]
    );
    const actionOptions = useMemo(
        () => Array.from(new Set(activities.map((item) => item.action))).sort(),
        [activities]
    );

    const filteredActivities = useMemo(() => {
        const term = search.trim().toLowerCase();
        return activities.filter((activity) => {
            const actorLabel = activity.actorName || activity.actorEmail || 'System';
            const matchesSearch = !term || [
                activity.summary,
                activity.researchName || '',
                activity.researchTechniqueName || '',
                actorLabel,
                activity.action,
            ].some((value) => value.toLowerCase().includes(term));

            return matchesSearch
                && (researchFilter === 'all' || activity.researchName === researchFilter)
                && (techniqueFilter === 'all' || activity.researchTechniqueName === techniqueFilter)
                && (actorFilter === 'all' || actorLabel === actorFilter)
                && (actionFilter === 'all' || activity.action === actionFilter);
        });
    }, [activities, search, researchFilter, techniqueFilter, actorFilter, actionFilter]);

    return (
        <div className="p-6 space-y-4">
            <div className="bg-white rounded-lg border border-gray-100 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100">
                    <div className="flex items-center gap-2">
                        <History className="h-5 w-5 text-gray-500" />
                        <h1 className="text-lg font-semibold text-gray-900">Research Tracking</h1>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">Global activity log across all researches.</p>
                </div>

                <div className="px-6 py-4 border-b border-gray-100 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
                    <label className="relative xl:col-span-1">
                        <Search className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search"
                            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                    </label>
                    <select value={researchFilter} onChange={(e) => setResearchFilter(e.target.value)} className="px-3 py-2 text-sm border border-gray-200 rounded-lg">
                        <option value="all">All researches</option>
                        {researchOptions.map((value) => <option key={value} value={value || ''}>{value}</option>)}
                    </select>
                    <select value={techniqueFilter} onChange={(e) => setTechniqueFilter(e.target.value)} className="px-3 py-2 text-sm border border-gray-200 rounded-lg">
                        <option value="all">All techniques</option>
                        {techniqueOptions.map((value) => <option key={value} value={value || ''}>{value}</option>)}
                    </select>
                    <select value={actorFilter} onChange={(e) => setActorFilter(e.target.value)} className="px-3 py-2 text-sm border border-gray-200 rounded-lg">
                        <option value="all">All researchers</option>
                        {actorOptions.map((value) => <option key={value} value={value || ''}>{value}</option>)}
                    </select>
                    <select value={actionFilter} onChange={(e) => setActionFilter(e.target.value)} className="px-3 py-2 text-sm border border-gray-200 rounded-lg">
                        <option value="all">All actions</option>
                        {actionOptions.map((value) => <option key={value} value={value}>{value}</option>)}
                    </select>
                </div>

                {isLoading ? (
                    <div className="px-6 py-4 space-y-4">
                        {Array.from({ length: 6 }).map((_, index) => (
                            <div key={index} className="animate-pulse py-2">
                                <div className="h-4 w-3/5 bg-gray-200 rounded mb-3" />
                                <div className="flex gap-2 flex-wrap">
                                    <div className="h-3 w-28 bg-gray-100 rounded" />
                                    <div className="h-3 w-24 bg-gray-100 rounded" />
                                    <div className="h-3 w-32 bg-gray-100 rounded" />
                                    <div className="h-3 w-20 bg-gray-100 rounded" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : error ? (
                    <div className="px-6 py-6">
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                            <h2 className="text-sm font-semibold text-red-800 mb-1">Error loading tracking</h2>
                            <p className="text-sm text-red-600">{error}</p>
                        </div>
                    </div>
                ) : filteredActivities.length === 0 ? (
                    <div className="px-6 py-10 text-center text-sm text-gray-500">No activity matches the current filters.</div>
                ) : (
                    <div className="divide-y divide-gray-100">
                        {filteredActivities.map((activity) => {
                            const actorLabel = activity.actorName || activity.actorEmail || 'System';
                            return (
                                <div key={activity.id} className="px-6 py-4">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium text-gray-900">{activity.summary}</p>
                                            <div className="mt-1 flex flex-wrap items-center gap-4 text-xs text-gray-500">
                                                <span>{activity.researchName || 'Unknown research'}</span>
                                                {activity.researchTechniqueName && <span>{activity.researchTechniqueName}</span>}
                                                <span className="inline-flex items-center gap-1">
                                                    <User className="h-3.5 w-3.5" />
                                                    {actorLabel}
                                                </span>
                                                <span className="inline-flex items-center gap-1">
                                                    <Clock3 className="h-3.5 w-3.5" />
                                                    {new Date(activity.createdAt).toLocaleString('en-US', {
                                                        year: 'numeric',
                                                        month: 'short',
                                                        day: 'numeric',
                                                        hour: '2-digit',
                                                        minute: '2-digit',
                                                    })}
                                                </span>
                                                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-gray-600">
                                                    {activity.action}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};
