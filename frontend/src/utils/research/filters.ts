import type { ResearchAPIItem } from '@/types/research-api.types';

/**
 * Filtra datos de investigación por cliente específico
 *
 * @param research - Array de datos de investigación
 * @param clientId - ID del cliente para filtrar (null para mostrar todos)
 * @returns Array filtrado de investigaciones
 */
export const filterResearchByClient = (research: ResearchAPIItem[], clientId: string | null): ResearchAPIItem[] => {
  if (!clientId) {
    return research;
  }

  return research.filter((item: ResearchAPIItem) =>
    item.enterprise === clientId ||
    item.basic?.enterprise === clientId
  );
};

/**
 * Filtra investigaciones por estado
 *
 * @param research - Array de datos de investigación
 * @param status - Estado para filtrar
 * @returns Array filtrado de investigaciones
 */
export const filterResearchByStatus = (research: ResearchAPIItem[], status: string): ResearchAPIItem[] => {
  if (!status || status === 'all') {
    return research;
  }

  return research.filter((item: ResearchAPIItem) => item.status === status);
};

/**
 * Filtra investigaciones por rango de fechas
 *
 * @param research - Array de datos de investigación
 * @param startDate - Fecha de inicio
 * @param endDate - Fecha de fin
 * @returns Array filtrado de investigaciones
 */
export const filterResearchByDateRange = (
  research: ResearchAPIItem[],
  startDate?: Date,
  endDate?: Date
): ResearchAPIItem[] => {
  if (!startDate && !endDate) {
    return research;
  }

  return research.filter((item: ResearchAPIItem) => {
    const itemDate = new Date(item.createdAt);

    if (startDate && itemDate < startDate) {
      return false;
    }

    if (endDate && itemDate > endDate) {
      return false;
    }

    return true;
  });
};
