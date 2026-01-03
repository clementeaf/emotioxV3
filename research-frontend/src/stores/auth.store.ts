import axios from 'axios';
import { create } from 'zustand';
import type { User, LoginCredentials, LoginRequest, RegisterCredentials } from '../types/auth';
import { authService } from '../services/auth.service';
import apiClient from '../services/api/client';
import { configService } from '../services/api/config.service';

interface AuthState {
    user: User | null;
    token: string | null;
    rememberMe: boolean;
    isLoading: boolean;
    error: string | null;

    login: (credentials: LoginCredentials, rememberMe?: boolean) => Promise<void>;
    bootstrapSession: () => Promise<void>;
    register: (credentials: RegisterCredentials) => Promise<void>;
    updateProfile: (data: Partial<User>) => Promise<void>;
    deleteAccount: () => Promise<void>;
    logout: () => Promise<void>;
    setToken: (token: string | null) => void;
    clearError: () => void;
}

/**
 * Claves para localStorage (solo como fallback si las cookies no funcionan)
 * NOTA: Las cookies httpOnly son el método preferido y más seguro
 */
const STORAGE_KEYS = {
    TOKEN: 'auth_token',
    REFRESH_TOKEN: 'auth_refresh_token',
    REMEMBER_ME: 'auth_remember_me',
} as const;

/**
 * Guardar token en localStorage/sessionStorage
 * SOLO como fallback temporal si las cookies no funcionan correctamente
 * Las cookies httpOnly son el método preferido y más seguro
 */
const saveTokenToStorage = (token: string | null, refreshToken: string | null = null, rememberMe: boolean = false): void => {
    // Solo guardar si las cookies no están funcionando
    // Por ahora lo mantenemos como fallback temporal hasta que API Gateway pase cookies correctamente
    if (token && rememberMe) {
        localStorage.setItem(STORAGE_KEYS.TOKEN, token);
        localStorage.setItem(STORAGE_KEYS.REMEMBER_ME, 'true');
        if (refreshToken) {
            localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
        }
    } else if (token) {
        // Guardar en sessionStorage si no es rememberMe
        sessionStorage.setItem(STORAGE_KEYS.TOKEN, token);
        if (refreshToken) {
            sessionStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
        }
    } else {
        localStorage.removeItem(STORAGE_KEYS.TOKEN);
        localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
        sessionStorage.removeItem(STORAGE_KEYS.TOKEN);
        sessionStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
        localStorage.removeItem(STORAGE_KEYS.REMEMBER_ME);
    }
};

/**
 * Recuperar token de localStorage/sessionStorage
 * SOLO como fallback temporal si las cookies no funcionan correctamente
 */
const getTokenFromStorage = (): { token: string | null; rememberMe: boolean } => {
    // Solo recuperar si las cookies no están funcionando
    // Por ahora lo mantenemos como fallback temporal hasta que API Gateway pase cookies correctamente
    const rememberMe = localStorage.getItem(STORAGE_KEYS.REMEMBER_ME) === 'true';
    const token = rememberMe
        ? localStorage.getItem(STORAGE_KEYS.TOKEN)
        : sessionStorage.getItem(STORAGE_KEYS.TOKEN);
    return { token, rememberMe };
};

/**
 * Helper para ejecutar operaciones async con manejo de estado
 */
const asyncOperation = async <T>(
    set: (partial: Partial<AuthState>) => void,
    operation: () => Promise<T>,
    onSuccess: (result: T) => Partial<AuthState>,
    defaultErrorMessage: string,
    clearAuthOnError = false
): Promise<T> => {
    set({ isLoading: true, error: null });
    try {
        const result = await operation();
        set({ ...onSuccess(result), isLoading: false });
        return result;
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : defaultErrorMessage;
        const errorState: Partial<AuthState> = {
            error: message,
            isLoading: false,
        };

        if (clearAuthOnError) {
            errorState.user = null;
            errorState.token = null;
        }

        set(errorState);
        throw error;
    }
};

/**
 * Estado inicial de autenticación
 */
const initialState = {
    user: null,
    token: null, // Token en memoria solo para la sesión actual
    rememberMe: false,
    isLoading: false,
    error: null,
};

