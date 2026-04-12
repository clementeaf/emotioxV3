import { useState, useRef, useEffect, useCallback } from 'react';
import { Save, ChevronDown, Clock } from 'lucide-react';
import { useModuleDraftStore } from '../../stores/useModuleDraftStore';
import { modulesService } from '../../services/modules.service';
import type { Module, Stage } from '../../services/research.service';
import type { ComponentConfig } from '../../types/moduleBuilder.types';
import { useToast } from '../../hooks/useToast';

interface PendingDraftsDropdownProps {
    stages: Stage[];
    researchId: string;
    onSaveComplete: () => void;
}

/** Maps moduleId → { moduleName, stageName, module } from the research stages */
function buildModuleMap(stages: Stage[]): Map<string, { moduleName: string; stageName: string; module: Module }> {
    const map = new Map<string, { moduleName: string; stageName: string; module: Module }>();
    for (const stage of stages) {
        for (const mod of stage.modules || []) {
            map.set(mod.id, { moduleName: mod.name, stageName: stage.name, module: mod });
        }
    }
    return map;
}

/** Builds config from draft for a regular module (not Research Configuration) */
function buildConfigFromDraft(
    module: Module,
    componentValues: Record<string, string>,
    components: ComponentConfig[]
): Record<string, unknown> {
    const updatedComponents = components.map(comp => ({
        ...comp,
        value: componentValues[comp.id] ?? comp.value,
    }));

    return {
        ...module.config,
        structure: {
            ...(module.config?.structure || {}),
            components: updatedComponents,
        },
    };
}

function formatTimeAgo(timestamp: number): string {
    const diff = Math.floor((Date.now() - timestamp) / 1000);
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return `${Math.floor(diff / 3600)}h ago`;
}

export const PendingDraftsDropdown = ({ stages, onSaveComplete }: PendingDraftsDropdownProps) => {
    const { drafts, clearDraft, clearDrafts } = useModuleDraftStore();
    const toast = useToast();
    const [open, setOpen] = useState(false);
    const [savingId, setSavingId] = useState<string | null>(null);
    const [savingAll, setSavingAll] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const moduleMap = buildModuleMap(stages);
    const draftEntries = Object.entries(drafts)
        .filter(([id]) => moduleMap.has(id))
        .map(([id, draft]) => ({
            moduleId: id,
            ...moduleMap.get(id)!,
            draft,
        }));

    const count = draftEntries.length;

    // Close on outside click
    useEffect(() => {
        if (!open) return;
        const handler = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [open]);

    const saveSingleDraft = useCallback(async (moduleId: string) => {
        const entry = draftEntries.find(e => e.moduleId === moduleId);
        if (!entry) return;

        setSavingId(moduleId);
        try {
            const config = buildConfigFromDraft(
                entry.module,
                entry.draft.componentValues,
                entry.draft.components
            );
            await modulesService.update(moduleId, { config, order: entry.module.order_index });
            clearDraft(moduleId);
            toast.success(`${entry.moduleName} saved`);
            onSaveComplete();
        } catch (err) {
            console.error('Failed to save draft:', err);
            toast.error(`Failed to save ${entry.moduleName}`);
        } finally {
            setSavingId(null);
        }
    }, [draftEntries, clearDraft, toast, onSaveComplete]);

    const saveAllDrafts = useCallback(async () => {
        setSavingAll(true);
        try {
            const promises = draftEntries.map(entry => {
                const config = buildConfigFromDraft(
                    entry.module,
                    entry.draft.componentValues,
                    entry.draft.components
                );
                return modulesService.update(entry.moduleId, { config, order: entry.module.order_index });
            });
            await Promise.all(promises);
            clearDrafts(draftEntries.map(e => e.moduleId));
            toast.success(`Saved ${draftEntries.length} module(s)`);
            onSaveComplete();
            setOpen(false);
        } catch (err) {
            console.error('Failed to save all drafts:', err);
            toast.error('Some modules failed to save');
        } finally {
            setSavingAll(false);
        }
    }, [draftEntries, clearDrafts, toast, onSaveComplete]);

    if (count === 0) return null;

    return (
        <div ref={dropdownRef} className="relative">
            <button
                onClick={() => setOpen(!open)}
                className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors"
            >
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-amber-500 text-white text-xs font-bold">
                    {count}
                </span>
                <span className="hidden sm:inline">unsaved</span>
                <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>

            {open && (
                <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-lg border border-gray-200 shadow-lg z-50">
                    <div className="px-3 py-2 border-b border-gray-100 flex items-center justify-between">
                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Unsaved changes</span>
                        <button
                            onClick={saveAllDrafts}
                            disabled={savingAll}
                            className="text-xs font-medium text-blue-600 hover:text-blue-800 disabled:opacity-50"
                        >
                            {savingAll ? 'Saving...' : 'Save all'}
                        </button>
                    </div>

                    <div className="max-h-64 overflow-y-auto divide-y divide-gray-50">
                        {draftEntries.map(entry => (
                            <div key={entry.moduleId} className="px-3 py-2.5 flex items-center justify-between hover:bg-gray-50">
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-medium text-gray-900 truncate">{entry.moduleName}</p>
                                    <p className="text-xs text-gray-400 flex items-center gap-1">
                                        <Clock className="h-3 w-3" />
                                        {formatTimeAgo(entry.draft.timestamp)}
                                        <span className="text-gray-300">·</span>
                                        {entry.stageName}
                                    </p>
                                </div>
                                <button
                                    onClick={() => saveSingleDraft(entry.moduleId)}
                                    disabled={savingId === entry.moduleId || savingAll}
                                    className="ml-2 p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors disabled:opacity-50"
                                    title="Save this module"
                                >
                                    <Save className="h-3.5 w-3.5" />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};
