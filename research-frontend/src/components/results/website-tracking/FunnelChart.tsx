/**
 * Funnel Chart
 * Auto-generated page flow + configurable custom funnels with drop-off visualization.
 */

import { useState, useCallback, useId } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, TrendingDown, Plus, Trash2, GripVertical, Pencil, ChevronDown } from 'lucide-react';
import * as trackingService from '../../../services/tracking.service';
import type { FunnelDefinition } from '../../../services/tracking.service';
import { EmptyState } from '../../ui/EmptyState';

type FunnelView = 'custom-funnels' | 'page-visits' | 'transitions';

interface FunnelChartProps {
    researchId: string;
    /** Which section to render. If omitted, renders all. */
    view?: FunnelView;
}

export const FunnelChart = ({ researchId, view }: FunnelChartProps) => {
    const queryClient = useQueryClient();
    const newFunnelId = useId();
    const [editingFunnel, setEditingFunnel] = useState<FunnelDefinition | null>(null);

    const { data, isLoading } = useQuery({
        queryKey: ['tracking', researchId, 'funnels'],
        queryFn: () => trackingService.getFunnels(researchId),
        staleTime: 10_000,
    });

    // Load tracking config to get saved funnel definitions
    const { data: trackingConfig } = useQuery({
        queryKey: ['tracking', researchId, 'tracking-config'],
        queryFn: () => trackingService.getTrackingConfig(researchId),
        staleTime: 30_000,
    });

    const savedFunnels = trackingConfig?.funnels || [];

    const handleSaveFunnel = useCallback(async (funnel: FunnelDefinition) => {
        const existing = [...savedFunnels];
        const idx = existing.findIndex(f => f.id === funnel.id);
        if (idx >= 0) {
            existing[idx] = funnel;
        } else {
            existing.push(funnel);
        }
        await trackingService.updateConfig(researchId, { funnels: existing });
        queryClient.invalidateQueries({ queryKey: ['tracking', researchId, 'tracking-config'] });
        setEditingFunnel(null);
    }, [researchId, savedFunnels, queryClient]);

    const handleDeleteFunnel = useCallback(async (funnelId: string) => {
        const updated = savedFunnels.filter(f => f.id !== funnelId);
        await trackingService.updateConfig(researchId, { funnels: updated });
        queryClient.invalidateQueries({ queryKey: ['tracking', researchId, 'tracking-config'] });
    }, [researchId, savedFunnels, queryClient]);

    const handleEditFunnel = (funnel: FunnelDefinition) => {
        setEditingFunnel({ ...funnel, steps: funnel.steps.map(s => ({ ...s })) });
    };

    const showAll = !view;
    const showCustomFunnels = showAll || view === 'custom-funnels';
    const showPageVisits = showAll || view === 'page-visits';
    const showTransitions = showAll || view === 'transitions';

    return (
        <div className="space-y-6 h-full flex flex-col">
            {/* Custom Funnels */}
            {showCustomFunnels && (
                <div className="flex flex-col flex-1 min-h-0">
                    <div className="mb-4">
                        <h3 className="text-sm font-semibold text-slate-800">Custom Funnels</h3>
                        <p className="text-xs text-gray-400">Define step-by-step conversion funnels to measure drop-off.</p>
                    </div>

                    {/* Saved Funnels — side-by-side with editor */}
                    <div className="flex gap-5 flex-1 min-h-0">
                        {/* Left: funnel cards */}
                        <div className="flex-1 flex flex-wrap gap-2 min-w-0 content-start">
                            {savedFunnels.length > 0 ? (
                                savedFunnels.map(funnel => (
                                    <FunnelDropoffCard
                                        key={funnel.id}
                                        researchId={researchId}
                                        funnel={funnel}
                                        onEdit={() => handleEditFunnel(funnel)}
                                        onDelete={() => handleDeleteFunnel(funnel.id)}
                                    />
                                ))
                            ) : (
                                <div className="bg-gray-50 rounded-lg p-6 text-center w-full">
                                    <TrendingDown className="h-6 w-6 text-gray-300 mx-auto mb-2" />
                                    <p className="text-xs text-gray-500">No custom funnels yet.</p>
                                </div>
                            )}
                        </div>

                        {/* Right: always-visible editor form */}
                        <div className="w-[420px] shrink-0">
                            <FunnelEditor
                                key={editingFunnel?.id || newFunnelId}
                                funnel={editingFunnel || { id: newFunnelId, name: '', steps: [{ url: '', label: '' }, { url: '', label: '' }] }}
                                onSave={handleSaveFunnel}
                                onCancel={() => setEditingFunnel(null)}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Divider — only when rendering all sections */}
            {showAll && <div className="border-t border-gray-200" />}

            {/* Page Visits — tree view */}
            {showPageVisits && (
                <>
                    {isLoading ? (
                        <div className="h-64 bg-gray-100 rounded-lg animate-pulse" />
                    ) : data && data.totalVisitors > 0 ? (
                        <div>
                            <h3 className="text-sm font-semibold text-slate-800 mb-1">
                                Page Visits
                                <span className="ml-2 text-xs font-normal text-gray-500">
                                    {data.totalVisitors} unique visitors
                                </span>
                            </h3>
                            <p className="text-xs text-gray-400 mb-4">Navigation tree based on visitor flow.</p>

                            <PageVisitTree topPages={data.topPages} transitions={data.transitions} />
                        </div>
                    ) : (
                        <EmptyState
                            icon={<TrendingDown className="h-8 w-8" />}
                            description="No page visit data yet."
                        />
                    )}
                </>
            )}

            {/* Top Page Transitions — tree view */}
            {showTransitions && (
                <>
                    {isLoading ? (
                        <div className="h-64 bg-gray-100 rounded-lg animate-pulse" />
                    ) : data && data.transitions.length > 0 ? (
                        <div>
                            <h3 className="text-sm font-semibold text-slate-800 mb-1">Top Page Transitions</h3>
                            <p className="text-xs text-gray-400 mb-4">Most common navigation paths between pages.</p>
                            <TransitionTree transitions={data.transitions} />
                        </div>
                    ) : (
                        <EmptyState
                            icon={<TrendingDown className="h-8 w-8" />}
                            description="No page transition data yet."
                        />
                    )}
                </>
            )}
        </div>
    );
};

// ─── Funnel Editor ──────────────────────────────────────────────────

interface FunnelEditorProps {
    funnel: FunnelDefinition;
    onSave: (funnel: FunnelDefinition) => void;
    onCancel: () => void;
}

const FunnelEditor = ({ funnel, onSave, onCancel }: FunnelEditorProps) => {
    const [name, setName] = useState(funnel.name);
    const [steps, setSteps] = useState(funnel.steps);
    const [saving, setSaving] = useState(false);

    const updateStep = (idx: number, field: 'url' | 'label', value: string) => {
        const updated = steps.map((s, i) => i === idx ? { ...s, [field]: value } : s);
        setSteps(updated);
    };

    const addStep = () => setSteps([...steps, { url: '', label: '' }]);

    const removeStep = (idx: number) => {
        if (steps.length <= 2) return;
        setSteps(steps.filter((_, i) => i !== idx));
    };

    const handleSave = async () => {
        if (!name.trim() || steps.some(s => !s.url.trim())) return;
        setSaving(true);
        await onSave({ ...funnel, name: name.trim(), steps });
        setSaving(false);
    };

    const isValid = name.trim() && steps.length >= 2 && steps.every(s => s.url.trim());

    const isEditing = !!funnel.name;

    const handleReset = () => {
        setName('');
        setSteps([{ url: '', label: '' }, { url: '', label: '' }]);
        onCancel();
    };

    return (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h4 className="text-xs font-semibold text-slate-800 mb-3">
                {isEditing ? `Editing: ${funnel.name}` : 'New Funnel'}
            </h4>

            <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Funnel name (e.g., Signup Flow)"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg mb-3 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
            />

            <div className="space-y-2 mb-3">
                {steps.map((step, i) => (
                    <div key={i} className="flex items-center gap-2">
                        <GripVertical className="h-3.5 w-3.5 text-gray-300 shrink-0" />
                        <span className="text-[10px] font-medium text-gray-400 w-4 shrink-0">{i + 1}</span>
                        <input
                            type="text"
                            value={step.url}
                            onChange={(e) => updateStep(i, 'url', e.target.value)}
                            placeholder="URL pattern (e.g., /pricing)"
                            className="flex-1 px-2.5 py-1.5 text-xs border border-gray-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                        />
                        <input
                            type="text"
                            value={step.label}
                            onChange={(e) => updateStep(i, 'label', e.target.value)}
                            placeholder="Label"
                            className="w-24 px-2.5 py-1.5 text-xs border border-gray-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                        />
                        <button
                            onClick={() => removeStep(i)}
                            disabled={steps.length <= 2}
                            className="p-1 hover:bg-red-50 rounded disabled:opacity-30"
                        >
                            <Trash2 className="h-3.5 w-3.5 text-gray-400" />
                        </button>
                    </div>
                ))}
            </div>

            <div className="flex items-center justify-between">
                <button onClick={addStep} className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700">
                    <Plus className="h-3 w-3" /> Add step
                </button>
                <div className="flex items-center gap-2">
                    {isEditing && (
                        <button onClick={handleReset} className="px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-200 rounded-lg">
                            Cancel edit
                        </button>
                    )}
                    <button
                        onClick={async () => { await handleSave(); handleReset(); }}
                        disabled={!isValid || saving}
                        className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                    >
                        {saving ? 'Saving...' : isEditing ? 'Update' : 'Create'}
                    </button>
                </div>
            </div>
        </div>
    );
};

// ─── Funnel Drop-off Card ───────────────────────────────────────────

interface FunnelDropoffCardProps {
    researchId: string;
    funnel: FunnelDefinition;
    onEdit: () => void;
    onDelete: () => void;
}

const FunnelDropoffCard = ({ researchId, funnel, onEdit, onDelete }: FunnelDropoffCardProps) => {
    const [expanded, setExpanded] = useState(true);
    const { data, isLoading } = useQuery({
        queryKey: ['tracking', researchId, 'funnel-dropoff', funnel.id],
        queryFn: () => trackingService.getFunnelDropoff(researchId, funnel.id),
        staleTime: 10_000,
    });

    return (
        <div className={`border border-gray-200 rounded-lg overflow-hidden flex flex-col ${expanded ? 'w-full' : 'w-[calc(33.333%-6px)]'}`}>
            {/* Collapsed: compact row */}
            <div
                onClick={() => setExpanded(prev => !prev)}
                className="w-full px-3 py-2 flex items-center gap-3 hover:bg-gray-50 transition-colors cursor-pointer"
            >
                <ChevronDown className={`h-3.5 w-3.5 text-gray-400 transition-transform shrink-0 ${expanded ? '' : '-rotate-90'}`} />
                <h4 className="text-xs font-semibold text-slate-800 truncate">{funnel.name}</h4>
                <span className="text-[10px] text-gray-400 shrink-0">{funnel.steps.length} steps</span>
                {data && data.conversionRate > 0 && (
                    <span className="text-[10px] font-medium text-green-600 bg-green-50 px-1.5 py-0.5 rounded shrink-0">
                        {data.conversionRate}%
                    </span>
                )}
                <div className="ml-auto flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                    <button onClick={onEdit} className="p-1 hover:bg-gray-100 rounded">
                        <Pencil className="h-3 w-3 text-gray-400" />
                    </button>
                    <button onClick={onDelete} className="p-1 hover:bg-red-50 rounded">
                        <Trash2 className="h-3 w-3 text-gray-400" />
                    </button>
                </div>
            </div>

            {/* Expanded: fill remaining space */}
            {expanded && (
                <div className="flex-1 p-4 border-t border-gray-100">
                    {isLoading ? (
                        <div className="h-32 bg-gray-100 rounded-lg animate-pulse" />
                    ) : data && data.steps.length > 0 ? (
                        <FunnelTriangle steps={data.steps} />
                    ) : (
                        <p className="text-xs text-gray-400 text-center py-4">No visitor data for this funnel yet.</p>
                    )}
                </div>
            )}
        </div>
    );
};

// ─── Funnel Triangle ────────────────────────────────────────────────

interface FunnelStep {
    url: string;
    label?: string;
    visitors: number;
    percentage: number;
    dropoff?: number;
}

const FunnelTriangle = ({ steps }: { steps: FunnelStep[] }) => {
    const n = steps.length;
    const segH = 50;
    const gapH = 6;
    const totalH = n * segH + (n - 1) * gapH;
    const W = 440;
    const topW = W;       // first step = full width
    const botW = 120;     // last step bottom = narrow

    // Position-based widths: linearly narrow from top to bottom
    const edgeWidths = Array.from({ length: n + 1 }, (_, i) => topW - (topW - botW) * (i / n));

    return (
        <div>
            {/* SVG funnel */}
            <div className="flex-1">
                <svg viewBox={`0 0 ${W} ${totalH}`} className="w-full" style={{ maxWidth: 520 }}>
                    {steps.map((step, i) => {
                        const y = i * (segH + gapH);
                        const wTop = edgeWidths[i];
                        const wBot = edgeWidths[i + 1];
                        const xTopL = (W - wTop) / 2;
                        const xBotL = (W - wBot) / 2;
                        const color = getStepColor(i, n);

                        return (
                            <g key={i}>
                                {/* Trapezoid segment */}
                                <polygon
                                    points={`${xTopL},${y} ${xTopL + wTop},${y} ${xBotL + wBot},${y + segH} ${xBotL},${y + segH}`}
                                    fill={color}
                                    opacity="0.9"
                                />
                                {/* Step label */}
                                <text
                                    x={W / 2}
                                    y={y + segH / 2 - 5}
                                    textAnchor="middle"
                                    fill="white"
                                    style={{ fontSize: 12, fontWeight: 600 }}
                                >
                                    {step.label || shortenUrl(step.url)}
                                </text>
                                {/* Visitors count */}
                                <text
                                    x={W / 2}
                                    y={y + segH / 2 + 11}
                                    textAnchor="middle"
                                    fill="rgba(255,255,255,0.8)"
                                    style={{ fontSize: 10 }}
                                >
                                    {step.visitors} visitors ({step.percentage}%)
                                </text>
                            </g>
                        );
                    })}
                </svg>
            </div>

        </div>
    );
};

// ─── Page Visit Tree ────────────────────────────────────────────────

interface TreeNode {
    url: string;
    visitors: number;
    children: TreeNode[];
}

const buildTree = (
    topPages: { pageUrl: string; visitors: number }[],
    transitions: { from: string; to: string; count: number }[],
): TreeNode[] => {
    if (topPages.length === 0) return [];

    // Build adjacency: parent → children sorted by count desc
    const childMap = new Map<string, { url: string; count: number }[]>();
    for (const t of transitions) {
        const arr = childMap.get(t.from) || [];
        arr.push({ url: t.to, count: t.count });
        childMap.set(t.from, arr);
    }
    for (const [, arr] of childMap) arr.sort((a, b) => b.count - a.count);

    const visitorsMap = new Map(topPages.map(p => [p.pageUrl, p.visitors]));
    const visited = new Set<string>();

    const build = (url: string): TreeNode => {
        visited.add(url);
        const children = (childMap.get(url) || [])
            .filter(c => !visited.has(c.url))
            .slice(0, 5)
            .map(c => build(c.url));
        return { url, visitors: visitorsMap.get(url) || 0, children };
    };

    // Root = page with most visitors
    const root = build(topPages[0].pageUrl);

    // Add orphan pages not reachable from root
    const orphans = topPages
        .filter(p => !visited.has(p.pageUrl))
        .map(p => ({ url: p.pageUrl, visitors: p.visitors, children: [] }));

    return [root, ...orphans];
};

const PageVisitTree = ({
    topPages,
    transitions,
}: {
    topPages: { pageUrl: string; visitors: number }[];
    transitions: { from: string; to: string; count: number }[];
}) => {
    const tree = buildTree(topPages, transitions);
    const maxVisitors = topPages[0]?.visitors || 1;

    return (
        <div className="space-y-0.5">
            {tree.map((node) => (
                <TreeRow key={node.url} node={node} depth={0} maxVisitors={maxVisitors} />
            ))}
        </div>
    );
};

const TreeRow = ({ node, depth, maxVisitors }: { node: TreeNode; depth: number; maxVisitors: number }) => {
    const pct = Math.round((node.visitors / maxVisitors) * 100);
    const barColor = depth === 0 ? '#3B82F6' : depth === 1 ? '#6366F1' : '#8B5CF6';

    return (
        <>
            <div className="flex items-center gap-2" style={{ paddingLeft: depth * 24 }}>
                {/* Tree connector */}
                {depth > 0 && (
                    <div className="flex items-center gap-1 shrink-0">
                        <div className="w-4 border-t border-gray-300" />
                        <ArrowRight className="h-3 w-3 text-gray-300 shrink-0" />
                    </div>
                )}

                {/* Node */}
                <div className="flex-1 flex items-center gap-3 py-1.5">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                            <span className="text-xs font-medium text-slate-700 truncate">
                                {shortenUrl(node.url)}
                            </span>
                            <span className="text-[11px] text-gray-500 shrink-0 ml-2">
                                {node.visitors}
                            </span>
                        </div>
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div
                                className="h-full rounded-full transition-all"
                                style={{ width: `${Math.max(pct, 3)}%`, backgroundColor: barColor }}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Children */}
            {node.children.map((child) => (
                <TreeRow key={child.url} node={child} depth={depth + 1} maxVisitors={maxVisitors} />
            ))}
        </>
    );
};

