import axios from 'axios';
import { create } from 'zustand';
import type { User, LoginCredentials, LoginRequest, RegisterCredentials } from '../types/auth';
import { authService } from '../services/auth.service';
import apiClient from '../services/api/client';
import { configService } from '../services/api/config.service';

interface AuthState {
    user: User | null;
    token: string | null; // Token en memoria solo para la sesión actual (no persistido)
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
            // El login guarda tokens en cookies httpOnly (seguro)
            // El token en el body es solo para uso inmediato en esta sesión
            const request: LoginRequest = { ...credentials, rememberMe };
            const loginResponse = await authService.login(request);
            
            // Guardar token en memoria solo para esta sesión (no persistido)
            // Los tokens reales están en cookies httpOnly manejadas por el backend
            const token = loginResponse.token || null;
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
        try {
            // Intentar obtener el usuario usando las cookies httpOnly
            // Si hay cookies válidas, el backend las usará automáticamente
            // Si no hay cookies o expiraron, el backend responderá con 401
            const endpoint = configService.getEndpoint('auth', 'me');
            const userResponse = await apiClient.get<{ user: User }>(endpoint);
            
            // Si llegamos aquí, las cookies son válidas
            // El interceptor de axios manejará el refresh token automáticamente si es necesario
            set({ user: userResponse.user, isLoading: false });
        } catch (error: unknown) {
            const status = axios.isAxiosError(error) ? error.response?.status : undefined;
            if (status === 401) {
                // No hay sesión válida, limpiar estado
                set({
                    ...initialState,
                });
                return;
            }
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
                    // Limpiar estado local (las cookies ya fueron limpiadas por el backend)
                    set({
                        ...initialState,
                    });
                }
            },

            setToken: (token: string | null) => set({ token }),
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
