import { useEffect, useMemo, useState } from 'react';
import { Drawer } from '../ui/Drawer';
import { researchService, type ResearchDetail } from '../../services/research.service';
import {
    Clock3,
    Layers,
    LayoutGrid,
    Users,
    MessageSquare,
    CircleDot,
    Play,
    CheckCircle2,
    Plus,
    Pencil,
    Inbox,
    ChevronDown,
    ChevronRight,
} from 'lucide-react';

interface ResearchDetailDrawerProps {
    researchId: string | null;
    onClose: () => void;
}

type Tab = 'overview' | 'stages' | 'timeline';

const formatDate = (date: string | null) => {
    if (!date) return '—';
    return new Date(date).toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
};

const formatShortDate = (date: string | null) => {
    if (!date) return '—';
    return new Date(date).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
};

const statusColors: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-700',
    active: 'bg-green-50 text-green-700',
    paused: 'bg-yellow-50 text-yellow-700',
    completed: 'bg-blue-50 text-blue-700',
    archived: 'bg-slate-100 text-slate-600',
};

const timelineIcons: Record<string, typeof CircleDot> = {
    research_created: CircleDot,
    research_started: Play,
    research_completed: CheckCircle2,
    stage_added: Layers,
    module_added: Plus,
    module_updated: Pencil,
    first_response: Inbox,
    last_response: MessageSquare,
};

const timelineColors: Record<string, string> = {
    research_created: 'text-blue-500',
    research_started: 'text-green-500',
    research_completed: 'text-indigo-500',
    stage_added: 'text-purple-500',
    module_added: 'text-sky-500',
    module_updated: 'text-amber-500',
    first_response: 'text-emerald-500',
    last_response: 'text-teal-500',
};

const tabs: Array<{ key: Tab; label: string }> = [
    { key: 'overview', label: 'Overview' },
    { key: 'stages', label: 'Stages' },
    { key: 'timeline', label: 'Timeline' },
];

