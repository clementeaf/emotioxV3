import { useState, useEffect, useCallback } from 'react';
import { Eye, Users, Crosshair, Loader2, BarChart3 } from 'lucide-react';
import { type Research } from '../../services/research.service';
import * as analyticsService from '../../services/analytics.service';
import type { BenchmarkResults, BenchmarkResearchResult, BenchmarkAOI } from '../../services/analytics.service';

interface ClientsBenchmarkViewProps {
    research: Research;
    stimulusId: string; // The selected research ID from sidebar
}

// Chart colors for differentiating researches
const RESEARCH_COLORS = [
    '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
    '#06B6D4', '#EC4899', '#F97316', '#14B8A6', '#6366F1',
];

/**
 * View for Client's Benchmark — compares Eye Tracking AOI metrics
 * (% Attention and fixation count) across multiple researches.
 */
export const ClientsBenchmarkView = ({ research, stimulusId }: ClientsBenchmarkViewProps) => {
    const [data, setData] = useState<BenchmarkResults | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const results = await analyticsService.getBenchmarkResults(research.id);
            setData(results);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load benchmark data');
        } finally {
            setIsLoading(false);
        }
    }, [research.id]);

    useEffect(() => { fetchData(); }, [fetchData]);

    // Find the selected research to highlight
    const selectedResearch = data?.researches.find(r => r.researchId === stimulusId);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-accent" />
                <span className="ml-3 text-gray-500">Loading benchmark data...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
                <p className="text-sm text-red-600">{error}</p>
                <button onClick={fetchData} className="mt-3 text-sm text-red-700 underline hover:opacity-80">
                    Retry
                </button>
            </div>
        );
    }

    if (!data || data.researches.length === 0) {
        return (
            <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
                <BarChart3 className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-lg font-medium text-gray-900 mb-2">No benchmark data available</p>
                <p className="text-sm text-gray-500">
                    The selected researches don't have Eye Tracking data yet.
                </p>
            </div>
        );
    }

    // Collect all unique AOI labels across all researches
    const allAoiLabels = new Set<string>();
    for (const r of data.researches) {
        for (const m of r.modules) {
            for (const aoi of m.aois) {
                allAoiLabels.add(aoi.label || `AOI ${aoi.id}`);
            }
        }
    }

    return (
        <div className="space-y-8">
            {/* Header */}
            <div>
                <h2 className="text-xl font-bold text-gray-900 mb-1">Client's Benchmark</h2>
                <p className="text-sm text-gray-500">
                    Comparing Eye Tracking metrics across {data.researches.length} research{data.researches.length !== 1 ? 'es' : ''}
                </p>
            </div>

            {/* Overview cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {data.researches.map((r, idx) => (
                    <ResearchOverviewCard
                        key={r.researchId}
                        research={r}
                        color={RESEARCH_COLORS[idx % RESEARCH_COLORS.length]}
                        isSelected={r.researchId === stimulusId}
                    />
                ))}
            </div>

            {/* Per-research detail view for the selected research */}
            {selectedResearch && selectedResearch.modules.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                    <div className="p-5 border-b border-gray-100">
                        <h3 className="text-lg font-semibold text-gray-900">
                            {selectedResearch.researchName}
                        </h3>
                        <p className="text-sm text-gray-500 mt-1">
                            {selectedResearch.modules.length} module{selectedResearch.modules.length !== 1 ? 's' : ''}
                        </p>
                    </div>

                    {selectedResearch.modules.map(mod => (
                        <div key={mod.moduleId} className="p-5 border-b border-gray-50 last:border-b-0">
                            <div className="flex items-center justify-between mb-4">
                                <h4 className="text-sm font-semibold text-gray-800">{mod.moduleName}</h4>
                                <div className="flex items-center gap-4 text-xs text-gray-500">
                                    <span className="flex items-center gap-1">
                                        <Users className="h-3.5 w-3.5" />
                                        {mod.uniqueParticipants} participants
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <Eye className="h-3.5 w-3.5" />
                                        {mod.totalResponses} responses
                                    </span>
                                </div>
                            </div>

                            {mod.aois.length > 0 ? (
                                <AOITable aois={mod.aois} />
                            ) : (
                                <p className="text-sm text-gray-400 italic">No AOIs defined for this module.</p>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Comparative table: all researches side by side */}
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <div className="p-5 border-b border-gray-100">
                    <h3 className="text-lg font-semibold text-gray-900">Comparative View</h3>
                    <p className="text-sm text-gray-500 mt-1">
                        % Attention (dwell time) and fixation count per AOI across all researches
                    </p>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-gray-100 bg-gray-50">
                                <th className="text-left px-5 py-3 font-semibold text-gray-600">Research</th>
                                <th className="text-left px-5 py-3 font-semibold text-gray-600">Module</th>
                                <th className="text-left px-5 py-3 font-semibold text-gray-600">AOI</th>
                                <th className="text-right px-5 py-3 font-semibold text-gray-600">% Attention</th>
                                <th className="text-right px-5 py-3 font-semibold text-gray-600">Fixations</th>
                                <th className="text-right px-5 py-3 font-semibold text-gray-600">Participants</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.researches.map((r, rIdx) =>
                                r.modules.flatMap(mod =>
                                    mod.aois.length > 0
                                        ? mod.aois.map((aoi, aoiIdx) => (
                                            <tr
                                                key={`${r.researchId}-${mod.moduleId}-${aoi.id}`}
                                                className="border-b border-gray-50 hover:bg-gray-50 transition-colors"
                                            >
                                                {aoiIdx === 0 && (
                                                    <>
                                                        <td
                                                            className="px-5 py-3 font-medium text-gray-900"
                                                            rowSpan={mod.aois.length}
                                                        >
                                                            <div className="flex items-center gap-2">
                                                                <div
                                                                    className="w-3 h-3 rounded-full flex-shrink-0"
                                                                    style={{ backgroundColor: RESEARCH_COLORS[rIdx % RESEARCH_COLORS.length] }}
                                                                />
                                                                <span className="truncate max-w-[180px]">{r.researchName}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-5 py-3 text-gray-700" rowSpan={mod.aois.length}>
                                                            {mod.moduleName}
                                                        </td>
                                                    </>
                                                )}
                                                <td className="px-5 py-3 text-gray-700">{aoi.label || `AOI ${aoi.id}`}</td>
                                                <td className="px-5 py-3 text-right">
                                                    <AttentionBar percent={aoi.dwellTimePercent} color={RESEARCH_COLORS[rIdx % RESEARCH_COLORS.length]} />
                                                </td>
                                                <td className="px-5 py-3 text-right font-semibold text-gray-800">
                                                    <Crosshair className="h-3.5 w-3.5 inline-block mr-0.5 -mt-0.5 text-gray-400" />
                                                    {aoi.fixationCount}
                                                </td>
                                                <td className="px-5 py-3 text-right text-gray-600">{aoi.participantCount}</td>
                                            </tr>
                                        ))
                                        : [(
                                            <tr key={`${r.researchId}-${mod.moduleId}-empty`} className="border-b border-gray-50">
                                                <td className="px-5 py-3 font-medium text-gray-900">
                                                    <div className="flex items-center gap-2">
                                                        <div
                                                            className="w-3 h-3 rounded-full flex-shrink-0"
                                                            style={{ backgroundColor: RESEARCH_COLORS[rIdx % RESEARCH_COLORS.length] }}
                                                        />
                                                        {r.researchName}
                                                    </div>
                                                </td>
                                                <td className="px-5 py-3 text-gray-700">{mod.moduleName}</td>
                                                <td colSpan={4} className="px-5 py-3 text-gray-400 italic">No AOIs</td>
                                            </tr>
                                        )]
                                )
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

// ==========================================
// HELPER COMPONENTS
// ==========================================

const ResearchOverviewCard = ({
    research,
    color,
    isSelected,
}: {
    research: BenchmarkResearchResult;
    color: string;
    isSelected: boolean;
}) => {
    const totalAois = research.modules.reduce((sum, m) => sum + m.aois.length, 0);
    const totalParticipants = research.modules.reduce((max, m) => Math.max(max, m.uniqueParticipants), 0);

    return (
        <div className={`bg-white border rounded-xl p-4 transition-all ${
            isSelected ? 'border-accent ring-2 ring-accent/20' : 'border-gray-200'
        }`}>
            <div className="flex items-center gap-2 mb-3">
                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                <p className="text-sm font-semibold text-gray-900 truncate">{research.researchName}</p>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                    <p className="text-lg font-bold text-gray-900">{research.modules.length}</p>
                    <p className="text-xs text-gray-500">Shelves</p>
                </div>
                <div>
                    <p className="text-lg font-bold text-gray-900">{totalAois}</p>
                    <p className="text-xs text-gray-500">AOIs</p>
                </div>
                <div>
                    <p className="text-lg font-bold text-gray-900">{totalParticipants}</p>
                    <p className="text-xs text-gray-500">Participants</p>
                </div>
            </div>
        </div>
    );
};

const AOITable = ({ aois }: { aois: BenchmarkAOI[] }) => (
    <div className="space-y-2">
        {aois.map((aoi, idx) => (
            <div key={aoi.id} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                        {aoi.label || `AOI ${idx + 1}`}
                    </p>
                </div>
                <div className="flex items-center gap-6 text-sm">
                    <div className="text-center w-20">
                        <p className="font-semibold text-blue-600">{aoi.dwellTimePercent}%</p>
                        <p className="text-xs text-gray-400">Attention</p>
                    </div>
                    <div className="text-center w-20">
                        <p className="font-semibold text-gray-700">
                            <Crosshair className="h-3.5 w-3.5 inline-block mr-0.5 -mt-0.5" />
                            {aoi.fixationCount}
                        </p>
                        <p className="text-xs text-gray-400">Fixations</p>
                    </div>
                    <div className="text-center w-20">
                        <p className="font-semibold text-gray-700">
                            <Users className="h-3.5 w-3.5 inline-block mr-0.5 -mt-0.5" />
                            {aoi.participantCount}
                        </p>
                        <p className="text-xs text-gray-400">Viewers</p>
                    </div>
                </div>
            </div>
        ))}
    </div>
);

const AttentionBar = ({ percent, color }: { percent: number; color: string }) => (
    <div className="flex items-center gap-2 justify-end">
        <div className="w-20 h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
                className="h-full rounded-full transition-all"
                style={{ width: `${Math.min(percent, 100)}%`, backgroundColor: color }}
            />
        </div>
        <span className="font-semibold text-gray-800 w-10 text-right">{percent}%</span>
    </div>
);
