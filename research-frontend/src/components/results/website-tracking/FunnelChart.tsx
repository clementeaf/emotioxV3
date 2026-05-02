/**
 * Funnel Chart
 * Auto-generated page flow + configurable custom funnels with drop-off visualization.
 */

import { useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, ArrowDown, TrendingDown, Plus, Trash2, GripVertical, X, Pencil } from 'lucide-react';
import * as trackingService from '../../../services/tracking.service';
import type { FunnelDefinition } from '../../../services/tracking.service';
import { EmptyState } from '../../ui/EmptyState';

interface FunnelChartProps {
    researchId: string;
    onNavigateToPage?: (pageUrl: string) => void;
}

export const FunnelChart = ({ researchId, onNavigateToPage }: FunnelChartProps) => {
    const queryClient = useQueryClient();
    const [editingFunnel, setEditingFunnel] = useState<FunnelDefinition | null>(null);
    const [showEditor, setShowEditor] = useState(false);

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
        setShowEditor(false);
        setEditingFunnel(null);
    }, [researchId, savedFunnels, queryClient]);

    const handleDeleteFunnel = useCallback(async (funnelId: string) => {
        const updated = savedFunnels.filter(f => f.id !== funnelId);
        await trackingService.updateConfig(researchId, { funnels: updated });
        queryClient.invalidateQueries({ queryKey: ['tracking', researchId, 'tracking-config'] });
    }, [researchId, savedFunnels, queryClient]);

    const handleNewFunnel = () => {
        setEditingFunnel({
            id: `funnel_${Date.now()}`,
            name: '',
            steps: [{ url: '', label: '' }, { url: '', label: '' }],
        });
        setShowEditor(true);
    };

    const handleEditFunnel = (funnel: FunnelDefinition) => {
        setEditingFunnel({ ...funnel, steps: funnel.steps.map(s => ({ ...s })) });
        setShowEditor(true);
    };

    return (
        <div className="space-y-6">
            {/* Custom Funnels */}
            <div>
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h3 className="text-sm font-semibold text-slate-800">Custom Funnels</h3>
                        <p className="text-xs text-gray-400">Define step-by-step conversion funnels to measure drop-off.</p>
                    </div>
                    <button
                        onClick={handleNewFunnel}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        <Plus className="h-3.5 w-3.5" /> Create Funnel
                    </button>
                </div>

                {/* Funnel Editor Modal */}
                {showEditor && editingFunnel && (
                    <FunnelEditor
                        funnel={editingFunnel}
                        onSave={handleSaveFunnel}
                        onCancel={() => { setShowEditor(false); setEditingFunnel(null); }}
                    />
                )}

                {/* Saved Funnels */}
                {savedFunnels.length > 0 ? (
                    <div className="space-y-4">
                        {savedFunnels.map(funnel => (
                            <FunnelDropoffCard
                                key={funnel.id}
                                researchId={researchId}
                                funnel={funnel}
                                onEdit={() => handleEditFunnel(funnel)}
                                onDelete={() => handleDeleteFunnel(funnel.id)}
                                onNavigateToPage={onNavigateToPage}
                            />
                        ))}
                    </div>
                ) : !showEditor ? (
                    <div className="bg-gray-50 rounded-lg p-6 text-center">
                        <TrendingDown className="h-6 w-6 text-gray-300 mx-auto mb-2" />
                        <p className="text-xs text-gray-500">No custom funnels yet. Create one to track conversion paths.</p>
                    </div>
                ) : null}
            </div>

            {/* Divider */}
            <div className="border-t border-gray-200" />

            {/* Auto-generated: Top Pages & Transitions */}
            {isLoading ? (
                <div className="h-64 bg-gray-100 rounded-lg animate-pulse" />
            ) : data && data.totalVisitors > 0 ? (
                <>
                    <div>
                        <h3 className="text-sm font-semibold text-slate-800 mb-1">
                            Page Visits
                            <span className="ml-2 text-xs font-normal text-gray-500">
                                {data.totalVisitors} unique visitors
                            </span>
                        </h3>
                        <p className="text-xs text-gray-400 mb-4">Pages ranked by unique visitor count (auto-generated).</p>

                        <div className="space-y-2">
                            {data.topPages.map((page, i) => {
                                const maxVisitors = data.topPages[0]?.visitors || 1;
                                const pct = Math.round((page.visitors / maxVisitors) * 100);
                                return (
                                    <div key={page.pageUrl} className="flex items-center gap-3">
                                        <span className="text-xs font-medium text-gray-400 w-5 text-right">{i + 1}</span>
                                        <div className="flex-1 relative">
                                            <div className="h-8 bg-gray-100 rounded-md overflow-hidden">
                                                <div
                                                    className="h-full rounded-md bg-blue-500 transition-all"
                                                    style={{ width: `${pct}%`, opacity: 0.15 + (pct / 100) * 0.85 }}
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
                </>
            ) : (
                <EmptyState
                    icon={<TrendingDown className="h-8 w-8" />}
                    description="No page visit data yet."
                />
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

    return (
        <div className="bg-white border border-blue-200 rounded-lg p-4 mb-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-slate-800">
                    {funnel.name ? 'Edit Funnel' : 'New Funnel'}
                </h4>
                <button onClick={onCancel} className="p-1 hover:bg-gray-100 rounded">
                    <X className="h-4 w-4 text-gray-400" />
                </button>
            </div>

            <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Funnel name (e.g., Signup Flow)"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
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
                            className="flex-1 px-2.5 py-1.5 text-xs border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                        />
                        <input
                            type="text"
                            value={step.label}
                            onChange={(e) => updateStep(i, 'label', e.target.value)}
                            placeholder="Label (optional)"
                            className="w-32 px-2.5 py-1.5 text-xs border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
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
                    <button onClick={onCancel} className="px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100 rounded-lg">
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={!isValid || saving}
                        className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                    >
                        {saving ? 'Saving...' : 'Save Funnel'}
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
    onNavigateToPage?: (pageUrl: string) => void;
}

const FunnelDropoffCard = ({ researchId, funnel, onEdit, onDelete, onNavigateToPage }: FunnelDropoffCardProps) => {
    const { data, isLoading } = useQuery({
        queryKey: ['tracking', researchId, 'funnel-dropoff', funnel.id],
        queryFn: () => trackingService.getFunnelDropoff(researchId, funnel.id),
        staleTime: 10_000,
    });

    return (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                <div>
                    <h4 className="text-sm font-semibold text-slate-800">{funnel.name}</h4>
                    <p className="text-[10px] text-gray-400">{funnel.steps.length} steps</p>
                </div>
                <div className="flex items-center gap-3">
                    {data && (
                        <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded">
                            {data.conversionRate}% conversion
                        </span>
                    )}
                    <button onClick={onEdit} className="p-1 hover:bg-gray-100 rounded">
                        <Pencil className="h-3.5 w-3.5 text-gray-400" />
                    </button>
                    <button onClick={onDelete} className="p-1 hover:bg-red-50 rounded">
                        <Trash2 className="h-3.5 w-3.5 text-gray-400" />
                    </button>
                </div>
            </div>

            <div className="p-4">
                {isLoading ? (
                    <div className="h-32 bg-gray-100 rounded-lg animate-pulse" />
                ) : data && data.steps.length > 0 ? (
                    <div className="flex flex-col items-center">
                        {data.steps.map((step, i) => {
                            const maxV = data.steps[0].visitors || 1;
                            const widthPct = Math.max(20, Math.round((step.visitors / maxV) * 100));
                            const nextWidthPct = i < data.steps.length - 1
                                ? Math.max(20, Math.round((data.steps[i + 1].visitors / maxV) * 100))
                                : widthPct;
                            const color = getStepColor(i, data.steps.length);

                            return (
                                <div key={i} className="w-full flex flex-col items-center">
                                    {/* Trapezoid step + Ver página button */}
                                    <div className="relative w-full flex items-center justify-center gap-3">
                                        <div className="relative flex-1 flex justify-center">
                                            <svg
                                                viewBox="0 0 200 50"
                                                preserveAspectRatio="none"
                                                className="h-12"
                                                style={{ width: `${Math.max(widthPct, nextWidthPct)}%` }}
                                            >
                                                <polygon
                                                    points={`${(200 - widthPct * 2) / 2},0 ${200 - (200 - widthPct * 2) / 2},0 ${200 - (200 - nextWidthPct * 2) / 2},50 ${(200 - nextWidthPct * 2) / 2},50`}
                                                    fill={color}
                                                    opacity="0.85"
                                                />
                                            </svg>
                                            {/* Label overlay */}
                                            <div className="absolute inset-0 flex items-center justify-center gap-3 pointer-events-none">
                                                <span className="text-xs font-semibold text-white drop-shadow-sm truncate max-w-[40%]">
                                                    {step.label || shortenUrl(step.url)}
                                                </span>
                                                <span className="text-[11px] text-white/90 font-medium drop-shadow-sm">
                                                    {step.visitors} ({step.percentage}%)
                                                </span>
                                            </div>
                                        </div>
                                        {onNavigateToPage && (
                                            <button
                                                onClick={() => onNavigateToPage(step.url)}
                                                className="shrink-0 px-3 py-1.5 text-[11px] font-medium text-white bg-slate-700 rounded-md hover:bg-slate-800 transition-colors"
                                            >
                                                Ver página
                                            </button>
                                        )}
                                    </div>

                                    {/* Drop-off between steps */}
                                    {i < data.steps.length - 1 && step.visitors > 0 && (
                                        <div className="flex items-center gap-1 py-0.5">
                                            <ArrowDown className="h-3 w-3 text-gray-300" />
                                            <span className="text-[10px] text-red-400 font-medium">
                                                -{data.steps[i + 1].dropoff}%
                                            </span>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <p className="text-xs text-gray-400 text-center py-4">No visitor data for this funnel yet.</p>
                )}
            </div>
        </div>
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
