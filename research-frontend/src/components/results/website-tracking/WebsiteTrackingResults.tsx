/**
 * Website Tracking Results
 * Tabbed view: Click Heatmap, Scroll Depth, Session Replay, Funnels.
 * Overview metrics + export + page selector.
 */

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
    MousePointerClick, Users, Globe, Activity, Clock, ExternalLink,
    Upload, Download, ArrowDownUp, PlayCircle, TrendingDown,
} from 'lucide-react';
import * as trackingService from '../../../services/tracking.service';
import type { TrackingSession } from '../../../services/tracking.service';
import { HeatmapRenderer } from '../cognitive-task/components/HeatmapRenderer';
import { DataTable, type DataTableColumn } from '../../ui/DataTable';
import { resolveMediaUrl, mediaService } from '../../../services/media.service';
import { ScrollDepthChart } from './ScrollDepthChart';
import { SessionReplayPlayer } from './SessionReplayPlayer';
import { FunnelChart } from './FunnelChart';

type ResultTab = 'clicks' | 'scroll' | 'sessions' | 'funnels';

interface WebsiteTrackingResultsProps {
    researchId: string;
}

export const WebsiteTrackingResults = ({ researchId }: WebsiteTrackingResultsProps) => {
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState<ResultTab>('clicks');
    const [selectedPageUrl, setSelectedPageUrl] = useState<string | undefined>();
    const [uploading, setUploading] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [replaySessionId, setReplaySessionId] = useState<string | null>(null);
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

    const handleExport = useCallback(async () => {
        setExporting(true);
        try {
            const data = await trackingService.getExportData(researchId);
            // Sessions CSV
            const sessionsCsv = toCsv(data.sessions, [
                'id', 'visitor_id', 'page_url', 'page_title', 'viewport_width', 'viewport_height',
                'user_agent', 'referrer', 'started_at', 'ended_at',
            ]);
            downloadCsv(sessionsCsv, `tracking-sessions-${researchId}.csv`);
            // Events CSV
            const eventsCsv = toCsv(data.events, [
                'session_id', 'event_type', 'x', 'y', 'scroll_y', 'scroll_depth_pct',
                'target_selector', 'target_text', 'timestamp_ms',
            ]);
            downloadCsv(eventsCsv, `tracking-events-${researchId}.csv`);
        } catch (err) {
            console.error('Export failed:', err);
        } finally {
            setExporting(false);
        }
    }, [researchId]);

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

    // Fetch sessions (for replay tab)
    const { data: sessions } = useQuery({
        queryKey: ['tracking', researchId, 'sessions-list'],
        queryFn: () => trackingService.getSessions(researchId, 50, 0),
        staleTime: 10_000,
        enabled: activeTab === 'sessions',
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
        enabled: !!selectedPageUrl && activeTab === 'clicks',
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

    const heatmapPoints = useMemo(() => {
        if (!heatmapData?.clicks) return [];
        return heatmapData.clicks.map((c) => ({ x: c.x, y: c.y, value: c.count }));
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
                </p>
            </div>
        );
    }

    // If replay is open, show it full-width
    if (replaySessionId) {
        return (
            <SessionReplayPlayer
                researchId={researchId}
                sessionId={replaySessionId}
                onClose={() => setReplaySessionId(null)}
            />
        );
    }

    const tabs: Array<{ id: ResultTab; label: string; icon: React.ReactNode }> = [
        { id: 'clicks', label: 'Click Heatmap', icon: <MousePointerClick className="h-4 w-4" /> },
        { id: 'scroll', label: 'Scroll Depth', icon: <ArrowDownUp className="h-4 w-4" /> },
        { id: 'sessions', label: 'Sessions', icon: <PlayCircle className="h-4 w-4" /> },
        { id: 'funnels', label: 'Funnels', icon: <TrendingDown className="h-4 w-4" /> },
    ];

    return (
        <div className="space-y-6">
            {/* Overview Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                <MetricCard icon={<Users className="h-5 w-5" />} label="Unique Visitors" value={overview.uniqueVisitors} />
                <MetricCard icon={<Activity className="h-5 w-5" />} label="Total Sessions" value={overview.totalSessions} />
                <MetricCard icon={<Globe className="h-5 w-5" />} label="Pages Tracked" value={overview.pagesTracked} />
                <MetricCard icon={<MousePointerClick className="h-5 w-5" />} label="Total Events" value={overview.totalEvents.toLocaleString()} />
                <MetricCard icon={<Clock className="h-5 w-5" />} label="Avg. Duration" value={formatDuration(overview.avgSessionDuration)} />
            </div>

            {/* Tabs + Export */}
            <div className="border-b border-gray-200 flex items-center justify-between">
                <nav className="flex gap-1">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm border-b-2 transition-colors ${
                                activeTab === tab.id
                                    ? 'border-blue-600 text-blue-600 font-medium'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                        >
                            {tab.icon}
                            {tab.label}
                        </button>
                    ))}
                </nav>
                <button
                    onClick={handleExport}
                    disabled={exporting}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 disabled:opacity-50 transition-colors mb-1"
                >
                    <Download className="h-4 w-4" />
                    {exporting ? 'Exporting...' : 'Export CSV'}
                </button>
            </div>

            {/* Tab Content */}
            {activeTab === 'clicks' && (
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    {/* Page selector */}
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
                                        <a href={selectedPage.pageUrl} target="_blank" rel="noopener noreferrer"
                                            className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800">
                                            Visit page <ExternalLink className="h-3 w-3" />
                                        </a>
                                    )}
                                </div>
                                <HeatmapRenderer imageUrl={screenshotUrl} data={heatmapPoints} coordSystem="pixel" className="w-full" />
                            </div>
                        ) : heatmapPoints.length > 0 && !screenshotUrl ? (
                            <div className="bg-gray-50 rounded-lg p-8 text-center">
                                <MousePointerClick className="h-8 w-8 text-gray-400 mx-auto mb-3" />
                                <p className="text-sm font-medium text-gray-700 mb-1">{heatmapData?.totalClicks} clicks recorded</p>
                                <p className="text-xs text-gray-500 mb-4">Upload a screenshot to visualize the heatmap overlay.</p>
                                <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleScreenshotUpload} />
                                <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
                                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
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
            )}

            {activeTab === 'scroll' && (
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                    <ScrollDepthChart researchId={researchId} pageUrl={selectedPageUrl} />
                </div>
            )}

            {activeTab === 'sessions' && (
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                    <h3 className="text-sm font-semibold text-slate-800 mb-4">
                        Sessions
                        <span className="ml-2 text-xs font-normal text-gray-500">Click to replay</span>
                    </h3>
                    <DataTable<TrackingSession>
                        columns={sessionColumns(setReplaySessionId)}
                        data={sessions || []}
                        rowKey={(s) => s.id}
                        emptyMessage="No sessions recorded yet."
                    />
                </div>
            )}

            {activeTab === 'funnels' && (
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                    <FunnelChart researchId={researchId} />
                </div>
            )}
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

