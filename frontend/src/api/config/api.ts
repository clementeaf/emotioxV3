/**
 * Configuración API Centralizada para EmotioXV2
 * ÚNICA FUENTE DE VERDAD para toda la configuración de API
 * Prioriza endpoints dinámicos sincronizados desde AWS Lambda
 */

import { DYNAMIC_API_ENDPOINTS, isEndpointsSynced } from '../dynamic-endpoints';

// URLs base - Priorizar endpoints dinámicos, fallback a variables de entorno
export const API_BASE_URL = isEndpointsSynced()
  ? DYNAMIC_API_ENDPOINTS.http
  : (process.env.NEXT_PUBLIC_API_URL || DYNAMIC_API_ENDPOINTS.http);

export const WS_BASE_URL = isEndpointsSynced()
  ? DYNAMIC_API_ENDPOINTS.ws
  : (process.env.NEXT_PUBLIC_WS_URL || DYNAMIC_API_ENDPOINTS.ws);

// Validación de seguridad - BLOQUEAR localhost solo en producción
const isDevelopment = process.env.NODE_ENV !== 'production';
if (typeof window !== 'undefined' && !isDevelopment && (API_BASE_URL.includes('localhost') || API_BASE_URL.includes('127.0.0.1'))) {
  throw new Error('Configuración de API inválida: No se permite localhost en producción');
}

// URL de fallback segura - Solo si no hay configuración
const FALLBACK_API_URL = process.env.NEXT_PUBLIC_API_URL || '';
export const SECURE_API_BASE_URL = (!isDevelopment && (API_BASE_URL.includes('localhost') || API_BASE_URL.includes('127.0.0.1')))
  ? FALLBACK_API_URL
  : API_BASE_URL;

/**
 * Configuración de endpoints simplificada
 */
