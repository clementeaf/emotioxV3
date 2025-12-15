import axios, { type AxiosInstance, type AxiosRequestConfig, type InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '../../stores/auth.store';
import type { ApiErrorResponse } from './types';

// Ya no necesitamos verificar expiración de tokens en el frontend
// El backend maneja esto automáticamente y devuelve 401 si el token expiró

/**
 * Cliente base para todas las peticiones API
 * Maneja autenticación, interceptores y configuración común
 */
class ApiClient {
    private client: AxiosInstance;
    private isRefreshing = false;
    private failedQueue: Array<{
        resolve: (value?: unknown) => void;
        reject: (error?: unknown) => void;
    }> = [];

    constructor(baseURL: string) {
        this.client = axios.create({
            baseURL,
            headers: {
                'Content-Type': 'application/json',
            },
            withCredentials: true, // Importante: enviar cookies automáticamente
            timeout: 30000, // 30 segundos timeout global
        });

        this.setupInterceptors();
    }

    /**
     * Procesa la cola de peticiones fallidas después de refrescar el token
     */
    private processQueue(error: unknown | null, _token: string | null = null): void {
        // Process all queued requests
        this.failedQueue.forEach((prom) => {
            if (error) {
                prom.reject(error);
            } else {
                prom.resolve();
            }
        });

        // Clear the queue
        this.failedQueue = [];
    }

    /**
     * Configura interceptores para requests y responses
     */
    private setupInterceptors(): void {
        // Request interceptor: agregar token en Authorization header
        // TEMPORAL: API Gateway no está pasando cookies, así que usamos header
        this.client.interceptors.request.use(
            async (config: InternalAxiosRequestConfig) => {
                const state = useAuthStore.getState();
                if (state.token && config.headers) {
                    config.headers.Authorization = `Bearer ${state.token}`;
                }
                // También intentar enviar cookies (withCredentials: true)
                return config;
            },
            (error) => Promise.reject(error)
        );

        // Response interceptor: maneja errores 401 (no autorizado)
        this.client.interceptors.response.use(
            (response) => response,
            async (error: ApiErrorResponse) => {
                const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

                // Si es un error 401 y no hemos intentado refrescar
                if (error.response?.status === 401 && !originalRequest._retry) {
                    originalRequest._retry = true;

                    if (this.isRefreshing) {
                        // Si ya se está refrescando, esperar en la cola
                        return new Promise((resolve, reject) => {
                            this.failedQueue.push({
                                resolve: () => {
                                    // Reintentar la petición original (las cookies se envían automáticamente)
                                    resolve(this.client(originalRequest));
                                },
                                reject,
                            });
                        });
                    }

                    this.isRefreshing = true;

                    try {
                        // Intentar refrescar el token (el refreshToken viene de la cookie)
                        const state = useAuthStore.getState();
                        const refreshPromise = state.refreshAccessToken();
                        const timeoutPromise = new Promise((_, reject) => 
                            setTimeout(() => reject(new Error('Token refresh timeout')), 10000)
                        );
                        
                        await Promise.race([refreshPromise, timeoutPromise]);
                        
                        // Procesar cola de peticiones pendientes
                        this.processQueue(null, null);
                        
                        // Reintentar la petición original (las cookies actualizadas se envían automáticamente)
                        return this.client(originalRequest);
                    } catch (refreshError) {
                        console.error('Token refresh failed:', refreshError);
                        this.processQueue(refreshError, null);
                        useAuthStore.getState().logout();
                        return Promise.reject(refreshError);
                    } finally {
                        this.isRefreshing = false;
                    }
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

const apiClient = new ApiClient(import.meta.env.VITE_API_URL || 'http://localhost:3000');

export default apiClient;

