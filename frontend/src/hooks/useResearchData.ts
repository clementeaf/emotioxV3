/**
 * Hook para gestionar datos de investigación usando TanStack Query
 * Implementación con nueva arquitectura de dominios
 */

import { useResearchById, useUpdateResearch, useDeleteResearch } from '@/api/domains/research';
import { ResearchRecord, ResearchStage } from '../../../shared/interfaces/research.interface';
import type { ResearchAPIResponse } from '@/shared/types/research.types';

interface UseResearchDataReturn {
  research: ResearchRecord | null;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
  updateResearchRecord: (data: Partial<ResearchRecord>) => Promise<void>;
  deleteResearchRecord: () => Promise<void>;
}

/**
 * Hook principal para datos de investigación con nueva arquitectura
 */
export const useResearchRecordData = (researchId: string | null): UseResearchDataReturn => {
  // Usar los hooks de la nueva arquitectura
  const { data: research, isLoading: loading, error, refetch } = useResearchById(researchId || '');
  const updateMutation = useUpdateResearch();
  const deleteMutation = useDeleteResearch();

  // Convertir formato si es necesario
  const researchRecord: ResearchRecord | null = research as unknown as ResearchRecord | null;

  // Función para actualizar investigación
  const updateResearchRecord = async (data: Partial<ResearchRecord>) => {
    if (!researchId) throw new Error('No research ID provided');

    await updateMutation.mutateAsync({
      id: researchId,
      data: data as any // Convertir tipos si es necesario
    });
  };

  // Función para eliminar investigación
  const deleteResearchRecord = async () => {
    if (!researchId) throw new Error('No research ID provided');

    await deleteMutation.mutateAsync(researchId);
  };

  return {
    research: researchRecord,
    loading: loading || updateMutation.isPending || deleteMutation.isPending,
    error: error as Error | null,
    refetch,
    updateResearchRecord,
    deleteResearchRecord
  };
};

/**
 * Hook simplificado para obtener research por ID
 */
export const useResearchData = (researchId: string) => {
  const { data, isLoading, error } = useResearchById(researchId);

  return {
    research: data,
    loading: isLoading,
    error: error as Error | null
  };
};

/**
 * Hook para obtener lista de investigaciones
 */
export const useResearchListData = () => {
  // Ya tenemos esto en la nueva arquitectura como useResearchList
  // Este hook es solo para compatibilidad con código existente
  const { useResearchList } = require('@/api/domains/research');
  return useResearchList();
};

// Mantener exports para compatibilidad
export { useResearchRecordData as default };