// ─── Transition Tree ────────────────────────────────────────────────

interface TransitionNode {
    url: string;
    count: number;
    children: TransitionNode[];
}

const buildTransitionTree = (transitions: { from: string; to: string; count: number }[]): TransitionNode[] => {
    if (transitions.length === 0) return [];

    // Group by source
    const childMap = new Map<string, { url: string; count: number }[]>();
    const allTargets = new Set<string>();
    for (const t of transitions) {
        const arr = childMap.get(t.from) || [];
        arr.push({ url: t.to, count: t.count });
        childMap.set(t.from, arr);
        allTargets.add(t.to);
    }
    for (const [, arr] of childMap) arr.sort((a, b) => b.count - a.count);

    // Roots = sources that are not targets of any transition (entry points)
    const roots = [...childMap.keys()].filter(k => !allTargets.has(k));
    if (roots.length === 0) roots.push(transitions[0].from);

    // Sort roots by total outgoing count
    roots.sort((a, b) => {
        const sumA = (childMap.get(a) || []).reduce((s, c) => s + c.count, 0);
        const sumB = (childMap.get(b) || []).reduce((s, c) => s + c.count, 0);
        return sumB - sumA;
    });

    const visited = new Set<string>();

    const build = (url: string, totalCount: number): TransitionNode => {
        visited.add(url);
        const children = (childMap.get(url) || [])
            .filter(c => !visited.has(c.url))
            .slice(0, 4)
            .map(c => build(c.url, c.count));
        return { url, count: totalCount, children };
    };

    return roots.map(r => {
        const total = (childMap.get(r) || []).reduce((s, c) => s + c.count, 0);
        return build(r, total);
    });
};