export const useAuthStore = create<AuthState>()((set) => ({
    ...initialState,

    login: async (credentials, rememberMe = false) => {
        set({ isLoading: true, error: null });
        try {
            // El login guarda tokens en cookies httpOnly (seguro y preferido)
            // El token en el body es TEMPORAL: solo para uso en Authorization header
            // hasta que API Gateway pase cookies correctamente
            const request: LoginRequest = { ...credentials, rememberMe };
            const loginResponse = await authService.login(request);
            
            // Guardar token en memoria (para Authorization header como fallback)
            // También guardar en storage como fallback temporal hasta que las cookies funcionen
            const token = loginResponse.token || null;
            const refreshToken = loginResponse.refreshToken || null;
            // TODO: Una vez que API Gateway pase cookies correctamente, eliminar esta línea
            saveTokenToStorage(token, refreshToken, rememberMe);
            set({ token, rememberMe });

            // Fetch user profile usando las cookies
            try {
                const userResponse = await authService.getMe();
                set({
                    user: userResponse.user,
                    isLoading: false,
                });
            } catch {
                // Si falla getMe, limpiar todo el estado para evitar inconsistencia
                saveTokenToStorage(null, null, false);
                set({
                    user: null,
                    token: null,
                    rememberMe: false,
                    isLoading: false,
                });
                throw new Error('Failed to fetch user profile');
            }
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Login failed';
            saveTokenToStorage(null, null, false);
            set({
                error: message,
                isLoading: false,
                user: null,
                token: null,
                rememberMe: false,
            });
            throw error;
        }
    },

    bootstrapSession: async () => {
        set({ isLoading: true, error: null });
        
        // TODO: Idealmente deberíamos confiar solo en cookies httpOnly
        // Por ahora, recuperar token de storage como fallback temporal
        // hasta que API Gateway pase cookies correctamente
        const { token: storedToken, rememberMe: storedRememberMe } = getTokenFromStorage();
        if (storedToken) {
            set({ token: storedToken, rememberMe: storedRememberMe });
        }
        
        try {
            // Intentar obtener el usuario usando las cookies httpOnly (método preferido)
            // Si hay cookies válidas, el backend las usará automáticamente
            // Si el access token expiró, el interceptor automáticamente intentará refrescar
            // Solo si el refresh token también expiró, entonces el interceptor hará logout
            const endpoint = configService.getEndpoint('auth', 'me');
            const userResponse = await apiClient.get<{ user: User }>(endpoint);
            
            // Si llegamos aquí, la autenticación fue exitosa (ya sea por cookies o por header)
            // El interceptor de axios manejará el refresh token automáticamente si es necesario
            // Si el token se actualizó durante el refresh, guardarlo como fallback
            const currentToken = useAuthStore.getState().token;
            if (currentToken && currentToken !== storedToken) {
                // TODO: Una vez que las cookies funcionen, eliminar esta línea
                // El refresh token no cambia normalmente, mantener el existente
                const storedRefreshToken = storedRememberMe
                    ? localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN)
                    : sessionStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
                saveTokenToStorage(currentToken, storedRefreshToken, storedRememberMe);
            }
            
            set({ user: userResponse.user, isLoading: false });
        } catch (error: unknown) {
            // NO limpiar el estado automáticamente en caso de 401
            // El interceptor de axios manejará el refresh automáticamente
            // Solo limpiar si el error NO es un 401 (porque el interceptor lo manejará)
            const status = axios.isAxiosError(error) ? error.response?.status : undefined;
            if (status === 401) {
                // El interceptor intentará refrescar automáticamente
                // Si el refresh falla, el interceptor hará logout
                // No hacer nada aquí, dejar que el interceptor maneje el refresh
                console.log('[bootstrapSession] 401 detected - interceptor will handle refresh automatically');
                set({ isLoading: false });
                return;
            }
            // Solo limpiar estado para errores que NO sean 401 (errores de red, 500, etc.)
            const message = error instanceof Error ? error.message : 'Failed to restore session';
            set({ isLoading: false, error: message });
        }
    },

    register: async (credentials) => {
                await asyncOperation(
                    set,
                    () => authService.register(credentials),
                    (response) => ({ user: response.user }),
                    'Registration failed'
                );
            },

            updateProfile: async (data) => {
                await asyncOperation(
                    set,
                    () =>
                        authService.updateProfile({
                            first_name: data.first_name,
                            last_name: data.last_name,
                            email: data.email,
                        }),
                    (response) => ({ user: response.user }),
                    'Failed to update profile'
                );
            },

            deleteAccount: async () => {
                await asyncOperation(
                    set,
                    () => authService.deleteAccount(),
                    () => ({
                        user: null,
                        rememberMe: false,
                    }),
                    'Failed to delete account'
                );
            },

            logout: async () => {
                try {
                    // Llamar al endpoint de logout para limpiar cookies en el servidor
                    await authService.logout();
                } catch (error) {
                    console.error('Logout error:', error);
                } finally {
                    // Limpiar estado local y storage (las cookies ya fueron limpiadas por el backend)
                    saveTokenToStorage(null, null, false);
                    set({
                        ...initialState,
                    });
                }
            },

            setToken: (token: string | null) => {
                const state = useAuthStore.getState();
                // TODO: Una vez que las cookies funcionen correctamente, eliminar esta línea
                // El token solo se necesita en memoria para el header Authorization como fallback
                // Mantener el refresh token existente si hay uno
                const storedRefreshToken = state.rememberMe
                    ? localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN)
                    : sessionStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
                saveTokenToStorage(token, storedRefreshToken, state.rememberMe);
                set({ token });
            },
            clearError: () => set({ error: null }),
        })
);

/**
 * Selector para obtener si el usuario está autenticado
 * Basado en si hay un usuario en el estado (los tokens están en cookies)
 */
export const useIsAuthenticated = (): boolean => {
    const user = useAuthStore((state) => state.user);
    return !!user;
};
