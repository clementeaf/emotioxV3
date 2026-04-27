import { useEffect, useMemo, useState } from 'react';
import { Clock3, History, User } from 'lucide-react';
import { researchService, type ResearchActivity } from '../../services/research.service';
import { ResearchDetailDrawer } from '../../components/tracking/ResearchDetailDrawer';

export const ResearchTrackingPage = () => {
    const [activities, setActivities] = useState<ResearchActivity[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [summaryFilter, setSummaryFilter] = useState('');
    const [researchFilter, setResearchFilter] = useState('all');
    const [techniqueFilter, setTechniqueFilter] = useState('');
    const [actorFilter, setActorFilter] = useState('');
    const [actionFilter, setActionFilter] = useState('');
    const [selectedResearchId, setSelectedResearchId] = useState<string | null>(null);

    useEffect((): void => {
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

    const filteredActivities = useMemo(() => {
        const summaryTerm = summaryFilter.trim().toLowerCase();
        const techniqueTerm = techniqueFilter.trim().toLowerCase();
        const actorTerm = actorFilter.trim().toLowerCase();
        const actionTerm = actionFilter.trim().toLowerCase();

        return activities.filter((activity) => {
            const actorLabel = activity.actorName || activity.actorEmail || 'System';
            const matchesSummary = !summaryTerm || activity.summary.toLowerCase().includes(summaryTerm);
            const matchesTechnique = !techniqueTerm || (activity.researchTechniqueName || '').toLowerCase().includes(techniqueTerm);
            const matchesActor = !actorTerm || actorLabel.toLowerCase().includes(actorTerm);
            const matchesAction = !actionTerm || activity.action.toLowerCase().includes(actionTerm);

            return matchesSummary
                && (researchFilter === 'all' || activity.researchName === researchFilter)
                && matchesTechnique
                && matchesActor
                && matchesAction;
        });
    }, [activities, summaryFilter, researchFilter, techniqueFilter, actorFilter, actionFilter]);

    return (
        <div className="p-6 space-y-4">
            <div className="bg-white rounded-lg border border-gray-100 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100">
                    <div className="flex items-center gap-2">
                        <History className="h-5 w-5 text-gray-500" />
                        <h1 className="text-lg font-semibold text-gray-900">Research Tracking</h1>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">Global activity log across all researches. Click a row for details.</p>
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
                    <div className="overflow-auto max-h-[calc(100vh-12rem)]">
                        <table className="w-full min-w-[980px] text-sm">
                            <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Summary</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Research</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Technique</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Researcher</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                </tr>
                                <tr className="bg-white border-t border-gray-100">
                                    <th className="px-4 py-2">
                                        <input
                                            value={summaryFilter}
                                            onChange={(e) => setSummaryFilter(e.target.value)}
                                            placeholder="Filter summary"
                                            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                                        />
                                    </th>
                                    <th className="px-4 py-2">
                                        <select
                                            value={researchFilter}
                                            onChange={(e) => setResearchFilter(e.target.value)}
                                            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg"
                                        >
                                            <option value="all">All researches</option>
                                            {Array.from(new Set(activities.map((item) => item.researchName).filter(Boolean))).sort().map((value) => (
                                                <option key={value} value={value || ''}>{value}</option>
                                            ))}
                                        </select>
                                    </th>
                                    <th className="px-4 py-2">
                                        <input
                                            value={techniqueFilter}
                                            onChange={(e) => setTechniqueFilter(e.target.value)}
                                            placeholder="Filter technique"
                                            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                                        />
                                    </th>
                                    <th className="px-4 py-2">
                                        <input
                                            value={actorFilter}
                                            onChange={(e) => setActorFilter(e.target.value)}
                                            placeholder="Filter researcher"
                                            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                                        />
                                    </th>
                                    <th className="px-4 py-2">
                                        <input
                                            value={actionFilter}
                                            onChange={(e) => setActionFilter(e.target.value)}
                                            placeholder="Filter action"
                                            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                                        />
                                    </th>
                                    <th className="px-4 py-2" />
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 bg-white">
                                {filteredActivities.map((activity) => {
                                    const actorLabel = activity.actorName || activity.actorEmail || 'System';
                                    return (
                                        <tr
                                            key={activity.id}
                                            className="hover:bg-gray-50 cursor-pointer"
                                            onClick={() => setSelectedResearchId(activity.researchId)}
                                        >
                                            <td className="px-4 py-3 text-gray-900 font-medium">{activity.summary}</td>
                                            <td className="px-4 py-3 text-gray-600">{activity.researchName || 'Unknown research'}</td>
                                            <td className="px-4 py-3 text-gray-600">{activity.researchTechniqueName || '—'}</td>
                                            <td className="px-4 py-3 text-gray-600">
                                                <span className="inline-flex items-center gap-1">
                                                    <User className="h-3.5 w-3.5" />
                                                    {actorLabel}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-gray-600">
                                                    {activity.action}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
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
