import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, MousePointerClick, Timer, LogOut, Loader2, ChevronDown, ChevronRight } from 'lucide-react';
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

    const [expandedTypes, setExpandedTypes] = useState<Set<string>>(new Set());

    const isLoading = loadingSummary || loadingSessions;
    const tags = summary?.tags ?? {};
    const topElements = summary?.topElements ?? {};
    const sessionTags = sessionData?.sessionTags ?? {};
    const frictionSessions = sessionData?.sessions ?? Object.entries(sessionTags)
        .filter(([, t]) => t.length > 0)
        .map(([sessionId, t]) => ({ sessionId, visitorId: sessionId, tags: t, count: t.length }));
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

    const topFriction = sorted[0];
    const topMeta = topFriction ? FRICTION_META[topFriction[0]] : null;
    const TopIcon = topMeta?.icon ?? AlertTriangle;
    const affectedCount = Object.values(sessionTags).filter(t => t.length > 0).length;

    return (
        <div className="space-y-5">
            {/* Summary cards */}
            <div className="flex gap-3">
                <div className="flex-1 bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0">
                        <AlertTriangle className="h-5 w-5 text-amber-600" />
                    </div>
                    <div>
                        <p className="text-2xl font-bold text-gray-900">{totalEvents}</p>
                        <p className="text-[11px] text-gray-500">Friction events across {sorted.length} {sorted.length === 1 ? 'type' : 'types'}</p>
                    </div>
                </div>
                <div className={`flex-1 border rounded-xl p-4 flex items-center gap-3 ${topMeta?.bg ?? 'bg-white border-gray-200'}`}>
                    <div className="w-10 h-10 rounded-lg bg-white/60 flex items-center justify-center flex-shrink-0">
                        <TopIcon className={`h-5 w-5 ${topMeta?.color ?? 'text-gray-600'}`} />
                    </div>
                    <div>
                        <p className={`text-sm font-semibold ${topMeta?.color ?? 'text-gray-700'}`}>{topMeta?.label ?? topFriction?.[0] ?? '—'}</p>
                        <p className="text-[11px] text-gray-500">{topFriction ? `${topFriction[1]} events — most common` : 'No data'}</p>
                    </div>
                </div>
                <div className="flex-1 bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-bold text-red-600">{affectedRate}%</span>
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-gray-900">{affectedCount} of {sessionCount} sessions</p>
                        <p className="text-[11px] text-gray-500">experienced friction</p>
                    </div>
                </div>
            </div>

            {/* Friction breakdown + sessions side by side */}
            <div className="flex gap-5 items-stretch">
            <div className="flex-1 bg-white border border-gray-200 rounded-xl p-5">
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
                        const elements = topElements[tag] ?? [];
                        const isExpanded = expandedTypes.has(tag);
                        const barColor = tag === 'rage-click' ? '#dc2626'
                            : tag === 'dead-click' ? '#d97706'
                            : tag === 'speed-browsing' ? '#2563eb'
                            : '#6b7280';

                        return (
                            <div key={tag} className={`rounded-lg border ${meta.bg} overflow-hidden`}>
                                <button
                                    type="button"
                                    className="w-full flex items-center gap-3 p-3 text-left"
                                    onClick={() => setExpandedTypes(prev => {
                                        const next = new Set(prev);
                                        if (next.has(tag)) next.delete(tag); else next.add(tag);
                                        return next;
                                    })}
                                >
                                    {elements.length > 0
                                        ? (isExpanded
                                            ? <ChevronDown className={`h-4 w-4 flex-shrink-0 ${meta.color}`} />
                                            : <ChevronRight className={`h-4 w-4 flex-shrink-0 ${meta.color}`} />)
                                        : <Icon className={`h-4 w-4 flex-shrink-0 ${meta.color}`} />
                                    }
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between mb-1">
                                            <span className={`text-sm font-medium ${meta.color}`}>
                                                {meta.label}
                                                {elements.length > 0 && (
                                                    <span className="text-[11px] font-normal text-gray-400 ml-2">
                                                        {elements.length} {elements.length === 1 ? 'element' : 'elements'}
                                                    </span>
                                                )}
                                            </span>
                                            <span className="text-sm font-bold text-gray-900">{count}</span>
                                        </div>
                                        {meta.description && (
                                            <p className="text-[11px] text-gray-500 mb-1.5">{meta.description}</p>
                                        )}
                                        <div className="h-1.5 bg-white/60 rounded-full overflow-hidden">
                                            <div
                                                className="h-full rounded-full transition-all duration-500"
                                                style={{ width: `${pct}%`, backgroundColor: barColor }}
                                            />
                                        </div>
                                    </div>
                                </button>

                                {isExpanded && elements.length > 0 && (
                                    <div className="px-3 pb-3 space-y-1.5">
                                        {elements.map((el, i) => {
                                            const elPct = Math.round((el.count / count) * 100);
                                            const displayText = el.text
                                                ? el.text.replace(/\n/g, ' ').trim().substring(0, 60) + (el.text.length > 60 ? '...' : '')
                                                : el.selector.split(' > ').pop() ?? el.selector;
                                            return (
                                                <div key={i} className="flex items-center gap-2 py-1.5 px-2 rounded bg-white/50">
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-xs text-gray-700 truncate" title={el.text || el.selector}>
                                                            {displayText}
                                                        </p>
                                                        <p className="text-[10px] text-gray-400 font-mono truncate" title={el.selector}>
                                                            {el.selector.split(' > ').slice(-2).join(' > ')}
                                                        </p>
                                                    </div>
                                                    <div className="flex items-center gap-2 flex-shrink-0">
                                                        <div className="w-16 h-1 bg-gray-200 rounded-full overflow-hidden">
                                                            <div
                                                                className="h-full rounded-full"
                                                                style={{ width: `${elPct}%`, backgroundColor: barColor }}
                                                            />
                                                        </div>
                                                        <span className="text-[11px] font-medium text-gray-600 w-6 text-right">{el.count}</span>
                                                    </div>
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

            {frictionSessions.length > 0 && (
                <div className="flex-1 bg-white border border-gray-200 rounded-xl p-5">
                    <h3 className="text-sm font-semibold text-gray-900 mb-3">
                        Sessions with Friction
                        <span className="text-xs text-gray-400 font-normal ml-2">
                            {frictionSessions.length} of {sessionCount}
                        </span>
                    </h3>
                    <div className="space-y-1.5 max-h-80 overflow-y-auto">
                        {frictionSessions.map(session => (
                            <div key={session.sessionId} className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-gray-50 transition-colors">
                                <div className="flex items-center gap-2.5 min-w-0">
                                    <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                                        <span className="text-[10px] font-semibold text-slate-500">
                                            {friendlyVisitorName(session.visitorId).charAt(0)}
                                        </span>
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-xs font-medium text-gray-700">{friendlyVisitorName(session.visitorId)}</p>
                                        <p className="text-[10px] text-gray-400">{session.count} friction {session.count === 1 ? 'event' : 'events'}</p>
                                    </div>
                                </div>
                                <div className="flex gap-1 flex-shrink-0">
                                    {session.tags.map(tag => {
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
        </div>
    );
}

const ANIMALS = ['Fox', 'Owl', 'Bear', 'Wolf', 'Hawk', 'Deer', 'Lion', 'Lynx', 'Crow', 'Seal',
    'Hare', 'Dove', 'Frog', 'Wren', 'Puma', 'Ibis', 'Yak', 'Newt', 'Moth', 'Kite',
    'Swan', 'Mole', 'Crab', 'Lark', 'Pike', 'Ram', 'Orca', 'Bee', 'Jay', 'Asp'];
const COLORS = ['Blue', 'Red', 'Jade', 'Gold', 'Teal', 'Mint', 'Rose', 'Plum', 'Sage', 'Coral',
    'Amber', 'Ruby', 'Lime', 'Sky', 'Sand', 'Aqua', 'Dusk', 'Fern', 'Rust', 'Snow'];

function friendlyVisitorName(visitorId: string): string {
    let hash = 0;
    for (let i = 0; i < visitorId.length; i++) {
        hash = ((hash << 5) - hash + visitorId.charCodeAt(i)) | 0;
    }
    const h = Math.abs(hash);
    return `${COLORS[h % COLORS.length]} ${ANIMALS[(h >>> 8) % ANIMALS.length]}`;
}