export const API_ENDPOINTS = {
  // Autenticación
  auth: {
    login: '/auth/login',
    register: '/auth/register',
    logout: '/auth/logout',
    refreshToken: '/auth/refreshToken',
    profile: '/auth/profile',
  },

  // Empresas
  companies: {
    getAll: '/companies',
    getById: '/companies/{id}',
    create: '/companies',
    update: '/companies/{id}',
    delete: '/companies/{id}',
  },

  // Investigaciones
  research: {
    create: '/research',
    getAll: '/research',
    getById: '/research/{id}',
    update: '/research/{id}',
    delete: '/research/{id}',
    updateStatus: '/research/{id}/status',
    updateStage: '/research/{id}/stage',
  },

  // Pantallas de bienvenida (Rutas CORRECTAS según backend)
  'welcome-screen': {
    getByResearch: '/research/{researchId}/welcome-screen',
    save: '/research/{researchId}/welcome-screen',
    update: '/research/{researchId}/welcome-screen',
    delete: '/research/{researchId}/welcome-screen',
  },

  // Pantallas de agradecimiento (Rutas corregidas y unificadas)
  thankYouScreen: {
    getByResearch: '/research/{researchId}/thank-you-screen',
    save: '/research/{researchId}/thank-you-screen', // POST para crear/actualizar
    delete: '/research/{researchId}/thank-you-screen',
  },

  // SmartVOC
  smartVoc: {
    getByResearch: '/research/{researchId}/smart-voc',
    create: '/research/{researchId}/smart-voc',
    update: '/research/{researchId}/smart-voc/{formId}',
    delete: '/research/{researchId}/smart-voc',
  },

  // Eye Tracking
  eyeTracking: {
    getByResearch: '/research/{researchId}/eye-tracking',
    create: '/research/{researchId}/eye-tracking',
    update: '/research/{researchId}/eye-tracking',
    delete: '/research/{researchId}/eye-tracking',
  },

  // Eye Tracking Recruit
  eyeTrackingRecruit: {
    getConfigByResearch: '/eye-tracking-recruit/research/{researchId}',
    createConfig: '/eye-tracking-recruit/research/{researchId}',
    updateConfig: '/eye-tracking-recruit/research/{researchId}',
    delete: '/eye-tracking-recruit/research/{researchId}',
    createParticipant: '/eye-tracking-recruit/config/{configId}/participant',
    updateParticipantStatus: '/eye-tracking-recruit/participant/{participantId}/status',
    getParticipants: '/eye-tracking-recruit/config/{configId}/participants',
    getStats: '/eye-tracking-recruit/config/{configId}/stats',
    generateLink: '/eye-tracking-recruit/config/{configId}/link',
    getActiveLinks: '/eye-tracking-recruit/config/{configId}/links',
    deactivateLink: '/eye-tracking-recruit/link/{token}/deactivate',
    validateLink: '/eye-tracking-recruit/link/{token}/validate',
    getResearchSummary: '/eye-tracking-recruit/research/{researchId}/summary',
    registerPublicParticipant: '/eye-tracking-recruit/public/participant/start',
    updatePublicParticipantStatus: '/eye-tracking-recruit/public/participant/{participantId}/status',
  },

  // Tareas cognitivas
  cognitiveTask: {
    getByResearch: '/research/{researchId}/cognitive-task',
    create: '/research/{researchId}/cognitive-task',
    update: '/research/{researchId}/cognitive-task',
    delete: '/research/{researchId}/cognitive-task',
    getUploadUrl: '/research/{researchId}/cognitive-task/upload-url',
  },

  // S3
  s3: {
    upload: '/s3/upload',
    download: '/s3/download',
    deleteObject: '/s3/delete-object',
  },

  // Module Responses (para datos de public-tests)
  moduleResponses: {
    getResponsesByResearch: '/module-responses/research/{researchId}',
    getResponsesGroupedByQuestion: '/module-responses/grouped-by-question/{researchId}',
    getResponsesForParticipant: '/research/{researchId}/participant/{participantId}/responses',
    saveResponse: '/module-responses',
    updateResponse: '/module-responses/{responseId}',
    deleteAllResponses: '/research/{researchId}/participant/{participantId}/responses',
    getSmartVOCResults: '/module-responses/smartvoc/{researchId}',
    getCPVResults: '/module-responses/cpv/{researchId}',
    getTrustFlowResults: '/module-responses/trustflow/{researchId}',
  },

  // Participants (para datos de public-tests)
  participants: {
    getAll: '/participants',
    getById: '/participants/{id}',
    login: '/participants/login',
    create: '/participants',
    delete: '/participants/{id}',
    generate: '/participants/generate',
    deleteParticipant: '/research/{researchId}/participants/{participantId}',
  },

  // Research In Progress (para vista de investigación en curso)
  researchInProgress: {
    getParticipantsWithStatus: '/research/{researchId}/participants/status',
    getOverviewMetrics: '/research/{researchId}/metrics',
    getParticipantsByResearch: '/research/{researchId}/participants',
    getParticipantDetails: '/research/{researchId}/participants/{participantId}',
    deleteParticipant: '/research/{researchId}/participants/{participantId}',
    getResearchConfiguration: '/eye-tracking-recruit/research/{researchId}',
  },

  // Admin (administración de usuarios)
  admin: {
    users: '/admin/users',
    user: '/admin/users/{id}',
    stats: '/admin/users/stats',
  },
} as const;

/**
 * Tipos TypeScript para los endpoints
 */
export type ApiCategory = keyof typeof API_ENDPOINTS;
export type ApiOperation<T extends ApiCategory> = keyof typeof API_ENDPOINTS[T];

/**
 * Cliente API simplificado y seguro
 */
export class ApiClient {
  private baseUrl: string;
  private defaultHeaders: Record<string, string>;

  constructor(baseUrl: string = SECURE_API_BASE_URL) {
    this.baseUrl = baseUrl;
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    if (!isDevelopment && (this.baseUrl.includes('localhost') || this.baseUrl.includes('127.0.0.1'))) {
      this.baseUrl = FALLBACK_API_URL;
    }
  }

  /**
   * Establece el token de autenticación
   */
  setAuthToken(token: string): void {
    this.defaultHeaders.Authorization = `Bearer ${token}`;
  }

  /**
   * Limpia el token de autenticación
   */
  clearAuthToken(): void {
    delete this.defaultHeaders.Authorization;
  }

