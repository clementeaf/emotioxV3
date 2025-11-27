import type { ResearchAPIItem, ResearchSortableItem } from '@/types/research-api.types';

export interface BestResearchData {
  id: string;
  title: string;
  imageUrl: string;
  score: number;
  researchId: string;
}

export interface ResearchStats {
  total: number;
  completed: number;
  inProgress: number;
  pending: number;
  averageProgress: number;
}

/**
 * Encuentra la mejor investigación basada en el progreso/puntuación
 *
 * @param apiData - Array de datos de investigación desde la API
 * @returns Datos de la mejor investigación o null si no hay datos
 */
export const findBestResearch = (apiData: ResearchAPIItem[]): BestResearchData | null => {
  if (!apiData || apiData.length === 0) {
    return null;
  }

  const sorted = [...apiData].sort((a: ResearchAPIItem, b: ResearchAPIItem) =>
    (b.progress || 0) - (a.progress || 0)
  );

  const best = sorted[0];
  if (!best) {
    return null;
  }

  return {
    id: best.id,
    title: best.name || best.basic?.name || 'Untitled Research',
    imageUrl: '',
    score: best.progress || 0,
    researchId: best.id
  };
};

/**
 * Calcula estadísticas de investigación
 *
 * @param research - Array de datos de investigación
 * @returns Objeto con estadísticas calculadas
 */
export const calculateResearchStats = (research: ResearchAPIItem[]): ResearchStats => {
  if (!research || research.length === 0) {
    return {
      total: 0,
      completed: 0,
      inProgress: 0,
      pending: 0,
      averageProgress: 0
    };
  }

  const stats = research.reduce((acc, item) => {
    acc.total += 1;

    switch (item.status) {
      case 'completed':
        acc.completed += 1;
        break;
      case 'in-progress':
        acc.inProgress += 1;
        break;
      case 'draft':
      case 'pending':
        acc.pending += 1;
        break;
    }

    acc.totalProgress += (item.progress || 0);
    return acc;
  }, {
    total: 0,
    completed: 0,
    inProgress: 0,
    pending: 0,
    totalProgress: 0
  });

  return {
    ...stats,
    averageProgress: stats.total > 0 ? stats.totalProgress / stats.total : 0
  };
};

/**
 * Ordena investigaciones por diferentes criterios
 *
 * @param research - Array de datos de investigación
 * @param sortBy - Criterio de ordenamiento
 * @param direction - Dirección del ordenamiento (asc/desc)
 * @returns Array ordenado de investigaciones
 */
export const sortResearch = (
  research: ResearchSortableItem[],
  sortBy: 'date' | 'name' | 'progress' | 'status' = 'date',
  direction: 'asc' | 'desc' = 'desc'
): ResearchSortableItem[] => {
  const sorted = [...research].sort((a: ResearchSortableItem, b: ResearchSortableItem) => {
    let comparison = 0;

    switch (sortBy) {
      case 'date':
        comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        break;
      case 'name':
        const nameA = a.name || a.basic?.name || '';
        const nameB = b.name || b.basic?.name || '';
        comparison = nameA.localeCompare(nameB);
        break;
      case 'progress':
        comparison = (a.progress || 0) - (b.progress || 0);
        break;
      case 'status':
        comparison = a.status.localeCompare(b.status);
        break;
    }

    return direction === 'desc' ? -comparison : comparison;
  });

  return sorted;
};
