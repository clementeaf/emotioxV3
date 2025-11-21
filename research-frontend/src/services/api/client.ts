import axios, { type AxiosInstance, type AxiosRequestConfig } from 'axios';
import { useAuthStore } from '../../stores/auth.store';
import type { ApiErrorResponse } from './types';

/**
 * Cliente base para todas las peticiones API
 * Maneja autenticación, interceptores y configuración común
 */
class ApiClient {
    private client: AxiosInstance;

    constructor(baseURL: string) {
        this.client = axios.create({
            baseURL,
            headers: {
                'Content-Type': 'application/json',
            },
        });

        this.setupInterceptors();
    }

    /**
     * Configura interceptores para requests y responses
     */
    private setupInterceptors(): void {
        // Request interceptor: agrega token de autenticación
        this.client.interceptors.request.use(
            (config) => {
                const token = useAuthStore.getState().token;
                if (token) {
                    config.headers.Authorization = `Bearer ${token}`;
                }
                return config;
            },
            (error) => Promise.reject(error)
        );

        // Response interceptor: maneja errores 401 (no autorizado)
        this.client.interceptors.response.use(
            (response) => response,
            (error: ApiErrorResponse) => {
                if (error.response?.status === 401) {
                    useAuthStore.getState().logout();
                }
                return Promise.reject(error);
            }
        );
    }

    /**
     * Realiza una petición GET
     * @param url - URL del endpoint
     * @param config - Configuración adicional de Axios
     * @returns Promise con la respuesta
     */
    async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
        const response = await this.client.get<T>(url, config);
        return response.data;
    }

    /**
     * Realiza una petición POST
     * @param url - URL del endpoint
     * @param data - Datos a enviar
     * @param config - Configuración adicional de Axios
     * @returns Promise con la respuesta
     */
    async post<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
        const response = await this.client.post<T>(url, data, config);
        return response.data;
    }

    /**
     * Realiza una petición PUT
     * @param url - URL del endpoint
     * @param data - Datos a enviar
     * @param config - Configuración adicional de Axios
     * @returns Promise con la respuesta
     */
    async put<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
        const response = await this.client.put<T>(url, data, config);
        return response.data;
    }

    /**
     * Realiza una petición PATCH
     * @param url - URL del endpoint
     * @param data - Datos a enviar
     * @param config - Configuración adicional de Axios
     * @returns Promise con la respuesta
     */
    async patch<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
        const response = await this.client.patch<T>(url, data, config);
        return response.data;
    }

    /**
     * Realiza una petición DELETE
     * @param url - URL del endpoint
     * @param config - Configuración adicional de Axios
     * @returns Promise con la respuesta
     */
    async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
        const response = await this.client.delete<T>(url, config);
        return response.data;
    }

    /**
     * Obtiene la instancia de Axios (para casos especiales)
     * @returns Instancia de Axios
     */
    getInstance(): AxiosInstance {
        return this.client;
    }
}

const apiClient = new ApiClient(import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000');

export default apiClient;