  /**
   * Construye una URL completa reemplazando parámetros
   */
  private buildUrl(endpoint: string, params?: Record<string, string>): string {
    let url = endpoint;

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url = url.replace(`{${key}}`, value);
      });
    }

    if (/\{[^\/]+\}/.test(url)) {
      throw new Error(`Parámetros no reemplazados en URL: ${url}`);
    }

    const fullUrl = url.startsWith('/') ? `${this.baseUrl}${url}` : `${this.baseUrl}/${url}`;

    if (!isDevelopment && (fullUrl.includes('localhost') || fullUrl.includes('127.0.0.1'))) {
      throw new Error('URL de API no puede ser localhost - Solo AWS Lambda permitido');
    }

    return fullUrl;
  }

  /**
   * Obtiene el endpoint completo
   */
  getEndpoint(
    category: string,
    operation: string,
    params?: Record<string, string>
  ): string {
    const categoryEndpoints = (API_ENDPOINTS as any)[category];
    if (!categoryEndpoints) {
      throw new Error(`Categoría de API no encontrada: ${category}. Categorías disponibles: ${Object.keys(API_ENDPOINTS).join(', ')}`);
    }

    const endpoint = categoryEndpoints[operation] as string;
    if (!endpoint) {
      throw new Error(`Operación '${operation}' no encontrada en categoría '${category}'. Operaciones disponibles: ${Object.keys(categoryEndpoints).join(', ')}`);
    }

    return this.buildUrl(endpoint, params);
  }

  /**
   * Realiza una petición GET
   */
  async get<T = any>(
    category: string,
    operation: string,
    params?: Record<string, string>,
    queryParams?: Record<string, string>
  ): Promise<T> {
    const url = this.getEndpoint(category, operation, params);
    const finalUrl = queryParams
      ? `${url}?${new URLSearchParams(queryParams)}`
      : url;

    const response = await fetch(finalUrl, {
      method: 'GET',
      headers: this.defaultHeaders,
    });

    return this.handleResponse<T>(response);
  }

  /**
   * Realiza una petición POST
   */
  async post<T = any>(
    category: string,
    operation: string,
    data?: any,
    params?: Record<string, string>
  ): Promise<T> {
    const url = this.getEndpoint(category, operation, params);

    const response = await fetch(url, {
      method: 'POST',
      headers: this.defaultHeaders,
      body: JSON.stringify(data),
    });

    return this.handleResponse<T>(response);
  }

  /**
   * Realiza una petición PUT
   */
  async put<T = any>(
    category: string,
    operation: string,
    data?: any,
    params?: Record<string, string>
  ): Promise<T> {
    const url = this.getEndpoint(category, operation, params);

    const response = await fetch(url, {
      method: 'PUT',
      headers: this.defaultHeaders,
      body: JSON.stringify(data),
    });

    return this.handleResponse<T>(response);
  }

  /**
   * Realiza una petición DELETE
   */
  async delete<T = any>(
    category: string,
    operation: string,
    params?: Record<string, string>
  ): Promise<T> {
    const url = this.getEndpoint(category, operation, params);

    const response = await fetch(url, {
      method: 'DELETE',
      headers: this.defaultHeaders,
    });

    return this.handleResponse<T>(response);
  }

  /**
   * Maneja la respuesta de la API
   */
  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      let errorData: any;
      try {
        errorData = await response.json();
      } catch {
        errorData = { message: 'Error desconocido' };
      }

      // Lista de endpoints que pueden devolver 404 de forma normal (no son errores)
      const expectedNotFoundEndpoints = [
        '/cognitive-task',
        '/welcome-screen',
        '/smart-voc',
        '/thank-you-screen'
      ];

      // Si es un 404 en un endpoint esperado, devolver null en lugar de lanzar error
      if (response.status === 404) {
        const isExpectedNotFound = expectedNotFoundEndpoints.some(endpoint =>
          response.url.includes(endpoint)
        );

        if (isExpectedNotFound) {
          return null as T;
        }
      }

      // Para otros errores, usar el mensaje específico del backend si está disponible
      const errorMessage = errorData.message || `Error ${response.status}: ${response.statusText}`;

      throw new ApiError(
        errorMessage,
        response.status,
        errorData
      );
    }

    try {
      const data = await response.json();

      // Adaptar respuesta del backend al formato esperado por el frontend
      if (data && typeof data === 'object' && 'data' in data && 'status' in data) {
        // El backend devuelve { data: [...], status: 200 }
        // Convertir a { success: true, data: [...] }
        return {
          success: data.status >= 200 && data.status < 300,
          data: data.data,
          message: data.message,
          error: data.error
        } as T;
      }

      return data;
    } catch (error) {
      throw new ApiError(
        'Error al parsear respuesta JSON',
        response.status,
        null
      );
    }
  }
}

/**
 * Clase de error personalizada para la API
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public data: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Instancia global del cliente API
 */
export const apiClient = new ApiClient();

