import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useStepStore } from '../stores/useStepStore';
import { useTestStore } from '../stores/useTestStore';
import { useModuleResponsesQuery } from './useApiQueries';

export const useStepStoreWithBackend = () => {
  const { researchId, participantId } = useTestStore();
  const { updateBackendResponses } = useStepStore();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (participantId) {
      queryClient.removeQueries({ queryKey: ['moduleResponses'] });
    }
  }, [participantId, queryClient]);

  const { data: moduleResponses, isLoading, error } = useModuleResponsesQuery(
    researchId || '',
    participantId || ''
  );

  useEffect(() => {
    if (moduleResponses?.responses && researchId && participantId) {
      const backendResponses = moduleResponses.responses.map((response: { questionKey: string; response: unknown }) => {
        return {
          questionKey: response.questionKey,
          response: response.response || {}
        };
      });

      updateBackendResponses(backendResponses);
    }
  }, [moduleResponses?.responses, researchId, participantId, updateBackendResponses]);

  return {
    isLoading,
    error
  };
};
