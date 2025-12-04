import { useMutation, UseMutationOptions, useQuery, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import {
  deleteAllResponses,
  getAvailableForms,
  getModuleResponses,
  saveModuleResponse,
  updateModuleResponse
} from '../lib/routes';
import {
  AvailableFormsResponse,
  CreateModuleResponseDto,
  ParticipantResponsesDocument,
  UpdateModuleResponseDto,
} from '../lib/types';
import { useFormDataStore } from '../stores/useFormDataStore';
import { usePreviewModeStore } from '../stores/usePreviewModeStore';

export function useAvailableFormsQuery(researchId: string, options?: UseQueryOptions<AvailableFormsResponse, Error>) {
  return useQuery<AvailableFormsResponse, Error>({
    queryKey: ['availableForms', researchId],
    queryFn: async () => {
      const data = await getAvailableForms(researchId);

      // 🔍 LOG DETALLADO DE LA RESPUESTA DE FORMS - REMOVIDO

      return data;
    },
    enabled: !!researchId,
    staleTime: 1000 * 60 * 5, // 5 minutos
    gcTime: 1000 * 60 * 10, // 10 minutos
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    refetchOnReconnect: false,
    retry: 2,
    ...options,
  });
}

export function useModuleResponsesQuery(researchId: string, participantId: string, options?: UseQueryOptions<ParticipantResponsesDocument, Error>) {
  return useQuery<ParticipantResponsesDocument, Error>({
    queryKey: ['moduleResponses', researchId, participantId],
    queryFn: async () => {
      // 🎯 El error 404 ya está manejado en getModuleResponses
      const result = await getModuleResponses(researchId, participantId);
      const actualData = (result as { data?: ParticipantResponsesDocument }).data || result;
      return actualData;
    },
    enabled: !!researchId && !!participantId,
    staleTime: 0, // 🎯 NO cachear datos entre participantes
    gcTime: 1000 * 30, // 30 segundos solamente
    refetchOnWindowFocus: false,
    refetchOnMount: true, // 🎯 SIEMPRE refetch para nuevos participantes
    refetchOnReconnect: false,
    retry: (failureCount, error) => {
      // 🎯 No reintentar si es un 404 (participante sin respuestas es normal)
      // El 404 ya está manejado en getModuleResponses, pero por si acaso verificamos aquí también
      if (error instanceof AxiosError && error.response?.status === 404) {
        return false;
      }
      // Reintentar solo una vez para otros errores
      return failureCount < 1;
    },
    ...options,
  });
}

export function useSaveModuleResponseMutation(options?: UseMutationOptions<ParticipantResponsesDocument, Error, CreateModuleResponseDto>) {
  const queryClient = useQueryClient();
  return useMutation<ParticipantResponsesDocument, Error, CreateModuleResponseDto>({
    mutationFn: async (data) => {
      // 🎯 MODO PREVIEW: NO GUARDAR RESPUESTAS
      const { isPreviewMode } = usePreviewModeStore.getState();

      if (isPreviewMode) {
        // Preview mode logging removido

        // Retornar un mock response para que el flujo continúe
        return {
          id: 'preview-mock-id',
          researchId: data.researchId,
          participantId: data.participantId,
          questionKey: data.questionKey,
          responses: data.responses,
          quotaResult: undefined, // No hay validación de cuotas en preview
          metadata: data.metadata || {},
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          isCompleted: false,
        } as ParticipantResponsesDocument;
      }

      // Modo producción: guardar normalmente
      // Production mode logging removido
      return saveModuleResponse(data);
    },
    onSuccess: (data, variables) => {
      const { isPreviewMode } = usePreviewModeStore.getState();

      // 🔒 DESHABILITAR REFETCH AUTOMÁTICO PARA PREVENIR LOOPS
      // Solo invalidar queries si NO es modo preview Y NO es thank_you_screen
      if (!isPreviewMode && variables.questionKey !== 'thank_you_screen') {
        queryClient.invalidateQueries({
          queryKey: ['moduleResponses', variables.researchId, variables.participantId],
        });
      }

      // 🎯 GUARDAR RESULTADO DE CUOTA EN EL STORE SI EXISTE (solo en producción)
      if (!isPreviewMode && data.quotaResult && variables.questionKey === 'thank_you_screen') {
        const { setQuotaResult } = useFormDataStore.getState();
        setQuotaResult(data.quotaResult);
        // Quota verification logging removido
      }
    },
    ...options,
  });
}

export function useUpdateModuleResponseMutation(options?: UseMutationOptions<ParticipantResponsesDocument, Error, { responseId: string; data: UpdateModuleResponseDto }>) {
  const queryClient = useQueryClient();
  const userOnSuccess = options?.onSuccess;
  return useMutation<ParticipantResponsesDocument, Error, { responseId: string; data: UpdateModuleResponseDto }>({
    ...options,
    mutationFn: ({ responseId, data }) => updateModuleResponse(responseId, data),
    onSuccess: (data, variables, context, mutation) => {
      // Invalidar queries relacionadas con las respuestas del módulo
      queryClient.invalidateQueries({
        queryKey: ['moduleResponses'],
      });
      if (userOnSuccess) {
        (userOnSuccess as (data: ParticipantResponsesDocument, variables: { responseId: string; data: UpdateModuleResponseDto }, context: unknown) => void)(data, variables, context);
      }
    },
  });
}

export function useDeleteAllResponsesMutation(options?: UseMutationOptions<{ message: string; status: number }, Error, { researchId: string; participantId: string }>) {
  const queryClient = useQueryClient();
  const userOnSuccess = options?.onSuccess;
  const userOnError = options?.onError;
  return useMutation<{ message: string; status: number }, Error, { researchId: string; participantId: string }>({
    ...options,
    mutationFn: async ({ researchId, participantId }) => {
      return deleteAllResponses(researchId, participantId);
    },
    onSuccess: (data, variables, context, mutation) => {
      // Invalidar queries relacionadas con las respuestas del módulo
      queryClient.invalidateQueries({
        queryKey: ['moduleResponses', variables.researchId, variables.participantId],
      });
      if (userOnSuccess) {
        (userOnSuccess as (data: { message: string; status: number }, variables: { researchId: string; participantId: string }, context: unknown) => void)(data, variables, context);
      }
    },
    onError: (error, variables, context, mutation) => {
      // Error logging removido
      if (userOnError) {
        (userOnError as (error: Error, variables: { researchId: string; participantId: string }, context: unknown) => void)(error, variables, context);
      }
    },
  });
}
