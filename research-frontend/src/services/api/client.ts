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

                // Evitar loop infinito: no intentar refrescar si la petición fallida ES el refresh
                const isRefreshEndpoint = originalRequest.url?.includes('/auth/refresh');
                
                // Verificar si el 401 es realmente por token expirado
                // Algunos 401 pueden ser por permisos u otros motivos
                const isTokenExpired = error.response?.status === 401 && 
                    !originalRequest._retry && 
                    !isRefreshEndpoint &&
                    originalRequest.url !== configService.getEndpoint('auth', 'me');

                if (isTokenExpired) {
                    console.log('[ApiClient] 401 detected (likely expired token) for:', originalRequest.url);
                    originalRequest._retry = true;

                    // Check-and-set atómico usando flag síncrono para evitar múltiples refreshes
                    if (!this.isRefreshingFlag) {
                        this.isRefreshingFlag = true; // Bloquear INMEDIATAMENTE de forma síncrona
                        console.log('[ApiClient] Starting token refresh...');
                        
                        this.refreshPromise = (async () => {
                            try {
                                // Hacer el refresh directamente con axios, sin pasar por el interceptor
                                const refreshEndpoint = configService.getEndpoint('auth', 'refresh');
                                const baseURL = this.client.defaults.baseURL;
                                if (typeof baseURL !== 'string' || baseURL.trim().length === 0) {
                                    throw new Error('API base URL not configured');
                                }
                                
                                console.log('[ApiClient] Making refresh request to:', `${baseURL}${refreshEndpoint}`);

                                interface RefreshResponse {
                                    message: string;
                                    token?: string;
                                    refreshToken?: string;
                                    expiresIn?: number;
                                }

                                // El refresh token está en cookies httpOnly, el backend lo leerá automáticamente
                                // También intentar desde localStorage como fallback
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
                                        headers: {
                                            'Content-Type': 'application/json',
                                        },
                                    }
                                );

                                const newToken = refreshResponse.data?.token;
                                if (typeof newToken !== 'string' || newToken.trim().length === 0) {
                                    throw new Error('Token refresh did not return access token');
                                }

                                // NOTE: Cognito does NOT return a new refreshToken on refresh
                                // The original refreshToken remains valid until it expires or is revoked
                                // We keep the existing refreshToken in storage/cookies
                                
                                // Actualizar token en store (esto también lo guarda en storage)
                                // El refreshToken existente se mantiene (no se renueva)
                                useAuthStore.getState().setToken(newToken);
                                console.log('[ApiClient] Token refresh successful - new access token obtained');
                                
                                return newToken;
                            } catch (refreshError) {
                                console.error('[ApiClient] Token refresh failed:', refreshError);
                                
                                // Solo hacer logout si el refresh token expiró o es inválido (401)
                                // Otros errores (red, 500, etc.) no deberían cerrar la sesión
                                const status = axios.isAxiosError(refreshError) ? refreshError.response?.status : undefined;
                                const errorMessage = refreshError instanceof Error ? refreshError.message : 'Unknown error';
                                
                                if (status === 401 || 
                                    errorMessage.includes('Refresh token expired') || 
                                    errorMessage.includes('Refresh token invalid') ||
                                    errorMessage.includes('expired or invalid')) {
                                    console.log('[ApiClient] Refresh token expired or invalid (401), logging out');
                                    useAuthStore.getState().logout();
                                } else {
                                    console.warn('[ApiClient] Token refresh failed for non-auth reason, NOT logging out:', errorMessage);
                                }
                                
                                throw refreshError;
                            } finally {
                                this.isRefreshingFlag = false;
                                this.refreshPromise = null;
                            }
                        })();
                    } else {
                        console.log('[ApiClient] Waiting for ongoing refresh:', originalRequest.url);
                    }

                    // Todas las peticiones esperan la misma Promise
                    try {
                        const newToken = await this.refreshPromise;
                        
                        // CRÍTICO: Actualizar el header Authorization del request original con el nuevo token
                        // El token ya está actualizado en el store, pero debemos asegurar que el header esté actualizado
                        if (originalRequest.headers && newToken) {
                            originalRequest.headers.Authorization = `Bearer ${newToken}`;
                        }
                        
                        // Verificar que el token en el store esté sincronizado
                        const currentToken = useAuthStore.getState().token;
                        if (currentToken !== newToken) {
                            console.warn('[ApiClient] Token mismatch detected - store token differs from refreshed token');
                            // Forzar actualización del store si hay desincronización
                            useAuthStore.getState().setToken(newToken);
                        }
                        
                        // Reintentar la petición original con el nuevo token
                        console.log('[ApiClient] Retrying original request with new token');
                        return this.client(originalRequest);
                    } catch (refreshError) {
                        // Si el refresh falló, rechazar el error original
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

