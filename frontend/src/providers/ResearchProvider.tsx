'use client';

import React, { createContext, useState, useEffect, ReactNode } from 'react';

import { ResearchDraft, ResearchContextType } from '@/shared/interfaces/research.interface';
import { useResearch as useResearchFromStore } from '@/stores/useResearchStore';

const ResearchContext = createContext<ResearchContextType | undefined>(undefined);

const DRAFT_STORAGE_KEY = 'research_draft';

// Re-exportamos directamente la función importada
export function useResearch() {
  return useResearchFromStore();
}

// Componente vacío para mantener compatibilidad con código existente
export function ResearchProvider({ children }: { children: ReactNode }) {
  const [currentDraft, setCurrentDraft] = useState<ResearchDraft | null>(null);

  // Cargar borrador al iniciar
  useEffect(() => {
    const storedDraft = localStorage.getItem(DRAFT_STORAGE_KEY);
    if (storedDraft) {
      try {
        const draft = JSON.parse(storedDraft);
        draft.lastUpdated = new Date(draft.lastUpdated);
        setCurrentDraft(draft);
      } catch (error) {
        localStorage.removeItem(DRAFT_STORAGE_KEY);
      }
    }
  }, []);

  // Guardar borrador cuando cambie
  useEffect(() => {
    if (currentDraft) {
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(currentDraft));
    } else {
      localStorage.removeItem(DRAFT_STORAGE_KEY);
    }
  }, [currentDraft]);

  const createDraft = () => {
    const newDraft: ResearchDraft = {
      id: crypto.randomUUID(),
      step: 'basic',
      data: {},
      lastUpdated: new Date()
    };
    setCurrentDraft(newDraft);
    return newDraft;
  };

  const updateDraft = (data: Partial<ResearchDraft['data']>, step: ResearchDraft['step']) => {
    setCurrentDraft(prev => {
      if (!prev) {return null;}
      return {
        ...prev,
        step,
        data: {
          ...prev.data,
          ...data
        },
        lastUpdated: new Date()
      };
    });
  };

  const clearDraft = () => {
    setCurrentDraft(null);
  };

  const getDraft = () => currentDraft;

  const value = {
    currentDraft,
    hasDraft: !!currentDraft,
    createDraft,
    updateDraft,
    clearDraft,
    getDraft,
  };

  return (
    <ResearchContext.Provider value={value}>
      {children}
    </ResearchContext.Provider>
  );
} 