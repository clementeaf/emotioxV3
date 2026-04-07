import axios from 'axios';
import { create } from 'zustand';
import type { User } from '../types/auth';
import { authService } from '../services/auth.service';
import apiClient from '../services/api/client';
import { configService } from '../services/api/config.service';

interface AuthState {
    user: User | null;
    token: string | null;
    rememberMe: boolean;
    isLoading: boolean;
    error: string | null;

    bootstrapSession: () => Promise<void>;
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

const saveTokenToStorage = (token: string | null, refreshToken: string | null = null, rememberMe: boolean = false): void => {
    if (token && rememberMe) {
        localStorage.setItem(STORAGE_KEYS.TOKEN, token);
        localStorage.setItem(STORAGE_KEYS.REMEMBER_ME, 'true');
        if (refreshToken) {
            localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
        }
    } else if (token) {
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

const getTokenFromStorage = (): { token: string | null; rememberMe: boolean } => {
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

const initialState = {
    user: null,
    token: null,
    rememberMe: false,
    isLoading: true,
    error: null,
};

export const useAuthStore = create<AuthState>()((set) => ({
    ...initialState,

    bootstrapSession: async () => {
        set({ isLoading: true, error: null });

        const { token: storedToken, rememberMe: storedRememberMe } = getTokenFromStorage();
        if (storedToken) {
            set({ token: storedToken, rememberMe: storedRememberMe });
        }

        try {
            const endpoint = configService.getEndpoint('auth', 'me');
            const userResponse = await apiClient.get<{ user: User }>(endpoint);

            const currentToken = useAuthStore.getState().token;
            if (currentToken && currentToken !== storedToken) {
                const storedRefreshToken = storedRememberMe
                    ? localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN)
                    : sessionStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
                saveTokenToStorage(currentToken, storedRefreshToken, storedRememberMe);
            }

            set({ user: userResponse.user, isLoading: false });
        } catch (error: unknown) {
            const status = axios.isAxiosError(error) ? error.response?.status : undefined;
            if (status === 401) {
                console.log('[bootstrapSession] 401 detected - interceptor will handle refresh automatically');
                set({ isLoading: false });
                return;
            }
            const message = error instanceof Error ? error.message : 'Failed to restore session';
            set({ isLoading: false, error: message });
        }
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
            await authService.logout();
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            saveTokenToStorage(null, null, false);
            set({
                ...initialState,
                isLoading: false,
            });
        }
    },

    setToken: (token: string | null) => {
        const state = useAuthStore.getState();
        const storedRefreshToken = state.rememberMe
            ? localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN)
            : sessionStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
        saveTokenToStorage(token, storedRefreshToken, state.rememberMe);
        set({ token });
    },
    clearError: () => set({ error: null }),
}));

/**
 * Selector para obtener si el usuario está autenticado
 */
export const useIsAuthenticated = (): boolean => {
    const user = useAuthStore((state) => state.user);
    return !!user;
};
