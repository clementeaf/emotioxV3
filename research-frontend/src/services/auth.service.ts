import apiClient from './api/client';
import type { User, LoginCredentials, RegisterCredentials } from '../types/auth';
import type { ApiErrorResponse } from './api/types';

export interface LoginResponse {
    tokens: {
        accessToken: string;
        idToken: string;
        refreshToken: string;
        expiresIn: number;
    };
}

export interface RegisterResponse {
    user: User;
}

export interface UserResponse {
    user: User;
}

export interface UpdateUserData {
    first_name?: string;
    last_name?: string;
    email?: string;
}

export interface DeleteAccountResponse {
    message: string;
}

/**
 * Servicio de autenticación
 * Maneja todas las operaciones relacionadas con autenticación y usuarios
 */
class AuthService {
    /**
     * Registra un nuevo usuario
     * @param credentials - Credenciales del usuario
     * @returns Usuario creado
     * @throws ApiErrorResponse si falla el registro
     */
    async register(credentials: RegisterCredentials): Promise<RegisterResponse> {
        try {
            return await apiClient.post<RegisterResponse>('/auth/register', {
                email: credentials.email,
                password: credentials.password,
                firstName: credentials.firstName,
                lastName: credentials.lastName,
            });
        } catch (error: unknown) {
            throw this.handleError(error, 'Registration failed');
        }
    }

    /**
     * Inicia sesión con email y contraseña
     * @param credentials - Credenciales de login
     * @returns Tokens de autenticación
     * @throws ApiErrorResponse si falla el login
     */
    async login(credentials: LoginCredentials): Promise<LoginResponse> {
        try {
            return await apiClient.post<LoginResponse>('/auth/login', credentials);
        } catch (error: unknown) {
            throw this.handleError(error, 'Login failed');
        }
    }

    /**
     * Obtiene el perfil del usuario autenticado
     * @returns Datos del usuario
     * @throws ApiErrorResponse si falla la petición
     */
    async getMe(): Promise<UserResponse> {
        try {
            return await apiClient.get<UserResponse>('/auth/me');
        } catch (error: unknown) {
            throw this.handleError(error, 'Failed to fetch user profile');
        }
    }

    /**
     * Actualiza el perfil del usuario autenticado
     * @param data - Datos a actualizar
     * @returns Usuario actualizado
     * @throws ApiErrorResponse si falla la actualización
     */
    async updateProfile(data: UpdateUserData): Promise<UserResponse> {
        try {
            const updateData: UpdateUserData = {};
            if (data.first_name !== undefined) {
                updateData.first_name = data.first_name;
            }
            if (data.last_name !== undefined) {
                updateData.last_name = data.last_name;
            }
            if (data.email !== undefined) {
                updateData.email = data.email;
            }

            if (Object.keys(updateData).length === 0) {
                throw new Error('No fields to update');
            }

            return await apiClient.put<UserResponse>('/auth/me', updateData);
        } catch (error: unknown) {
            throw this.handleError(error, 'Failed to update profile');
        }
    }

    /**
     * Elimina la cuenta del usuario autenticado
     * @returns Mensaje de confirmación
     * @throws ApiErrorResponse si falla la eliminación
     */
    async deleteAccount(): Promise<DeleteAccountResponse> {
        try {
            return await apiClient.delete<DeleteAccountResponse>('/auth/me');
        } catch (error: unknown) {
            throw this.handleError(error, 'Failed to delete account');
        }
    }

    /**
     * Maneja errores de API y los convierte en mensajes legibles
     * @param error - Error capturado
     * @param defaultMessage - Mensaje por defecto si no se puede extraer
     * @returns Error con mensaje formateado
     */
    private handleError(error: unknown, defaultMessage: string): Error {
        if (error instanceof Error) {
            return error;
        }

        if (error && typeof error === 'object' && 'response' in error) {
            const axiosError = error as ApiErrorResponse;
            const message = axiosError.response?.data?.error || defaultMessage;
            return new Error(message);
        }

        return new Error(defaultMessage);
    }
}

export const authService = new AuthService();

