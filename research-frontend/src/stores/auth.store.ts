import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, LoginCredentials, RegisterCredentials } from '../types/auth';
import { authService } from '../services/auth.service';

interface AuthState {
    user: User | null;
    token: string | null;
    isLoading: boolean;
    error: string | null;

    login: (credentials: LoginCredentials) => Promise<void>;
    register: (credentials: RegisterCredentials) => Promise<void>;
    updateProfile: (data: Partial<User>) => Promise<void>;
    deleteAccount: () => Promise<void>;
    logout: () => void;
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
    token: null,
    isLoading: false,
    error: null,
};

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            ...initialState,

            login: async (credentials) => {
                set({ isLoading: true, error: null });
                try {
                    const loginResponse = await authService.login(credentials);
                    const { tokens } = loginResponse;

                    set({
                        token: tokens.accessToken,
                    });

                    // Fetch user profile
                    try {
                        const userResponse = await authService.getMe();
                        set({
                            user: userResponse.user,
                            isLoading: false,
                        });
                    } catch (userError: unknown) {
                        // Si falla getMe, limpiar todo el estado para evitar inconsistencia
                        set({
                            user: null,
                            token: null,
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
                        token: null,
                    }),
                    'Failed to delete account'
                );
            },

            logout: () => {
                set({
                    ...initialState,
                });
            },

            clearError: () => set({ error: null }),
        }),
        {
            name: 'auth-storage',
            partialize: (state) => ({
                token: state.token,
                user: state.user,
            }),
        }
    )
);

/**
 * Selector para obtener si el usuario está autenticado
 * Calculado en lugar de almacenado para evitar inconsistencias
 */
export const useIsAuthenticated = (): boolean => {
    const token = useAuthStore((state) => state.token);
    return !!token;
};