type ClickRow = { x: number; y: number; count: number };

const clickColumns: DataTableColumn<ClickRow>[] = [
    { key: 'x', header: 'X', accessor: 'x' },
    { key: 'y', header: 'Y', accessor: 'y' },
    { key: 'count', header: 'Clicks', accessor: 'count', cellClassName: 'font-medium' },
];

const ClickDataTable = ({ clicks }: { clicks: ClickRow[] }) => {
    const top10 = clicks.slice(0, 10);
    if (top10.length === 0) return null;
    return (
        <div className="mt-4 text-left">
            <DataTable<ClickRow>
                columns={clickColumns}
                data={top10}
                rowKey={(_, i) => String(i)}
                size="compact"
            />
        </div>
    );
};

// ─── Column Definitions ──────────────────────────────────────────────

const sessionColumns = (onReplay: (id: string) => void): DataTableColumn<TrackingSession>[] => [
    {
        key: 'visitor',
        header: 'Visitor',
        render: (s) => <span className="font-mono text-gray-600">{s.visitorId.slice(0, 12)}</span>,
    },
    {
        key: 'page',
        header: 'Page',
        render: (s) => <span className="text-gray-700 max-w-[200px] truncate block">{shortenUrl(s.pageUrl)}</span>,
    },
    { key: 'events', header: 'Events', accessor: 'eventCount', align: 'right', sortable: true },
    {
        key: 'duration',
        header: 'Duration',
        align: 'right',
        render: (s) => (
            <span className="text-gray-500">
                {s.endedAt ? formatDuration(Math.round((new Date(s.endedAt).getTime() - new Date(s.startedAt).getTime()) / 1000)) : '-'}
            </span>
        ),
    },
    {
        key: 'date',
        header: 'Date',
        align: 'right',
        render: (s) => <span className="text-gray-400">{new Date(s.startedAt).toLocaleDateString()}</span>,
    },
    {
        key: 'replay',
        header: 'Replay',
        align: 'center',
        render: (s) => (
            <button
                onClick={(e) => { e.stopPropagation(); onReplay(s.id); }}
                className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600 transition-colors"
            >
                <PlayCircle className="h-4 w-4" />
            </button>
        ),
    },
];

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

const toCsv = (rows: Array<Record<string, unknown>>, columns: string[]): string => {
    const header = columns.join(',');
    const body = rows.map((row) =>
        columns.map((col) => {
            const val = row[col];
            if (val == null) return '';
            const str = String(val);
            return str.includes(',') || str.includes('"') || str.includes('\n')
                ? `"${str.replace(/"/g, '""')}"`
                : str;
        }).join(',')
    ).join('\n');
    return `${header}\n${body}`;
};

const downloadCsv = (csv: string, filename: string) => {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
};
