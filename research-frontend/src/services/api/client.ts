import axios, { type AxiosInstance, type AxiosRequestConfig, type InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '../../stores/auth.store';
import type { ApiErrorResponse } from './types';
import { configService } from './config.service';

// Ya no necesitamos verificar expiración de tokens en el frontend
// El backend maneja esto automáticamente y devuelve 401 si el token expiró

/**
 * Cliente base para todas las peticiones API
 * Maneja autenticación, interceptores y configuración común
 */
class ApiClient {
    private client: AxiosInstance;
    private refreshPromise: Promise<string> | null = null;
    private isRefreshingFlag = false; // Immediate synchronous lock

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
     * Updates the base URL used by this API client.
     * @param baseURL - New API base URL
     */
    setBaseUrl(baseURL: string): void {
        this.client.defaults.baseURL = baseURL;
    }

    /**
     * Configura interceptores para requests y responses
     */
    private setupInterceptors(): void {
        // Request interceptor: attach token as Authorization header
        this.client.interceptors.request.use(
            async (config: InternalAxiosRequestConfig) => {
                const state = useAuthStore.getState();
                if (state.token && config.headers) {
                    config.headers.Authorization = `Bearer ${state.token}`;
                }
                return config;
            },
            (error) => Promise.reject(error)
        );

        // Response interceptor: handle 401 with automatic token refresh
        this.client.interceptors.response.use(
            (response) => response,
            async (error: ApiErrorResponse) => {
                const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

                const isRefreshEndpoint = originalRequest.url?.includes('/auth/refresh');
                const isTokenExpired = error.response?.status === 401 &&
                    !originalRequest._retry &&
                    !isRefreshEndpoint &&
                    originalRequest.url !== configService.getEndpoint('auth', 'me');

                if (isTokenExpired) {
                    originalRequest._retry = true;

                    if (!this.isRefreshingFlag) {
                        this.isRefreshingFlag = true;

                        this.refreshPromise = (async () => {
                            try {
                                const refreshEndpoint = configService.getEndpoint('auth', 'refresh');
                                const baseURL = this.client.defaults.baseURL;
                                if (typeof baseURL !== 'string' || baseURL.trim().length === 0) {
                                    throw new Error('API base URL not configured');
                                }

                                interface RefreshResponse {
                                    message: string;
                                    token?: string;
                                    refreshToken?: string;
                                    expiresIn?: number;
                                }

                                // Refresh token from httpOnly cookie (primary) or storage (fallback)
                                const refreshTokenFromStorage = localStorage.getItem('auth_refresh_token') ||
                                                                 sessionStorage.getItem('auth_refresh_token');

                                const refreshPayload: Record<string, string> = {};
                                if (refreshTokenFromStorage) {
                                    refreshPayload.refreshToken = refreshTokenFromStorage;
                                }

                                const refreshResponse = await axios.post<RefreshResponse>(
                                    `${baseURL}${refreshEndpoint}`,
                                    refreshPayload,
                                    {
                                        withCredentials: true,
                                        timeout: 10000,
                                        headers: { 'Content-Type': 'application/json' },
                                    }
                                );

                                const newToken = refreshResponse.data?.token;
                                if (typeof newToken !== 'string' || newToken.trim().length === 0) {
                                    throw new Error('Token refresh did not return access token');
                                }

                                useAuthStore.getState().setToken(newToken);
                                return newToken;
                            } catch (refreshError) {
                                // Only logout on auth-related failures (401, expired token)
                                const status = axios.isAxiosError(refreshError) ? refreshError.response?.status : undefined;
                                const errorMessage = refreshError instanceof Error ? refreshError.message : 'Unknown error';

                                if (status === 401 ||
                                    errorMessage.includes('Refresh token expired') ||
                                    errorMessage.includes('Refresh token invalid') ||
                                    errorMessage.includes('expired or invalid')) {
                                    useAuthStore.getState().logout();
                                }

                                throw refreshError;
                            } finally {
                                this.isRefreshingFlag = false;
                                this.refreshPromise = null;
                            }
                        })();
                    }

                    // All concurrent requests wait on the same refresh promise
                    try {
                        const newToken = await this.refreshPromise;

                        if (originalRequest.headers && newToken) {
                            originalRequest.headers.Authorization = `Bearer ${newToken}`;
                        }

                        // Ensure store is in sync
                        const currentToken = useAuthStore.getState().token;
                        if (currentToken !== newToken) {
                            useAuthStore.getState().setToken(newToken);
                        }

                        return this.client(originalRequest);
                    } catch (refreshError) {
                        return Promise.reject(refreshError);
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

const apiClient = new ApiClient('');

export default apiClient;

