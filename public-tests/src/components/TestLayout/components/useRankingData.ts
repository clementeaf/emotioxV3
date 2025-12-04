import { useEffect, useState } from 'react';
import { useModuleResponsesQuery } from '../../../hooks/useApiQueries';
import { useFormDataStore } from '../../../stores/useFormDataStore';
import { useTestStore } from '../../../stores/useTestStore';
import { UseRankingDataProps, RankingData } from './RankingListTypes';
import { parseRankingData } from './RankingListUtils';

/**
 * Hook para manejar la carga y gestión de datos de ranking
 */
export const useRankingData = ({ items, currentQuestionKey, initialFormData }: UseRankingDataProps): RankingData => {
  const [rankedItems, setRankedItems] = useState<string[]>(items);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { getFormData } = useFormDataStore();
  const { researchId, participantId } = useTestStore();

  const { data: moduleResponses } = useModuleResponsesQuery(
    researchId || '',
    participantId || ''
  );

  useEffect(() => {
    if (!currentQuestionKey) {
      setRankedItems(items);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      let dataSource: Record<string, unknown> | null = null;

      // 1. Intentar cargar desde backend
      if (moduleResponses?.responses) {
        const backendResponse = moduleResponses.responses.find(
          (response) => response.questionKey === currentQuestionKey
        );
        if (backendResponse?.response && 
            typeof backendResponse.response === 'object' && 
            backendResponse.response !== null && 
            'selectedValue' in backendResponse.response) {
          dataSource = backendResponse.response as Record<string, unknown>;
        }
      }

      // 2. Intentar cargar desde initialFormData
      if (!dataSource && initialFormData && 
          Object.keys(initialFormData).length > 0 && 
          initialFormData.selectedValue) {
        dataSource = initialFormData;
      }

      // 3. Intentar cargar desde localStorage
      if (!dataSource) {
        const localData = getFormData(currentQuestionKey);
        if (localData?.selectedValue) {
          dataSource = localData as Record<string, unknown>;
        }
      }

      // 4. Procesar datos encontrados
      if (dataSource?.selectedValue) {
        const parsedRanking = parseRankingData(dataSource.selectedValue);
        if (parsedRanking && parsedRanking.length > 0) {
          setRankedItems(parsedRanking);
          return;
        }
      }

      // 5. Usar items por defecto si no hay datos
      setRankedItems(items);

    } catch (err) {
      setError('Error al cargar datos de ranking');
      setRankedItems(items);
    } finally {
      setIsLoading(false);
    }
  }, [currentQuestionKey, moduleResponses, initialFormData, items, getFormData]);

  // Sincronizar con items cuando cambian
  useEffect(() => {
    if (items.length > 0 && rankedItems.length === 0) {
      setRankedItems(items);
    }
  }, [items, rankedItems.length]);

  return {
    rankedItems,
    isLoading,
    error
  };
};