export const ResearchDetailDrawer = ({ researchId, onClose }: ResearchDetailDrawerProps) => {
    const [detail, setDetail] = useState<ResearchDetail | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<Tab>('overview');
    const [expandedStages, setExpandedStages] = useState<Set<string>>(new Set());

    useEffect(() => {
        if (!researchId) {
            setDetail(null);
            return;
        }
        setIsLoading(true);
        setError(null);
        setActiveTab('overview');
        setExpandedStages(new Set());
        researchService
            .getDetail(researchId)
            .then(setDetail)
            .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load detail'))
            .finally(() => setIsLoading(false));
    }, [researchId]);

    type ModuleItem = ResearchDetail['modules'][number];
    const modulesByStage = useMemo(() => {
        if (!detail) return new Map<string, ModuleItem[]>();
        const map = new Map<string, ModuleItem[]>();
        for (const mod of detail.modules) {
            const stageModules = map.get(mod.stageName || '__none__') || [];
            stageModules.push(mod);
            map.set(mod.stageName || '__none__', stageModules);
        }
        return map;
    }, [detail]);

    const toggleStage = (stageId: string) => {
        setExpandedStages((prev) => {
            const next = new Set(prev);
            if (next.has(stageId)) {
                next.delete(stageId);
            } else {
                next.add(stageId);
            }
            return next;
        });
    };

    return (
        <Drawer
            isOpen={!!researchId}
            onClose={onClose}
            title="Research Detail"
            width="lg"
        >
            {isLoading ? (
                <div className="space-y-6">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="animate-pulse">
                            <div className="h-4 w-1/3 bg-gray-200 rounded mb-3" />
                            <div className="h-3 w-full bg-gray-100 rounded mb-2" />
                            <div className="h-3 w-2/3 bg-gray-100 rounded" />
                        </div>
                    ))}
                </div>
            ) : error ? (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-sm text-red-600">{error}</p>
                </div>
            ) : detail ? (
                <div className="space-y-4">
                    {/* Tabs */}
                    <div className="flex border-b border-gray-200">
                        {tabs.map((tab) => (
                            <button
                                key={tab.key}
                                onClick={() => setActiveTab(tab.key)}
                                className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                                    activeTab === tab.key
                                        ? 'border-blue-500 text-blue-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                            >
                                {tab.label}
                                {tab.key === 'stages' && (
                                    <span className="ml-1.5 text-xs text-gray-400">{detail.stages.length}</span>
                                )}
                                {tab.key === 'timeline' && (
                                    <span className="ml-1.5 text-xs text-gray-400">{detail.timeline.length}</span>
                                )}
                            </button>
                        ))}
                    </div>

                    {/* Tab: Overview */}
                    {activeTab === 'overview' && (
                        <div className="space-y-5">
                            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-base font-medium text-gray-900">{detail.research.name}</span>
                                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[detail.research.status] || 'bg-gray-100 text-gray-700'}`}>
                                        {detail.research.status}
                                    </span>
                                </div>
                                {detail.research.technique && (
                                    <p className="text-sm text-gray-500">Technique: {detail.research.technique}</p>
                                )}
                                <p className="text-sm text-gray-500">
                                    Created by {detail.research.creator || detail.research.creatorEmail || 'Unknown'}
                                </p>
                                <div className="grid grid-cols-2 gap-3 pt-2 text-xs text-gray-500">
                                    <div><span className="font-medium text-gray-700">Created:</span> {formatDate(detail.research.createdAt)}</div>
                                    <div><span className="font-medium text-gray-700">Updated:</span> {formatDate(detail.research.updatedAt)}</div>
                                    {detail.research.startedAt && (
                                        <div><span className="font-medium text-gray-700">Started:</span> {formatDate(detail.research.startedAt)}</div>
                                    )}
                                    {detail.research.completedAt && (
                                        <div><span className="font-medium text-gray-700">Completed:</span> {formatDate(detail.research.completedAt)}</div>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-4 gap-3">
                                <StatCard icon={Layers} label="Stages" value={detail.stages.length} />
                                <StatCard icon={LayoutGrid} label="Modules" value={detail.modules.length} />
                                <StatCard icon={Users} label="Participants" value={detail.responseStats.uniqueParticipants} />
                                <StatCard icon={MessageSquare} label="Responses" value={detail.responseStats.total} />
                            </div>

                            {detail.responseStats.firstResponse && (
                                <div className="bg-gray-50 rounded-lg p-4 text-xs text-gray-500 space-y-1">
                                    <div><span className="font-medium text-gray-700">First response:</span> {formatDate(detail.responseStats.firstResponse)}</div>
                                    {detail.responseStats.lastResponse && detail.responseStats.lastResponse !== detail.responseStats.firstResponse && (
                                        <div><span className="font-medium text-gray-700">Last response:</span> {formatDate(detail.responseStats.lastResponse)}</div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Tab: Stages */}
                    {activeTab === 'stages' && (
                        <div className="space-y-2">
                            {detail.stages.length === 0 ? (
                                <p className="text-sm text-gray-500 text-center py-8">No stages yet.</p>
                            ) : (
                                detail.stages.map((stage) => {
                                    const stageModules = modulesByStage.get(stage.name) || [];
                                    const isExpanded = expandedStages.has(stage.id);
                                    return (
                                        <div key={stage.id} className="border border-gray-200 rounded-lg overflow-hidden">
                                            <button
                                                onClick={() => toggleStage(stage.id)}
                                                className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
                                            >
                                                <div className="flex items-center gap-2">
                                                    {isExpanded
                                                        ? <ChevronDown className="h-4 w-4 text-gray-400" />
                                                        : <ChevronRight className="h-4 w-4 text-gray-400" />
                                                    }
                                                    <Layers className="h-4 w-4 text-purple-500" />
                                                    <span className="text-sm font-medium text-gray-900">{stage.name}</span>
                                                    <span className="text-xs text-gray-400 ml-1">
                                                        {stage.moduleCount} module{stage.moduleCount !== 1 ? 's' : ''}
                                                    </span>
                                                </div>
                                                <span className="text-xs text-gray-500">{formatShortDate(stage.createdAt)}</span>
                                            </button>

                                            {isExpanded && stageModules.length > 0 && (
                                                <div className="divide-y divide-gray-100">
                                                    {stageModules.map((mod) => (
                                                        <div key={mod.id} className="flex items-center justify-between px-4 py-2.5 pl-12">
                                                            <div className="flex items-center gap-2">
                                                                <LayoutGrid className="h-3.5 w-3.5 text-sky-500" />
                                                                <span className="text-sm text-gray-700">{mod.name}</span>
                                                            </div>
                                                            <div className="text-xs text-gray-400 flex items-center gap-3">
                                                                <span>Created {formatShortDate(mod.createdAt)}</span>
                                                                {mod.updatedAt !== mod.createdAt && (
                                                                    <span className="text-amber-500">Updated {formatShortDate(mod.updatedAt)}</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            {isExpanded && stageModules.length === 0 && (
                                                <div className="px-4 py-3 pl-12 text-xs text-gray-400">No modules in this stage.</div>
                                            )}
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    )}

                    {/* Tab: Timeline */}
                    {activeTab === 'timeline' && (
                        <div className="space-y-0">
                            {detail.timeline.length === 0 ? (
                                <p className="text-sm text-gray-500 text-center py-8">No events yet.</p>
                            ) : (
                                <div className="relative pl-7">
                                    <div className="absolute left-[11px] top-2 bottom-2 w-px bg-gray-200" />
                                    {detail.timeline.map((event, idx) => {
                                        const Icon = timelineIcons[event.type] || CircleDot;
                                        const color = timelineColors[event.type] || 'text-gray-400';
                                        return (
                                            <div key={idx} className="relative flex items-start gap-3 py-2.5">
                                                <div className={`absolute -left-7 mt-0.5 rounded-full bg-white p-0.5 ${color}`}>
                                                    <Icon className="h-3.5 w-3.5" />
                                                </div>
                                                <div className="flex-1 min-w-0 flex items-baseline justify-between gap-4">
                                                    <p className="text-sm text-gray-700">{event.label}</p>
                                                    <p className="text-xs text-gray-400 whitespace-nowrap flex items-center gap-1 shrink-0">
                                                        <Clock3 className="h-3 w-3" />
                                                        {formatShortDate(event.date)}
                                                    </p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            ) : null}
        </Drawer>
    );
};

const StatCard = ({ icon: Icon, label, value }: { icon: typeof Layers; label: string; value: number }) => (
    <div className="bg-gray-50 rounded-lg p-3 text-center">
        <Icon className="h-4 w-4 text-gray-400 mx-auto mb-1" />
        <div className="text-lg font-semibold text-gray-900">{value}</div>
        <div className="text-xs text-gray-500">{label}</div>
    </div>
);
