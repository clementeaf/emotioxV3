/**
 * Website Tracking Results
 * Overview metrics + click heatmap over page screenshot.
 */

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { MousePointerClick, Users, Globe, Activity, Clock, ExternalLink, Upload } from 'lucide-react';
import * as trackingService from '../../../services/tracking.service';
import { HeatmapRenderer } from '../cognitive-task/components/HeatmapRenderer';
import { resolveMediaUrl, mediaService } from '../../../services/media.service';

interface WebsiteTrackingResultsProps {
    researchId: string;
}

export const WebsiteTrackingResults = ({ researchId }: WebsiteTrackingResultsProps) => {
    const queryClient = useQueryClient();
    const [selectedPageUrl, setSelectedPageUrl] = useState<string | undefined>();
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleScreenshotUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !selectedPageUrl) return;
        setUploading(true);
        try {
            const { s3Key } = await mediaService.uploadFile(researchId, file);
            await trackingService.savePageScreenshot(researchId, selectedPageUrl, s3Key);
            queryClient.invalidateQueries({ queryKey: ['tracking', researchId, 'pages'] });
        } catch (err) {
            console.error('Screenshot upload failed:', err);
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    }, [researchId, selectedPageUrl, queryClient]);

    // Fetch overview metrics
    const { data: overview, isLoading: loadingOverview } = useQuery({
        queryKey: ['tracking', researchId, 'overview'],
        queryFn: () => trackingService.getOverview(researchId),
        staleTime: 10_000,
    });

    // Fetch tracked pages
    const { data: pages, isLoading: loadingPages } = useQuery({
        queryKey: ['tracking', researchId, 'pages'],
        queryFn: () => trackingService.getTrackedPages(researchId),
        staleTime: 10_000,
    });

    // Auto-select first page
    useEffect(() => {
        if (pages && pages.length > 0 && !selectedPageUrl) {
            setSelectedPageUrl(pages[0].pageUrl);
        }
    }, [pages, selectedPageUrl]);

    // Fetch click heatmap for selected page
    const { data: heatmapData, isLoading: loadingHeatmap } = useQuery({
        queryKey: ['tracking', researchId, 'heatmap', selectedPageUrl],
        queryFn: () => trackingService.getClickHeatmap(researchId, selectedPageUrl),
        enabled: !!selectedPageUrl,
        staleTime: 10_000,
    });

    const selectedPage = useMemo(
        () => pages?.find((p) => p.pageUrl === selectedPageUrl),
        [pages, selectedPageUrl]
    );

    const screenshotUrl = useMemo(() => {
        if (!selectedPage?.screenshotS3Key) return null;
        return resolveMediaUrl(selectedPage.screenshotS3Key);
    }, [selectedPage]);

    // Convert click data to HeatmapRenderer format
    const heatmapPoints = useMemo(() => {
        if (!heatmapData?.clicks) return [];
        return heatmapData.clicks.map((c) => ({
            x: c.x,
            y: c.y,
            value: c.count,
        }));
    }, [heatmapData]);

    const isLoading = loadingOverview || loadingPages;

    if (isLoading) {
        return (
            <div className="space-y-6 animate-pulse">
                <div className="grid grid-cols-5 gap-4">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="h-24 bg-gray-200 rounded-xl" />
                    ))}
                </div>
                <div className="h-96 bg-gray-200 rounded-xl" />
            </div>
        );
    }

    if (!overview || overview.totalSessions === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-center">
                <MousePointerClick className="h-12 w-12 text-gray-300 mb-4" />
                <h3 className="text-lg font-semibold text-gray-700 mb-1">No tracking data yet</h3>
                <p className="text-sm text-gray-500 max-w-md">
                    Install the tracking script on your website and wait for visitors to start interacting.
                    Data will appear here in real time.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Overview Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                <MetricCard
                    icon={<Users className="h-5 w-5" />}
                    label="Unique Visitors"
                    value={overview.uniqueVisitors}
                />
                <MetricCard
                    icon={<Activity className="h-5 w-5" />}
                    label="Total Sessions"
                    value={overview.totalSessions}
                />
                <MetricCard
                    icon={<Globe className="h-5 w-5" />}
                    label="Pages Tracked"
                    value={overview.pagesTracked}
                />
                <MetricCard
                    icon={<MousePointerClick className="h-5 w-5" />}
                    label="Total Events"
                    value={overview.totalEvents.toLocaleString()}
                />
                <MetricCard
                    icon={<Clock className="h-5 w-5" />}
                    label="Avg. Duration"
                    value={formatDuration(overview.avgSessionDuration)}
                />
            </div>

            {/* Page Selector + Heatmap */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                {/* Page tabs */}
                <div className="border-b border-gray-200 px-4 py-3 flex items-center gap-3 overflow-x-auto">
                    <span className="text-xs font-semibold text-gray-400 uppercase shrink-0">Page:</span>
                    {pages?.map((page) => (
                        <button
                            key={page.id}
                            onClick={() => setSelectedPageUrl(page.pageUrl)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg whitespace-nowrap transition-colors ${
                                selectedPageUrl === page.pageUrl
                                    ? 'bg-blue-50 text-blue-700 font-medium'
                                    : 'text-gray-600 hover:bg-gray-50'
                            }`}
                        >
                            <Globe className="h-3.5 w-3.5" />
                            <span className="max-w-[200px] truncate">{page.pageTitle || shortenUrl(page.pageUrl)}</span>
                            <span className="text-xs text-gray-400">({page.sessionCount})</span>
                        </button>
                    ))}
                </div>

                {/* Heatmap area */}
                <div className="p-4">
                    {loadingHeatmap ? (
                        <div className="h-96 bg-gray-100 rounded-lg animate-pulse" />
                    ) : screenshotUrl && heatmapPoints.length > 0 ? (
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="text-sm font-semibold text-slate-800">
                                    Click Heatmap
                                    <span className="ml-2 text-xs font-normal text-gray-500">
                                        {heatmapData?.totalClicks.toLocaleString()} clicks from {heatmapData?.sessions} sessions
                                    </span>
                                </h3>
                                {selectedPage && (
                                    <a
                                        href={selectedPage.pageUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800"
                                    >
                                        Visit page <ExternalLink className="h-3 w-3" />
                                    </a>
                                )}
                            </div>
                            <HeatmapRenderer
                                imageUrl={screenshotUrl}
                                data={heatmapPoints}
                                coordSystem="pixel"
                                className="w-full"
                            />
                        </div>
                    ) : heatmapPoints.length > 0 && !screenshotUrl ? (
                        <div className="bg-gray-50 rounded-lg p-8 text-center">
                            <MousePointerClick className="h-8 w-8 text-gray-400 mx-auto mb-3" />
                            <p className="text-sm font-medium text-gray-700 mb-1">
                                {heatmapData?.totalClicks} clicks recorded
                            </p>
                            <p className="text-xs text-gray-500 mb-4">
                                Upload a screenshot of this page to visualize the click heatmap overlay.
                            </p>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/png,image/jpeg,image/webp"
                                className="hidden"
                                onChange={handleScreenshotUpload}
                            />
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                disabled={uploading}
                                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                            >
                                <Upload className="h-4 w-4" />
                                {uploading ? 'Uploading...' : 'Upload Screenshot'}
                            </button>
                            <ClickDataTable clicks={heatmapData?.clicks || []} />
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-16 text-center">
                            <MousePointerClick className="h-8 w-8 text-gray-300 mb-3" />
                            <p className="text-sm text-gray-500">No click data for this page yet.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Tracked Pages Table */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h3 className="text-sm font-semibold text-slate-800 mb-4">Tracked Pages</h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-gray-100">
                                <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 uppercase">Page</th>
                                <th className="text-right py-2 px-3 text-xs font-medium text-gray-500 uppercase">Sessions</th>
                                <th className="text-right py-2 px-3 text-xs font-medium text-gray-500 uppercase">Events</th>
                            </tr>
                        </thead>
                        <tbody>
                            {pages?.map((page) => (
                                <tr key={page.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                                    <td className="py-2.5 px-3">
                                        <button
                                            onClick={() => setSelectedPageUrl(page.pageUrl)}
                                            className="text-blue-600 hover:text-blue-800 text-left max-w-md truncate block"
                                        >
                                            {page.pageTitle || shortenUrl(page.pageUrl)}
                                        </button>
                                        <span className="text-xs text-gray-400 block truncate max-w-md">{page.pageUrl}</span>
                                    </td>
                                    <td className="py-2.5 px-3 text-right font-medium text-gray-700">{page.sessionCount}</td>
                                    <td className="py-2.5 px-3 text-right text-gray-600">{page.eventCount.toLocaleString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

// ─── Helper Components ───────────────────────────────────────────────

const MetricCard = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) => (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center gap-2 text-gray-500 mb-2">{icon}<span className="text-xs font-medium">{label}</span></div>
        <p className="text-2xl font-bold text-slate-900">{value}</p>
    </div>
);

const ClickDataTable = ({ clicks }: { clicks: Array<{ x: number; y: number; count: number }> }) => {
    const top10 = clicks.slice(0, 10);
    if (top10.length === 0) return null;
    return (
        <div className="mt-4 text-left">
            <table className="w-full text-xs">
                <thead>
                    <tr className="border-b">
                        <th className="py-1 px-2 text-gray-500">X</th>
                        <th className="py-1 px-2 text-gray-500">Y</th>
                        <th className="py-1 px-2 text-gray-500">Clicks</th>
                    </tr>
                </thead>
                <tbody>
                    {top10.map((c, i) => (
                        <tr key={i} className="border-b border-gray-50">
                            <td className="py-1 px-2">{c.x}</td>
                            <td className="py-1 px-2">{c.y}</td>
                            <td className="py-1 px-2 font-medium">{c.count}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

// ─── Utilities ───────────────────────────────────────────────────────

const formatDuration = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
};

const shortenUrl = (url: string): string => {
    try {
        const u = new URL(url);
        return u.pathname === '/' ? u.hostname : `${u.hostname}${u.pathname}`;
    } catch {
        return url.length > 50 ? url.slice(0, 50) + '...' : url;
    }
};
