import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Sparkles, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import apiClient from '../../../services/api/client';

interface ExecutiveSummary {
    generatedAt: string;
    overview: string;
    keyFindings: string[];
    recommendations: string[];
    metrics: {
        participantCount: number;
        responseCount: number;
        nps?: number;
        csat?: number;
        ces?: number;
    };
    sentiment?: {
        positive: number;
        negative: number;
        neutral: number;
    };
}

export const ExecutiveSummaryPanel = ({ researchId }: { researchId: string }) => {
    const [expanded, setExpanded] = useState(false);
    const queryClient = useQueryClient();

    const { data: summary, isLoading } = useQuery({
        queryKey: ['executive-summary', researchId],
        queryFn: async () => {
            const res = await apiClient.get<{ summary: ExecutiveSummary | null }>(
                `/analytics/research/${researchId}/executive-summary`
            );
            return res.summary;
        },
        staleTime: 60_000,
    });

    const generate = useMutation({
        mutationFn: async () => {
            const res = await apiClient.post<{ summary: ExecutiveSummary }>(
                `/analytics/research/${researchId}/executive-summary`,
                {}
            );
            return res.summary;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['executive-summary', researchId] });
        },
    });

    if (isLoading) {
        return (
            <div className="bg-white border border-gray-100 rounded-lg p-4 animate-pulse">
                <div className="h-5 bg-gray-200 rounded w-48 mb-3" />
                <div className="h-4 bg-gray-200 rounded w-full mb-2" />
                <div className="h-4 bg-gray-200 rounded w-3/4" />
            </div>
        );
    }

    if (!summary) {
        return (
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-100 rounded-lg p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Sparkles className="h-5 w-5 text-blue-500" />
                    <div>
                        <p className="text-sm font-medium text-gray-900">Executive Summary</p>
                        <p className="text-xs text-gray-500">Generate an AI-powered summary of this research</p>
                    </div>
                </div>
                <button
                    onClick={() => generate.mutate()}
                    disabled={generate.isPending}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                >
                    {generate.isPending ? (
                        <>
                            <RefreshCw className="h-4 w-4 animate-spin" />
                            Generating...
                        </>
                    ) : (
                        <>
                            <Sparkles className="h-4 w-4" />
                            Generate Summary
                        </>
                    )}
                </button>
            </div>
        );
    }

    return (
        <div className="bg-white border border-gray-100 rounded-lg overflow-hidden">
            {/* Header */}
            <button
                onClick={() => setExpanded(!expanded)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
            >
                <div className="flex items-center gap-3">
                    <Sparkles className="h-5 w-5 text-blue-500" />
                    <span className="text-sm font-medium text-gray-900">Executive Summary</span>
                    <span className="text-xs text-gray-400">
                        {new Date(summary.generatedAt).toLocaleDateString()}
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={(e) => { e.stopPropagation(); generate.mutate(); }}
                        disabled={generate.isPending}
                        className="p-1.5 text-gray-400 hover:text-blue-600 rounded hover:bg-blue-50"
                        title="Regenerate"
                    >
                        <RefreshCw className={`h-4 w-4 ${generate.isPending ? 'animate-spin' : ''}`} />
                    </button>
                    {expanded ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                </div>
            </button>

            {/* Overview (always visible) */}
            <div className="px-4 pb-3">
                <p className="text-sm text-gray-600 leading-relaxed">{summary.overview}</p>
            </div>

            {/* Expanded content */}
            {expanded && (
                <div className="px-4 pb-4 space-y-4 border-t border-gray-50 pt-4">
                    {/* Metrics row */}
                    <div className="flex gap-4 flex-wrap">
                        <MetricBadge label="Participants" value={summary.metrics.participantCount} />
                        <MetricBadge label="Responses" value={summary.metrics.responseCount} />
                        {summary.metrics.nps !== undefined && <MetricBadge label="NPS" value={summary.metrics.nps} />}
                        {summary.metrics.csat !== undefined && <MetricBadge label="CSAT" value={summary.metrics.csat} />}
                        {summary.metrics.ces !== undefined && <MetricBadge label="CES" value={summary.metrics.ces} />}
                    </div>

                    {/* Key Findings */}
                    {summary.keyFindings.length > 0 && (
                        <div>
                            <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">Key Findings</h4>
                            <ul className="space-y-1.5">
                                {summary.keyFindings.map((finding, i) => (
                                    <li key={i} className="flex items-start gap-2">
                                        <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                                            {i + 1}
                                        </span>
                                        <span className="text-sm text-gray-600">{finding}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Recommendations */}
                    {summary.recommendations.length > 0 && (
                        <div>
                            <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">Recommendations</h4>
                            <ul className="space-y-1.5">
                                {summary.recommendations.map((rec, i) => (
                                    <li key={i} className="flex items-start gap-2">
                                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0 mt-2" />
                                        <span className="text-sm text-gray-600">{rec}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Sentiment */}
                    {summary.sentiment && (summary.sentiment.positive + summary.sentiment.negative + summary.sentiment.neutral > 0) && (
                        <div>
                            <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">Sentiment Distribution</h4>
                            <div className="flex gap-4">
                                <SentimentBar label="Positive" value={summary.sentiment.positive} color="bg-green-500" total={summary.sentiment.positive + summary.sentiment.negative + summary.sentiment.neutral} />
                                <SentimentBar label="Neutral" value={summary.sentiment.neutral} color="bg-gray-400" total={summary.sentiment.positive + summary.sentiment.negative + summary.sentiment.neutral} />
                                <SentimentBar label="Negative" value={summary.sentiment.negative} color="bg-red-500" total={summary.sentiment.positive + summary.sentiment.negative + summary.sentiment.neutral} />
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

const MetricBadge = ({ label, value }: { label: string; value: number }) => (
    <div className="bg-gray-50 rounded-lg px-3 py-2">
        <p className="text-lg font-bold text-gray-900">{value}</p>
        <p className="text-xs text-gray-500">{label}</p>
    </div>
);

const SentimentBar = ({ label, value, color, total }: { label: string; value: number; color: string; total: number }) => {
    const pct = total > 0 ? Math.round((value / total) * 100) : 0;
    return (
        <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-600">{label}</span>
                <span className="text-xs font-medium text-gray-900">{pct}%</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className={`h-full ${color} rounded-full`} style={{ width: `${pct}%` }} />
            </div>
        </div>
    );
};
