/**
 * Configuración centralizada de Axios
 * Base para todos los dominios de API
 */

import axios, { AxiosError, AxiosInstance } from 'axios';
import { DYNAMIC_API_ENDPOINTS, isEndpointsSynced } from '@/api/dynamic-endpoints';

// URLs base - Priorizar endpoints dinámicos
const API_BASE_URL = isEndpointsSynced()
  ? DYNAMIC_API_ENDPOINTS.http
  : (process.env.NEXT_PUBLIC_API_URL || DYNAMIC_API_ENDPOINTS.http);

// Validación de seguridad
if (typeof window !== 'undefined' && (API_BASE_URL.includes('localhost') || API_BASE_URL.includes('127.0.0.1'))) {
  const isDevelopment = process.env.NODE_ENV === 'development';
  if (!isDevelopment) {
    throw new Error('Configuración de API inválida: No se permite localhost en producción');
  }
}

// Función para obtener el token de autenticación
export const getAuthToken = (): string | null => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('token') || sessionStorage.getItem('token');
  }
  return null;
};

// Crear instancia de Axios
export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
  
});

// Interceptor de request
apiClient.interceptors.request.use(
  (config) => {
    // Always get fresh token from storage
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Sin timeout para endpoints específicos
    if (config.url?.includes('/research') || config.url?.includes('/companies')) {
      config.timeout = 0;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor de response
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error: AxiosError) => {
    // Manejar error de autenticación (401)
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('user');
        // No redirigir automáticamente - dejar que los componentes manejen la navegación
      }
    }

    return Promise.reject(error);
  }
);

// Función para actualizar el token
export const updateApiToken = (token: string | null) => {
  if (token) {
    localStorage.setItem('token', token);
    apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    localStorage.removeItem('token');
    delete apiClient.defaults.headers.common['Authorization'];
  }
};

export default apiClient;