const TransitionTree = ({ transitions }: { transitions: { from: string; to: string; count: number }[] }) => {
    const tree = buildTransitionTree(transitions);
    const maxCount = Math.max(...tree.map(n => n.count), 1);

    return (
        <div className="space-y-0.5">
            {tree.map((node) => (
                <TransitionRow key={node.url} node={node} depth={0} maxCount={maxCount} />
            ))}
        </div>
    );
};

const TransitionRow = ({ node, depth, maxCount }: { node: TransitionNode; depth: number; maxCount: number }) => {
    const pct = Math.round((node.count / maxCount) * 100);
    const barColor = depth === 0 ? '#3B82F6' : depth === 1 ? '#6366F1' : '#8B5CF6';

    return (
        <>
            <div className="flex items-center gap-2" style={{ paddingLeft: depth * 24 }}>
                {depth > 0 && (
                    <div className="flex items-center gap-1 shrink-0">
                        <div className="w-4 border-t border-gray-300" />
                        <ArrowRight className="h-3 w-3 text-gray-300 shrink-0" />
                    </div>
                )}
                <div className="flex-1 flex items-center gap-3 py-1.5">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                            <span className="text-xs font-medium text-slate-700 truncate">
                                {shortenUrl(node.url)}
                            </span>
                            <span className="text-[11px] text-gray-500 shrink-0 ml-2">
                                {node.count}x
                            </span>
                        </div>
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div
                                className="h-full rounded-full transition-all"
                                style={{ width: `${Math.max(pct, 3)}%`, backgroundColor: barColor }}
                            />
                        </div>
                    </div>
                </div>
            </div>
            {node.children.map((child) => (
                <TransitionRow key={child.url} node={child} depth={depth + 1} maxCount={maxCount} />
            ))}
        </>
    );
};

// ─── Helpers ────────────────────────────────────────────────────────

const shortenUrl = (url: string): string => {
    try {
        const u = new URL(url);
        return u.pathname === '/' ? u.hostname : u.pathname;
    } catch {
        return url.length > 40 ? url.slice(0, 40) + '...' : url;
    }
};

const getStepColor = (index: number, total: number): string => {
    const colors = ['#3B82F6', '#6366F1', '#8B5CF6', '#A855F7', '#D946EF', '#EC4899', '#F43F5E'];
    const t = total > 1 ? index / (total - 1) : 0;
    const idx = Math.min(colors.length - 1, Math.round(t * (colors.length - 1)));
    return colors[idx];
};