/**
 * Cliente específico para Module Responses
 */
export const moduleResponsesAPI = {
  // Obtener respuestas por research (estructura original)
  getResponsesByResearch: async (researchId: string) => {
    const response = await apiClient.get('moduleResponses', 'getResponsesByResearch', { researchId });
    return response;
  },

  // Obtener respuestas agrupadas por pregunta (nueva estructura optimizada)
  getResponsesGroupedByQuestion: async (researchId: string) => {
    const response = await apiClient.get('moduleResponses', 'getResponsesGroupedByQuestion', { researchId });
    return response;
  },

  // Obtener resultados específicos para CPVCard
  getCPVResults: async (researchId: string) => {
    const response = await apiClient.get('moduleResponses', 'getCPVResults', { researchId });
    return response;
  },

  // Obtener resultados específicos para TrustRelationshipFlow
  getTrustFlowResults: async (researchId: string) => {
    const response = await apiClient.get('moduleResponses', 'getTrustFlowResults', { researchId });
    return response;
  },

  // Obtener respuestas para un participante en una investigación
  getResponsesForParticipant: (researchId: string, participantId: string) =>
    apiClient.get('moduleResponses', 'getResponsesForParticipant', { researchId, participantId }),

  saveResponse: (data: any) =>
    apiClient.post('moduleResponses', 'saveResponse', data),

  updateResponse: (responseId: string, data: any) =>
    apiClient.put('moduleResponses', 'updateResponse', data, { responseId }),

  deleteAllResponses: (researchId: string, participantId: string) =>
    apiClient.delete('moduleResponses', 'deleteAllResponses', { researchId, participantId }),

  getSmartVOCResults: (researchId: string) =>
    apiClient.get('moduleResponses', 'getSmartVOCResults', { researchId }),
};

/**
 * Función helper para obtener URL completa - SEGURA
 */
export function getApiUrl(path: string): string {
  const cleanPath = path.startsWith('/') ? path.substring(1) : path;
  const fullUrl = `${SECURE_API_BASE_URL}/${cleanPath}`;

  if (!isDevelopment && (fullUrl.includes('localhost') || fullUrl.includes('127.0.0.1'))) {
    return `${FALLBACK_API_URL}/${cleanPath}`;
  }

  return fullUrl;
}

/**
 * Función helper para obtener URL de WebSocket
 */
export function getWebsocketUrl(): string {
  if (!isDevelopment && (WS_BASE_URL.includes('localhost') || WS_BASE_URL.includes('127.0.0.1'))) {
    return '';
  }

  return WS_BASE_URL;
}

/**
 * Función para validar que la configuración es segura
 */
/**
 * Función helper para obtener URL de Public Tests
 */
export function getPublicTestsUrl(researchId?: string, participantId?: string): string {
  // 🎯 DETECTAR ENTORNO AUTOMÁTICAMENTE
  const isDevelopment = typeof window !== 'undefined' && window.location.hostname === 'localhost';
  
  // URL base de public tests - LOCAL vs PRODUCCIÓN
  // 🎯 SIEMPRE USAR URL CORRECTA EN PRODUCCIÓN (ignorar variable de entorno si está incorrecta)
  const PUBLIC_TESTS_URL = isDevelopment 
    ? 'http://localhost:5173'  // 🏠 DESARROLLO LOCAL
    : 'https://d35071761848hm.cloudfront.net'; // 🌐 PRODUCCIÓN - URL CORRECTA

  let url = PUBLIC_TESTS_URL;
  if (researchId && participantId) {
    url += `?researchId=${researchId}&userId=${participantId}`;
  }

  // Debug log en desarrollo
  if (typeof window !== 'undefined' && !validateApiConfiguration()) {
    console.log('[api-config] Public Tests URL:', url, '| Entorno:', isDevelopment ? 'LOCAL' : 'PRODUCCIÓN');
  }

  return url;
}

/**
 * Función para validar que la configuración es segura
 */
export function validateApiConfiguration(): boolean {
  const isSecure = !SECURE_API_BASE_URL.includes('localhost') &&
    !SECURE_API_BASE_URL.includes('127.0.0.1') &&
    SECURE_API_BASE_URL.includes('execute-api.us-east-1.amazonaws.com');

  if (!isSecure) {
    return false;
  }

  return isSecure;
}

if (typeof window !== 'undefined') {
  validateApiConfiguration();
}
