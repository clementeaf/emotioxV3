/**
 * Funnel Chart
 * Shows page visit flow with drop-off between pages.
 */

import { useQuery } from '@tanstack/react-query';
import { ArrowRight, TrendingDown } from 'lucide-react';
import * as trackingService from '../../../services/tracking.service';

interface FunnelChartProps {
    researchId: string;
}

export const FunnelChart = ({ researchId }: FunnelChartProps) => {
    const { data, isLoading } = useQuery({
        queryKey: ['tracking', researchId, 'funnels'],
        queryFn: () => trackingService.getFunnels(researchId),
        staleTime: 10_000,
    });

    if (isLoading) {
        return <div className="h-64 bg-gray-100 rounded-lg animate-pulse" />;
    }

    if (!data || data.totalVisitors === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-center">
                <TrendingDown className="h-8 w-8 text-gray-300 mb-3" />
                <p className="text-sm text-gray-500">No funnel data yet. Need visits across multiple pages.</p>
            </div>
        );
    }

    const maxVisitors = data.topPages.length > 0 ? data.topPages[0].visitors : 1;

    return (
        <div className="space-y-6">
            {/* Top Pages Funnel */}
            <div>
                <h3 className="text-sm font-semibold text-slate-800 mb-1">
                    Page Visits
                    <span className="ml-2 text-xs font-normal text-gray-500">
                        {data.totalVisitors} unique visitors
                    </span>
                </h3>
                <p className="text-xs text-gray-400 mb-4">Pages ranked by unique visitor count.</p>

                <div className="space-y-2">
                    {data.topPages.map((page, i) => {
                        const pct = Math.round((page.visitors / maxVisitors) * 100);
                        return (
                            <div key={page.pageUrl} className="flex items-center gap-3">
                                <span className="text-xs font-medium text-gray-400 w-5 text-right">{i + 1}</span>
                                <div className="flex-1 relative">
                                    <div className="h-8 bg-gray-100 rounded-md overflow-hidden">
                                        <div
                                            className="h-full rounded-md bg-blue-500 transition-all"
                                            style={{
                                                width: `${pct}%`,
                                                opacity: 0.15 + (pct / 100) * 0.85,
                                            }}
                                        />
                                    </div>
                                    <div className="absolute inset-0 flex items-center px-3 justify-between">
                                        <span className="text-xs font-medium text-slate-700 truncate max-w-[70%]">
                                            {shortenUrl(page.pageUrl)}
                                        </span>
                                        <span className="text-xs text-gray-500 shrink-0">{page.visitors} visitors</span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Page Transitions */}
            {data.transitions.length > 0 && (
                <div>
                    <h3 className="text-sm font-semibold text-slate-800 mb-1">Top Page Transitions</h3>
                    <p className="text-xs text-gray-400 mb-4">Most common navigation paths between pages.</p>

                    <div className="space-y-2">
                        {data.transitions.slice(0, 10).map((t, i) => (
                            <div key={i} className="flex items-center gap-2 text-xs bg-gray-50 rounded-lg px-3 py-2">
                                <span className="text-slate-700 truncate max-w-[35%]" title={t.from}>
                                    {shortenUrl(t.from)}
                                </span>
                                <ArrowRight className="h-3 w-3 text-gray-400 shrink-0" />
                                <span className="text-slate-700 truncate max-w-[35%]" title={t.to}>
                                    {shortenUrl(t.to)}
                                </span>
                                <span className="ml-auto text-gray-500 font-medium shrink-0">{t.count}x</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

const shortenUrl = (url: string): string => {
    try {
        const u = new URL(url);
        return u.pathname === '/' ? u.hostname : u.pathname;
    } catch {
        return url.length > 40 ? url.slice(0, 40) + '...' : url;
    }
};
