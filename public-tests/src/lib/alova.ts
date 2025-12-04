import axios, { AxiosError, AxiosRequestConfig } from 'axios';
import { API_HTTP_ENDPOINT } from '../config/endpoints';

// Instancia de axios configurada
const axiosInstance = axios.create({
  baseURL: API_HTTP_ENDPOINT,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

// Interceptor para manejo de errores
axiosInstance.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    // 🎯 Permitir que 404 y 400 en /module-responses pasen sin modificar para manejo específico
    const isModuleResponsesError = error.config?.url?.includes('/module-responses') && 
                                   (error.response?.status === 404 || error.response?.status === 400);
    
    if (isModuleResponsesError) {
      // Re-lanzar el error original de Axios para que pueda ser manejado específicamente
      return Promise.reject(error);
    }

    // Mensajes de error personalizados para otros casos
    if (error.code === 'ECONNABORTED') {
      throw new Error('La solicitud tardó demasiado en completarse');
    }

    if (error.response?.status === 404) {
      throw new Error('Recurso no encontrado');
    }

    if (error.response?.status === 500) {
      throw new Error('Error interno del servidor');
    }

    if (error.response?.status && error.response.status >= 400 && error.response.status < 500) {
      // 🎯 Preservar el mensaje de error del backend si está disponible
      const errorData = error.response.data as { error?: string; message?: string } | undefined;
      const errorMessage = errorData?.error || errorData?.message || 'Error en la solicitud';
      const errorObj = new Error(errorMessage);
      (errorObj as unknown as { response?: unknown }).response = error.response;
      throw errorObj;
    }

    throw new Error('Error de conexión');
  }
);

// Función de request compatible con la firma anterior
const apiRequest = async <T>(
  url: string,
  options: AxiosRequestConfig = {}
): Promise<T> => {
  const response = await axiosInstance.request<T>({
    url,
    ...options
  });
  return response.data;
};

export { axiosInstance as API_CONFIG, apiRequest };
