import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, MousePointerClick, Timer, LogOut, Loader2 } from 'lucide-react';
import * as trackingService from '../../../services/tracking.service';

interface Props {
    researchId: string;
}

const FRICTION_META: Record<string, { label: string; icon: typeof AlertTriangle; color: string; bg: string; description: string }> = {
    'rage-click': {
        label: 'Rage Clicks',
        icon: MousePointerClick,
        color: 'text-red-700',
        bg: 'bg-red-50 border-red-200',
        description: '3+ clicks in the same area within 1 second',
    },
    'dead-click': {
        label: 'Dead Clicks',
        icon: MousePointerClick,
        color: 'text-amber-700',
        bg: 'bg-amber-50 border-amber-200',
        description: 'Click on a non-interactive element',
    },
    'speed-browsing': {
        label: 'Speed Browsing',
        icon: Timer,
        color: 'text-blue-700',
        bg: 'bg-blue-50 border-blue-200',
        description: 'Page viewed for less than 2 seconds',
    },
    'mouse-out': {
        label: 'Mouse Out',
        icon: LogOut,
        color: 'text-gray-700',
        bg: 'bg-gray-50 border-gray-200',
        description: 'Cursor left the browser window',
    },
};

export function TrackingFrictionTab({ researchId }: Props) {
    const { data: summary, isLoading: loadingSummary } = useQuery({
        queryKey: ['tracking-friction', researchId],
        queryFn: () => trackingService.getFrictionSummary(researchId),
    });

    const { data: sessionData, isLoading: loadingSessions } = useQuery({
        queryKey: ['tracking-friction-sessions', researchId],
        queryFn: () => trackingService.getSessionFrictionTags(researchId),
    });

    const isLoading = loadingSummary || loadingSessions;
    const tags = summary?.tags ?? {};
    const sessionTags = sessionData?.sessionTags ?? {};
    const totalEvents = Object.values(tags).reduce((a, b) => a + b, 0);
    const sessionCount = Object.keys(sessionTags).length;
    const affectedRate = sessionCount > 0
        ? Math.round((Object.values(sessionTags).filter(t => t.length > 0).length / sessionCount) * 100)
        : 0;

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-20 text-gray-400">
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                Loading friction data...
            </div>
        );
    }

    if (totalEvents === 0) {
        return (
            <div className="text-center py-20">
                <AlertTriangle className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-500">No friction events detected yet.</p>
                <p className="text-xs text-gray-400 mt-1">Friction events are captured automatically when visitors interact with your site.</p>
            </div>
        );
    }

    const sorted = Object.entries(tags).sort(([, a], [, b]) => b - a);
    const maxCount = Math.max(...Object.values(tags), 1);

    return (
        <div className="space-y-5">
            {/* Summary cards */}
            <div className="flex gap-3">
                <div className="flex-1 bg-white border border-gray-200 rounded-xl p-4 text-center">
                    <p className="text-2xl font-bold text-gray-900">{totalEvents}</p>
                    <p className="text-[11px] text-gray-500">Total friction events</p>
                </div>
                <div className="flex-1 bg-white border border-gray-200 rounded-xl p-4 text-center">
                    <p className="text-2xl font-bold text-gray-900">{sorted.length}</p>
                    <p className="text-[11px] text-gray-500">Friction types</p>
                </div>
                <div className="flex-1 bg-white border border-gray-200 rounded-xl p-4 text-center">
                    <p className="text-2xl font-bold text-gray-900">{affectedRate}%</p>
                    <p className="text-[11px] text-gray-500">Sessions affected</p>
                </div>
            </div>

            {/* Friction breakdown */}
            <div className="bg-white border border-gray-200 rounded-xl p-5">
                <h3 className="text-sm font-semibold text-gray-900 mb-4">Friction Breakdown</h3>
                <div className="space-y-3">
                    {sorted.map(([tag, count]) => {
                        const meta = FRICTION_META[tag] ?? {
                            label: tag,
                            icon: AlertTriangle,
                            color: 'text-gray-700',
                            bg: 'bg-gray-50 border-gray-200',
                            description: '',
                        };
                        const Icon = meta.icon;
                        const pct = Math.round((count / maxCount) * 100);

                        return (
                            <div key={tag} className={`flex items-center gap-3 p-3 rounded-lg border ${meta.bg}`}>
                                <Icon className={`h-4 w-4 flex-shrink-0 ${meta.color}`} />
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className={`text-sm font-medium ${meta.color}`}>{meta.label}</span>
                                        <span className="text-sm font-bold text-gray-900">{count}</span>
                                    </div>
                                    {meta.description && (
                                        <p className="text-[11px] text-gray-500 mb-1.5">{meta.description}</p>
                                    )}
                                    <div className="h-1.5 bg-white/60 rounded-full overflow-hidden">
                                        <div
                                            className="h-full rounded-full transition-all duration-500"
                                            style={{
                                                width: `${pct}%`,
                                                backgroundColor: tag === 'rage-click' ? '#dc2626'
                                                    : tag === 'dead-click' ? '#d97706'
                                                    : tag === 'speed-browsing' ? '#2563eb'
                                                    : '#6b7280',
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Sessions with friction */}
            {Object.keys(sessionTags).length > 0 && (
                <div className="bg-white border border-gray-200 rounded-xl p-5">
                    <h3 className="text-sm font-semibold text-gray-900 mb-3">
                        Sessions with Friction
                        <span className="text-xs text-gray-400 font-normal ml-2">
                            {Object.values(sessionTags).filter(t => t.length > 0).length} of {Object.keys(sessionTags).length}
                        </span>
                    </h3>
                    <div className="space-y-1.5 max-h-64 overflow-y-auto">
                        {Object.entries(sessionTags)
                            .filter(([, t]) => t.length > 0)
                            .map(([sessionId, frictionTags]) => (
                                <div key={sessionId} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50 transition-colors">
                                    <span className="text-xs text-gray-600 font-mono truncate max-w-48">{sessionId.substring(0, 12)}...</span>
                                    <div className="flex gap-1">
                                        {frictionTags.map(tag => {
                                            const meta = FRICTION_META[tag];
                                            return (
                                                <span
                                                    key={tag}
                                                    className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${meta?.bg ?? 'bg-gray-100'} ${meta?.color ?? 'text-gray-600'}`}
                                                >
                                                    {meta?.label ?? tag}
                                                </span>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                    </div>
                </div>
            )}
        </div>
    );
}
