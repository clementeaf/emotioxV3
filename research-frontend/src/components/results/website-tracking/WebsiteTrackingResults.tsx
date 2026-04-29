/**
 * Website Tracking Results
 * Tabbed view: Click Heatmap, Scroll Depth, Session Replay, Funnels.
 * Overview metrics + export + page selector.
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
    MousePointerClick, Users, Globe, Activity, Clock, ExternalLink,
    Download, ArrowDownUp, PlayCircle, TrendingDown, Eye,
} from 'lucide-react';
import * as trackingService from '../../../services/tracking.service';
import type { TrackingSession } from '../../../services/tracking.service';
import { DataTable, type DataTableColumn } from '../../ui/DataTable';
import { StatCard } from '../../ui/StatCard';
import { EmptyState } from '../../ui/EmptyState';
import { ScrollDepthChart } from './ScrollDepthChart';
import { PageSnapshotHeatmap } from './PageSnapshotHeatmap';
import { SessionReplayPlayer } from './SessionReplayPlayer';
import { FunnelChart } from './FunnelChart';

type ResultTab = 'heatmaps' | 'sessions' | 'visitors' | 'live' | 'funnels';
type HeatmapSubTab = 'click' | 'scroll' | 'attention';

interface WebsiteTrackingResultsProps {
    researchId: string;
}

export const WebsiteTrackingResults = ({ researchId }: WebsiteTrackingResultsProps) => {
    const [activeTab, setActiveTab] = useState<ResultTab>('heatmaps');
    const [heatmapSubTab, setHeatmapSubTab] = useState<HeatmapSubTab>('click');
    const [selectedPageUrl, setSelectedPageUrl] = useState<string | undefined>();
    const [deviceFilter, setDeviceFilter] = useState<'all' | 'mobile' | 'tablet' | 'desktop'>('all');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [exporting, setExporting] = useState(false);
    const [replaySessionId, setReplaySessionId] = useState<string | null>(null);

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
        queryKey: ['tracking', researchId, 'overview', dateFrom, dateTo],
        queryFn: () => trackingService.getOverview(researchId, dateFrom || undefined, dateTo || undefined),
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

    // Friction tags per session
    const { data: frictionData } = useQuery({
        queryKey: ['tracking', researchId, 'friction-sessions'],
        queryFn: () => trackingService.getSessionFrictionTags(researchId),
        staleTime: 10_000,
        enabled: activeTab === 'sessions',
    });

    // Auto-select first page
    useEffect(() => {
        if (pages && pages.length > 0 && !selectedPageUrl) {
            setSelectedPageUrl(pages[0].pageUrl);
        }
    }, [pages, selectedPageUrl]);

    const selectedPage = useMemo(
        () => pages?.find((p) => p.pageUrl === selectedPageUrl),
        [pages, selectedPageUrl]
    );

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
            <EmptyState
                icon={<MousePointerClick className="h-12 w-12" />}
                title="No tracking data yet"
                description="Install the tracking script on your website and wait for visitors to start interacting."
                className="py-20"
            />
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
        { id: 'heatmaps', label: 'Heatmaps', icon: <MousePointerClick className="h-4 w-4" /> },
        { id: 'visitors', label: 'Visitors', icon: <Users className="h-4 w-4" /> },
        { id: 'sessions', label: 'Sessions', icon: <PlayCircle className="h-4 w-4" /> },
        { id: 'live', label: 'Live', icon: <Activity className="h-4 w-4" /> },
        { id: 'funnels', label: 'Funnels', icon: <TrendingDown className="h-4 w-4" /> },
    ];

    return (
        <div className="space-y-6">
            {/* Date range + Overview Cards */}
            <div className="flex items-center gap-3 mb-1">
                <span className="text-[10px] font-semibold text-gray-400 uppercase">Period</span>
                <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="px-2 py-1 text-[11px] border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 outline-none"
                />
                <span className="text-[10px] text-gray-400">to</span>
                <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="px-2 py-1 text-[11px] border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 outline-none"
                />
                {(dateFrom || dateTo) && (
                    <button
                        onClick={() => { setDateFrom(''); setDateTo(''); }}
                        className="text-[10px] text-blue-600 hover:text-blue-800"
                    >
                        Clear
                    </button>
                )}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                <StatCard icon={<Users className="h-5 w-5" />} label="Unique Visitors" value={overview.uniqueVisitors} />
                <StatCard icon={<Activity className="h-5 w-5" />} label="Total Sessions" value={overview.totalSessions} />
                <StatCard icon={<Globe className="h-5 w-5" />} label="Pages Tracked" value={overview.pagesTracked} />
                <StatCard icon={<MousePointerClick className="h-5 w-5" />} label="Total Events" value={overview.totalEvents.toLocaleString()} />
                <StatCard icon={<Clock className="h-5 w-5" />} label="Avg. Duration" value={formatDuration(overview.avgSessionDuration)} />
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
            {activeTab === 'heatmaps' && (
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    {/* Page metrics table */}
                    <div className="border-b border-gray-200">
                        <table className="w-full text-xs">
                            <thead>
                                <tr className="border-b border-gray-100 text-[10px] text-gray-400 uppercase">
                                    <th className="text-left px-4 py-2 font-medium">Page</th>
                                    <th className="text-right px-2 py-2 font-medium">Views</th>
                                    <th className="text-right px-2 py-2 font-medium">Clicks</th>
                                    <th className="text-right px-2 py-2 font-medium">Snapshot</th>
                                </tr>
                            </thead>
                            <tbody>
                                {pages?.map((page) => (
                                    <tr
                                        key={page.id}
                                        onClick={() => setSelectedPageUrl(page.pageUrl)}
                                        className={`cursor-pointer border-b border-gray-50 transition-colors ${
                                            selectedPageUrl === page.pageUrl
                                                ? 'bg-blue-50'
                                                : 'hover:bg-gray-50'
                                        }`}
                                    >
                                        <td className="px-4 py-2">
                                            <span className={`truncate block max-w-[300px] ${selectedPageUrl === page.pageUrl ? 'text-blue-700 font-medium' : 'text-slate-700'}`}>
                                                {page.pageTitle || shortenUrl(page.pageUrl)}
                                            </span>
                                        </td>
                                        <td className="text-right px-2 py-2 text-gray-600">{page.sessionCount}</td>
                                        <td className="text-right px-2 py-2 text-gray-600">{page.eventCount}</td>
                                        <td className="text-right px-2 py-2">
                                            {page.hasSnapshot ? (
                                                <span className="text-green-500 text-[10px]">&#x25CF;</span>
                                            ) : (
                                                <span className="text-gray-300 text-[10px]">&#x25CB;</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Heatmap sub-tabs: Click / Scroll / Attention */}
                    <div className="border-b border-gray-200 px-4 py-2 flex items-center gap-1">
                        {([
                            { id: 'click' as const, label: 'Click', icon: <MousePointerClick className="h-3.5 w-3.5" /> },
                            { id: 'scroll' as const, label: 'Scroll', icon: <ArrowDownUp className="h-3.5 w-3.5" /> },
                            { id: 'attention' as const, label: 'Attention', icon: <Eye className="h-3.5 w-3.5" /> },
                        ]).map((sub) => (
                            <button
                                key={sub.id}
                                onClick={() => setHeatmapSubTab(sub.id)}
                                className={`flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg transition-colors ${
                                    heatmapSubTab === sub.id
                                        ? 'bg-slate-900 text-white font-medium'
                                        : 'text-gray-600 hover:bg-gray-100'
                                }`}
                            >
                                {sub.icon}
                                {sub.label}
                            </button>
                        ))}

                        <div className="flex-1" />

                        {/* Device filter */}
                        <div className="flex gap-1">
                            {(['all', 'desktop', 'tablet', 'mobile'] as const).map((d) => (
                                <button
                                    key={d}
                                    onClick={() => setDeviceFilter(d)}
                                    className={`px-2 py-1 text-xs rounded transition-colors ${
                                        deviceFilter === d
                                            ? 'bg-blue-100 text-blue-700 font-medium'
                                            : 'text-slate-500 hover:bg-slate-100'
                                    }`}
                                >
                                    {d === 'all' ? 'All' : d.charAt(0).toUpperCase() + d.slice(1)}
                                </button>
                            ))}
                        </div>

                        {selectedPage && (
                            <a href={selectedPage.pageUrl} target="_blank" rel="noopener noreferrer"
                                className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 ml-2">
                                Visit page <ExternalLink className="h-3 w-3" />
                            </a>
                        )}
                    </div>

                    {/* Heatmap content */}
                    <div className="p-4">
                        {heatmapSubTab === 'click' && selectedPageUrl && (
                            <PageSnapshotHeatmap
                                researchId={researchId}
                                pageUrl={selectedPageUrl}
                                heatmapType="click"
                                device={deviceFilter === 'all' ? undefined : deviceFilter}
                            />
                        )}
                        {heatmapSubTab === 'click' && !selectedPageUrl && (
                            <div className="flex flex-col items-center justify-center py-16 text-center">
                                <MousePointerClick className="h-8 w-8 text-gray-300 mb-3" />
                                <p className="text-sm text-gray-500">Select a page above to view the click heatmap.</p>
                            </div>
                        )}

                        {heatmapSubTab === 'scroll' && (
                            <ScrollDepthChart researchId={researchId} pageUrl={selectedPageUrl} />
                        )}

                        {heatmapSubTab === 'attention' && selectedPageUrl && (
                            <PageSnapshotHeatmap
                                researchId={researchId}
                                pageUrl={selectedPageUrl}
                                heatmapType="attention"
                                device={deviceFilter === 'all' ? undefined : deviceFilter}
                            />
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'visitors' && (
                <VisitorJourneysTab researchId={researchId} onReplay={setReplaySessionId} />
            )}

            {activeTab === 'sessions' && (
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                    <h3 className="text-sm font-semibold text-slate-800 mb-4">
                        Sessions
                        <span className="ml-2 text-xs font-normal text-gray-500">Click to replay</span>
                    </h3>
                    <DataTable<TrackingSession>
                        columns={sessionColumns(setReplaySessionId, frictionData?.sessionTags)}
                        data={sessions || []}
                        rowKey={(s) => s.id}
                        emptyMessage="No sessions recorded yet."
                    />
                </div>
            )}

            {activeTab === 'live' && (
                <LiveSessionsTab researchId={researchId} />
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

// ─── Column Definitions ──────────────────────────────────────────────

const FRICTION_COLORS: Record<string, string> = {
    'dead-click': 'bg-amber-100 text-amber-700',
    'rage-click': 'bg-red-100 text-red-700',
    'speed-browsing': 'bg-blue-100 text-blue-700',
    'mouse-out': 'bg-gray-200 text-gray-600',
};

const sessionColumns = (onReplay: (id: string) => void, frictionTags?: Record<string, string[]>): DataTableColumn<TrackingSession>[] => [
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
        key: 'friction',
        header: 'Friction',
        render: (s) => {
            const tags = frictionTags?.[s.id] || [];
            if (tags.length === 0) return null;
            return (
                <div className="flex flex-wrap gap-1">
                    {tags.map((tag) => (
                        <span key={tag} className={`px-1.5 py-0.5 text-[10px] rounded-full ${FRICTION_COLORS[tag] || 'bg-gray-100 text-gray-500'}`}>
                            {tag}
                        </span>
                    ))}
                </div>
            );
        },
    },
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

const formatMs = (ms: number): string => {
    if (ms < 1000) return `${ms}ms`;
    const s = Math.round(ms / 1000);
    if (s < 60) return `${s}s`;
    const m = Math.floor(s / 60);
    return `${m}m ${s % 60}s`;
};

const getDeviceIcon = (vw: number) => {
    if (vw < 768) return '📱';
    if (vw <= 1024) return '📱';
    return '🖥️';
};

// ─── Visitor Journeys Tab ───────────────────────────────────────────

const VisitorJourneysTab = ({ researchId, onReplay }: { researchId: string; onReplay: (id: string) => void }) => {
    const [expandedVisitor, setExpandedVisitor] = useState<string | null>(null);

    const { data, isLoading } = useQuery({
        queryKey: ['tracking', researchId, 'visitors'],
        queryFn: () => trackingService.getVisitorJourneys(researchId, 20, 0),
        staleTime: 10_000,
    });

    if (isLoading) return <div className="h-64 bg-gray-100 rounded-xl animate-pulse" />;

    const visitors = data?.visitors || [];

    if (visitors.length === 0) {
        return (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                <Users className="h-8 w-8 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-500">No visitor data yet.</p>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100">
                <h3 className="text-sm font-semibold text-slate-800">
                    Visitors
                    <span className="ml-2 text-xs font-normal text-gray-500">{data?.totalVisitors} total</span>
                </h3>
            </div>
            <div className="divide-y divide-gray-100">
                {visitors.map((visitor) => {
                    const expanded = expandedVisitor === visitor.visitorId;
                    return (
                        <div key={visitor.visitorId}>
                            {/* Visitor row */}
                            <button
                                onClick={() => setExpandedVisitor(expanded ? null : visitor.visitorId)}
                                className="w-full px-5 py-3 flex items-center gap-4 text-left hover:bg-gray-50 transition-colors"
                            >
                                <span className="text-lg">{getDeviceIcon(visitor.viewportWidth)}</span>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-slate-800 truncate">
                                        {visitor.visitorId.slice(0, 12)}...
                                    </p>
                                    <p className="text-xs text-gray-500 truncate">
                                        Entry: {shortenUrl(visitor.entryPage)}
                                    </p>
                                </div>
                                <div className="text-right shrink-0">
                                    <p className="text-xs text-gray-500">{visitor.sessionCount} page{visitor.sessionCount !== 1 ? 's' : ''}</p>
                                    <p className="text-xs text-gray-400">{formatMs(visitor.totalDurationMs)}</p>
                                </div>
                                <span className={`text-gray-400 transition-transform ${expanded ? 'rotate-90' : ''}`}>▸</span>
                            </button>

                            {/* Page breakdown */}
                            {expanded && (
                                <div className="bg-gray-50 border-t border-gray-100">
                                    <div className="px-5 py-2 grid grid-cols-[auto_1fr_1fr_auto_auto_auto] gap-x-4 text-[10px] font-medium text-gray-400 uppercase tracking-wider">
                                        <span>#</span><span>URL</span><span>Timeline</span><span>Duration</span><span>Events</span><span />
                                    </div>
                                    {visitor.pages.map((page) => {
                                        const maxDur = Math.max(...visitor.pages.map(p => p.durationMs), 1);
                                        const barPct = (page.durationMs / maxDur) * 100;
                                        return (
                                            <div
                                                key={page.sessionId}
                                                className="px-5 py-2 grid grid-cols-[auto_1fr_1fr_auto_auto_auto] gap-x-4 items-center border-t border-gray-100 text-xs"
                                            >
                                                <span className="text-gray-400 font-mono">#{page.index}</span>
                                                <span className="text-slate-700 truncate" title={page.pageUrl}>
                                                    {shortenUrl(page.pageUrl)}
                                                </span>
                                                <div className="flex items-center gap-2">
                                                    <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                                                        <div
                                                            className={`h-full rounded-full ${page.clickCount > 0 ? 'bg-red-400' : 'bg-blue-400'}`}
                                                            style={{ width: `${Math.max(2, barPct)}%` }}
                                                        />
                                                    </div>
                                                </div>
                                                <span className="text-gray-600 font-mono w-14 text-right">{formatMs(page.durationMs)}</span>
                                                <span className="text-gray-500 w-10 text-right">{page.eventCount}</span>
                                                <button
                                                    onClick={() => onReplay(page.sessionId)}
                                                    className="p-1 rounded hover:bg-blue-50 text-blue-600"
                                                    title="Replay this page"
                                                >
                                                    <PlayCircle className="h-3.5 w-3.5" />
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

// ─── Live Sessions Tab ──────────────────────────────────────────────

const LiveSessionsTab = ({ researchId }: { researchId: string }) => {
    const { data, isLoading, dataUpdatedAt } = useQuery({
        queryKey: ['tracking', researchId, 'live'],
        queryFn: () => trackingService.getLiveSessions(researchId),
        refetchInterval: 5000,
    });

    const sessions = data?.sessions || [];

    if (isLoading) return <div className="h-64 bg-gray-100 rounded-xl animate-pulse" />;

    return (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                    <span className="relative flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
                    </span>
                    Live Sessions
                    <span className="text-xs font-normal text-gray-500">{sessions.length} active</span>
                </h3>
                <span className="text-[10px] text-gray-400">Refreshes every 5s</span>
            </div>

            {sessions.length === 0 ? (
                <div className="px-5 py-12 text-center">
                    <Activity className="h-8 w-8 text-gray-300 mx-auto mb-3" />
                    <p className="text-sm text-gray-500">No active sessions right now.</p>
                    <p className="text-xs text-gray-400 mt-1">Sessions appear here when someone visits the tracked site.</p>
                </div>
            ) : (
                <div className="divide-y divide-gray-100">
                    {sessions.map((visitor) => {
                        const totalEvents = visitor.pages.reduce((sum, p) => sum + p.eventCount, 0);
                        const timeSinceStart = dataUpdatedAt > 0 ? dataUpdatedAt - new Date(visitor.firstSeen).getTime() : 0;
                        return (
                            <div key={visitor.visitorId} className="px-5 py-3 flex items-center gap-4">
                                <span className="text-lg">{getDeviceIcon(visitor.viewportWidth)}</span>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-slate-800 truncate">
                                        {visitor.visitorId.slice(0, 12)}...
                                    </p>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        {visitor.pages.map((page, i) => (
                                            <span key={i} className="text-[10px] text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded truncate max-w-[120px]">
                                                {shortenUrl(page.pageUrl)}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                                <div className="text-right shrink-0 space-y-0.5">
                                    <p className="text-xs text-gray-500">{visitor.pages.length} page{visitor.pages.length !== 1 ? 's' : ''} · {totalEvents} events</p>
                                    <p className="text-xs text-gray-400">{formatMs(timeSinceStart)} ago</p>
                                </div>
                                <span className="relative flex h-2 w-2 shrink-0">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                                </span>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};
