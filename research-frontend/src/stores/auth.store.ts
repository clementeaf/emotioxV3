import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, LoginCredentials, LoginRequest, RegisterCredentials } from '../types/auth';
import { authService } from '../services/auth.service';

interface AuthState {
    user: User | null;
    token: string | null; // TEMPORAL: guardar token en memoria hasta que cookies funcionen
    refreshToken: string | null;
    rememberMe: boolean;
    isLoading: boolean;
    error: string | null;

    login: (credentials: LoginCredentials, rememberMe?: boolean) => Promise<void>;
    register: (credentials: RegisterCredentials) => Promise<void>;
    updateProfile: (data: Partial<User>) => Promise<void>;
    deleteAccount: () => Promise<void>;
    logout: () => Promise<void>;
    setToken: (token: string | null) => void;
    setRefreshToken: (refreshToken: string | null) => void;
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
    token: null, // TEMPORAL
    refreshToken: null,
    rememberMe: false,
    isLoading: false,
    error: null,
};

export const useAuthStore = create<AuthState>()(persist(
    (set) => ({
    ...initialState,

    login: async (credentials, rememberMe = false) => {
        set({ isLoading: true, error: null });
        try {
            // El login guarda tokens en cookies, pero también retorna el token temporalmente
            const request: LoginRequest = { ...credentials, rememberMe };
            const loginResponse = await authService.login(request);
            
            // TEMPORAL: Guardar token en memoria porque API Gateway no está pasando cookies
            const token = loginResponse.token || null;
            const refreshToken = loginResponse.refreshToken || null;
            set({ token, refreshToken });

            // Fetch user profile
            try {
                const userResponse = await authService.getMe();
                set({
                    user: userResponse.user,
                    rememberMe,
                    isLoading: false,
                });
            } catch {
                // Si falla getMe, limpiar todo el estado para evitar inconsistencia
                set({
                    user: null,
                    token: null,
                    refreshToken: null,
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
                refreshToken: null,
                rememberMe: false,
            });
            throw error;
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
                    // Limpiar estado local
                    set({
                        ...initialState,
                        token: null, // TEMPORAL
                        refreshToken: null,
                    });
                }
            },

            setToken: (token: string | null) => set({ token }),
            setRefreshToken: (refreshToken: string | null) => set({ refreshToken }),
            clearError: () => set({ error: null }),
        }),
        {
            name: 'auth-storage',
            partialize: (state) => ({
                user: state.user,
                rememberMe: state.rememberMe,
                refreshToken: state.rememberMe ? state.refreshToken : null,
            }),
        }
    )
);

/**
 * Selector para obtener si el usuario está autenticado
 * Basado en si hay un usuario en el estado (los tokens están en cookies)
 */
export const useIsAuthenticated = (): boolean => {
    const user = useAuthStore((state) => state.user);
    return !!user;
};
