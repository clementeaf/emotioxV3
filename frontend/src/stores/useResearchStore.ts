import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

import { ResearchDraft, ResearchStore } from '@/shared/interfaces/research.interface';

type Research = {
  id: string;
  clientId?: string;
  name: string;
  description?: string;
  companyId?: string;
  type?: string;
  technique?: string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
};

type ResearchState = ResearchStore & {
  items: Research[];
  snapshot?: Research[] | null;
  optimisticAdd: (r: Omit<Research, 'id'> & { clientId: string }) => void;
  reconcileByClientId: (clientId: string, real: Research) => void;
  rollback: () => void;
};

const DRAFT_STORAGE_KEY = 'research_draft';

const newClientId = () =>
  (globalThis.crypto?.randomUUID?.() ?? `tmp_${Date.now()}_${Math.random().toString(36).slice(2,8)}`);

const upsertById = (arr: Research[], item: Research) => {
  const i = arr.findIndex(x => (item.id && x.id === item.id) || (item.clientId && x.clientId === item.clientId));
  if (i === -1) return [item, ...arr];
  const copy = arr.slice(); copy[i] = { ...copy[i], ...item }; return copy;
};

const removeById = (arr: Research[], needle: { id?: string; clientId?: string }) =>
  arr.filter(x => !(needle.id && x.id === needle.id) && !(needle.clientId && x.clientId === needle.clientId));

// Crear el store con persistencia
export const useResearchStore = create<ResearchState>()(
  persist(
    (set, get) => ({
      items: [],
      snapshot: null,
      currentDraft: null,
      hasDraft: false,
      optimisticAdd: (r) => set(s => {
        return { snapshot: s.items, items: upsertById(s.items, { ...r, id: '' }) };
      }),
      reconcileByClientId: (clientId, real) => set(s => {
        const withoutTmp = removeById(s.items, { clientId });
        return { items: upsertById(withoutTmp, { ...real, clientId: undefined }) };
      }),
      rollback: () => set(s => ({ items: s.snapshot ?? s.items, snapshot: null })),
      createDraft: () => {
        const newDraft: ResearchDraft = {
          id: crypto.randomUUID(),
          step: 'basic',
          data: {},
          lastUpdated: new Date()
        };
        
        set({ 
          currentDraft: newDraft,
          hasDraft: true
        });
        
        return newDraft;
      },
      
      updateDraft: (data, step) => {
        set((state) => {
          if (!state.currentDraft) {return state;}
          
          const updatedDraft = {
            ...state.currentDraft,
            step,
            data: {
              ...state.currentDraft.data,
              ...data
            },
            lastUpdated: new Date()
          };
          
          return { 
            currentDraft: updatedDraft,
            hasDraft: true
          };
        });
      },
      
      clearDraft: () => {
        set({ 
          currentDraft: null,
          hasDraft: false
        });
      },
      
      getDraft: () => get().currentDraft
    }),
    {
      name: DRAFT_STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ currentDraft: state.currentDraft }),
      // Personalizar cómo se manejan las fechas durante la persistencia
      onRehydrateStorage: () => (state) => {
        if (!state) {return;}
        
        // Restaurar las fechas como objetos Date
        if (state.currentDraft?.lastUpdated) {
          state.currentDraft.lastUpdated = new Date(state.currentDraft.lastUpdated);
        }
        
        // Actualizar hasDraft basado en el currentDraft
        state.hasDraft = !!state.currentDraft;
      }
    }
  )
);

export const researchHelpers = { newClientId, upsertById, removeById };

export function useResearch() {
  return useResearchStore();
} 