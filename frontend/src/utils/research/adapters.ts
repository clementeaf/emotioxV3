import { ClientResearch } from '@/shared/interfaces/research.interface';
import type { ResearchAPIItem } from '@/types/research-api.types';

/**
 * Mapea estados de investigación al formato requerido por ClientResearch
 *
 * @param status - Estado original de la investigación
 * @returns Estado mapeado al formato estándar
 */
export const mapStatus = (status: string): 'pending' | 'in_progress' | 'completed' => {
  switch (status) {
    case 'draft':
      return 'pending';
    case 'in-progress':
      return 'in_progress';
    case 'completed':
      return 'completed';
    default:
      return 'pending';
  }
};

/**
 * Adaptador para convertir datos de Research de la API al formato ClientResearch
 *
 * @param data - Array de datos de investigación desde la API
 * @returns Array de datos adaptados al formato ClientResearch
 */
export const adaptResearchData = (data: unknown[]): ClientResearch[] => {
  return data.map((item: unknown) => {
    const researchItem = item as ResearchAPIItem;
    return {
      id: researchItem.id,
      name: researchItem.name || researchItem.basic?.name || 'Untitled Research',
      status: mapStatus(researchItem.status),
      progress: researchItem.progress || 0,
      date: researchItem.createdAt ? new Date(researchItem.createdAt).toLocaleDateString() : 'Unknown',
      researcher: 'Team Member'
    };
  });
};
