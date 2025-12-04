import { useState, useCallback } from 'react';
import { useParticipantStore } from '../stores/useParticipantStore';
import { useTestStore } from '../stores/useTestStore';
// import { getApiUrl } from '../utils/apiConfig'; // TODO: Implementar getApiUrl

interface UseDemographicSaveProps {
  currentQuestionKey?: string;
}

export const useDemographicSave = ({ currentQuestionKey = 'demographics' }: UseDemographicSaveProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const { researchId } = useTestStore();
  const { getParticipantId } = useParticipantStore();

  const optimizeDemographicData = useCallback((data: Record<string, string>): Record<string, string> => {
    const optimized: Record<string, string> = {};
    for (const [key, value] of Object.entries(data)) {
      optimized[key] = value.length > 100 ? value.substring(0, 100) + '...' : value;
    }
    return optimized;
  }, []);

  const saveDemographicsToBackend = useCallback(async (
    demographicsData: Record<string, string>, 
    isDisqualified: boolean = false
  ) => {
    try {
      setIsLoading(true);
      const timestamp = new Date().toISOString();
      const now = new Date().toISOString();
      const participantId = getParticipantId();

      const optimizedDemographicsData = optimizeDemographicData(demographicsData);

      const createData = {
        researchId: researchId || '',
        participantId: participantId,
        questionKey: currentQuestionKey,
        responses: [{
          questionKey: currentQuestionKey,
          response: optimizedDemographicsData,
          timestamp,
          createdAt: now
        }],
        metadata: {
          isDisqualified,
          disqualificationType: 'demographics',
          createdAt: now
        }
      };

      const apiUrl = `${process.env.REACT_APP_API_URL || 'http://localhost:3000'}/api/module-responses`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(createData)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Error guardando demográficos: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('[useDemographicSave] Error saving demographics:', error);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [researchId, getParticipantId, currentQuestionKey, optimizeDemographicData]);

  return {
    isLoading,
    saveDemographicsToBackend
  };
};
