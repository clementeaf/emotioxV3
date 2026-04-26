/**
 * Scroll Depth Chart
 * Horizontal bar chart showing % of users who reached each scroll depth.
 */

import { useQuery } from '@tanstack/react-query';
import { ArrowDownUp } from 'lucide-react';
import * as trackingService from '../../../services/tracking.service';

interface ScrollDepthChartProps {
    researchId: string;
    pageUrl?: string;
}

export const ScrollDepthChart = ({ researchId, pageUrl }: ScrollDepthChartProps) => {
    const { data, isLoading } = useQuery({
        queryKey: ['tracking', researchId, 'scroll', pageUrl],
        queryFn: () => trackingService.getScrollDepth(researchId, pageUrl),
        staleTime: 10_000,
    });

    if (isLoading) {
        return <div className="h-64 bg-gray-100 rounded-lg animate-pulse" />;
    }

    if (!data || data.totalSessions === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-center">
                <ArrowDownUp className="h-8 w-8 text-gray-300 mb-3" />
                <p className="text-sm text-gray-500">No scroll data yet. Enable scroll tracking in configuration.</p>
            </div>
        );
    }

    return (
        <div>
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-slate-800">
                    Scroll Depth
                    <span className="ml-2 text-xs font-normal text-gray-500">
                        {data.totalSessions} sessions with scroll data
                    </span>
                </h3>
            </div>

            <div className="space-y-2">
                {data.depths.map((d) => (
                    <div key={d.depthPct} className="flex items-center gap-3">
                        <span className="text-xs font-mono text-gray-500 w-10 text-right shrink-0">
                            {d.depthPct}%
                        </span>
                        <div className="flex-1 h-7 bg-gray-100 rounded-md overflow-hidden relative">
                            <div
                                className="h-full rounded-md transition-all duration-300"
                                style={{
                                    width: `${d.percentage}%`,
                                    background: getDepthColor(d.depthPct),
                                }}
                            />
                            <span className="absolute inset-0 flex items-center px-2 text-xs font-medium text-slate-700">
                                {d.percentage}% ({d.sessions} visitors)
                            </span>
                        </div>
                    </div>
                ))}
            </div>

            <p className="text-xs text-gray-400 mt-3">
                Shows the percentage of visitors who scrolled to at least each depth level.
            </p>
        </div>
    );
};

const getDepthColor = (pct: number): string => {
    if (pct <= 20) return '#22c55e';  // green
    if (pct <= 40) return '#84cc16';  // lime
    if (pct <= 60) return '#eab308';  // yellow
    if (pct <= 80) return '#f97316';  // orange
    return '#ef4444';                  // red
};
