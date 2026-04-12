import { create } from 'zustand';
import type { ComponentConfig } from '../types/moduleBuilder.types';

interface ModuleDraft {
    componentValues: Record<string, string>;
    components: ComponentConfig[];
    timestamp: number;
}

interface ModuleDraftState {
    drafts: Record<string, ModuleDraft>;
    setDraft: (moduleId: string, componentValues: Record<string, string>, components: ComponentConfig[]) => void;
    getDraft: (moduleId: string) => ModuleDraft | undefined;
    clearDraft: (moduleId: string) => void;
    clearDrafts: (moduleIds: string[]) => void;
    clearAll: () => void;
    hasDraft: (moduleId: string) => boolean;
}

export const useModuleDraftStore = create<ModuleDraftState>((set, get) => ({
    drafts: {},

    setDraft: (moduleId, componentValues, components) => {
        if (!moduleId || Object.keys(componentValues).length === 0) return;
        set(state => ({
            drafts: {
                ...state.drafts,
                [moduleId]: { componentValues, components, timestamp: Date.now() },
            },
        }));
    },

    getDraft: (moduleId) => get().drafts[moduleId],

    clearDraft: (moduleId) => {
        set(state => {
            const next = { ...state.drafts };
            delete next[moduleId];
            return { drafts: next };
        });
    },

    clearDrafts: (moduleIds) => {
        set(state => {
            const next = { ...state.drafts };
            for (const id of moduleIds) delete next[id];
            return { drafts: next };
        });
    },

    clearAll: () => set({ drafts: {} }),

    hasDraft: (moduleId) => moduleId in get().drafts,
}));
