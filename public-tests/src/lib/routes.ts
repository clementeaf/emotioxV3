import { apiRequest, API_CONFIG } from './alova';
import { AvailableFormsResponse, CreateModuleResponseDto, ParticipantResponsesDocument, UpdateModuleResponseDto } from './types';
import { AxiosError } from 'axios';

export const getAvailableForms = async (researchId: string): Promise<AvailableFormsResponse> => {
  const result = await apiRequest<AvailableFormsResponse>(`/research/${researchId}/forms`, {
    method: 'GET'
  });

  // 🔍 LOG DE LA RESPUESTA RAW - REMOVIDO

  return result;
};

// 🎯 ALINEADO CON BACKEND: saveModuleResponse retorna ParticipantResponsesDocument
export const saveModuleResponse = async (data: CreateModuleResponseDto): Promise<ParticipantResponsesDocument> => {
  // 🎯 DEBUG: Log del payload antes de enviar
  if (data.questionKey.includes('cognitive') || data.questionKey.includes('smartvoc')) {
    console.log('[saveModuleResponse] Payload a enviar:', JSON.stringify(data, null, 2));
  }
  
  try {
    return await apiRequest<ParticipantResponsesDocument>('/module-responses', {
      method: 'POST',
      data
    });
  } catch (error) {
    // 🎯 Capturar y loggear el error del backend
    if (error instanceof AxiosError && error.response) {
      const errorData = error.response.data;
      console.error('[saveModuleResponse] ❌ Error del backend:', {
        status: error.response.status,
        statusText: error.response.statusText,
        data: errorData,
        dataStringified: JSON.stringify(errorData, null, 2),
        payload: data
      });
      
      // 🎯 Log detallado del error si es un objeto
      if (errorData && typeof errorData === 'object') {
        console.error('[saveModuleResponse] Detalles del error:', {
          error: errorData.error,
          message: errorData.message,
          details: errorData.details,
          issues: errorData.issues
        });
      }
    }
    throw error;
  }
};

// 🎯 ALINEADO CON BACKEND: updateModuleResponse retorna ParticipantResponsesDocument
export const updateModuleResponse = async (responseId: string, data: UpdateModuleResponseDto): Promise<ParticipantResponsesDocument> => {
  return apiRequest<ParticipantResponsesDocument>(`/module-responses/${responseId}`, {
    method: 'PUT',
    params: {
      researchId: data.researchId,
      participantId: data.participantId
    },
    data
  });
};

export const getModuleResponses = async (researchId: string, participantId: string): Promise<ParticipantResponsesDocument> => {
  try {
    // 🎯 Usar axiosInstance directamente para capturar 404 antes del interceptor
    const response = await API_CONFIG.request<ParticipantResponsesDocument>({
      url: '/module-responses',
      method: 'GET',
      params: { researchId, participantId }
    });
    return response.data;
  } catch (error) {
    // 🎯 404 es un caso normal cuando un participante nuevo no tiene respuestas guardadas
    // Retornar un documento vacío en lugar de lanzar error
    if (error instanceof AxiosError && error.response?.status === 404) {
      return {
        id: '',
        researchId,
        participantId,
        responses: [],
        metadata: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isCompleted: false
      };
    }
    // Para otros errores, re-lanzar el error (el interceptor lo convertirá en Error genérico)
    throw error;
  }
};

export const deleteAllResponses = async (researchId: string, participantId: string): Promise<{ message: string; status: number }> => {
  return apiRequest<{ message: string; status: number }>('/module-responses', {
    method: 'DELETE',
    params: { researchId, participantId }
  });
};
