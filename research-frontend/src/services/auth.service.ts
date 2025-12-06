import apiClient from './api/client';
import { configService } from './api/config.service';
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

export interface RefreshTokenResponse {
    tokens: {
        accessToken: string;
        idToken: string;
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
 * Authentication service
 * Handles all operations related to authentication and users
 */
class AuthService {
    /**
     * Registers a new user
     * @param credentials - User credentials
     * @returns Created user
     * @throws ApiErrorResponse if registration fails
     */
    async register(credentials: RegisterCredentials): Promise<RegisterResponse> {
        try {
            const endpoint = configService.getEndpoint('auth', 'register');
            return await apiClient.post<RegisterResponse>(endpoint, {
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
     * Logs in with email and password
     * @param credentials - Login credentials
     * @returns Authentication tokens
     * @throws ApiErrorResponse if login fails
     */
    async login(credentials: LoginCredentials): Promise<LoginResponse> {
        try {
            const endpoint = configService.getEndpoint('auth', 'login');
            return await apiClient.post<LoginResponse>(endpoint, credentials);
        } catch (error: unknown) {
            throw this.handleError(error, 'Login failed');
        }
    }

    /**
     * Refreshes access token using refresh token
     * @param refreshToken - Refresh token
     * @returns New authentication tokens
     * @throws ApiErrorResponse if refresh fails
     */
    async refreshToken(refreshToken: string): Promise<RefreshTokenResponse> {
        try {
            const endpoint = configService.getEndpoint('auth', 'refresh');
            return await apiClient.post<RefreshTokenResponse>(endpoint, { refreshToken });
        } catch (error: unknown) {
            throw this.handleError(error, 'Failed to refresh token');
        }
    }

    /**
     * Gets the authenticated user profile
     * @returns User data
     * @throws ApiErrorResponse if request fails
     */
    async getMe(): Promise<UserResponse> {
        try {
            const endpoint = configService.getEndpoint('auth', 'me');
            return await apiClient.get<UserResponse>(endpoint);
        } catch (error: unknown) {
            throw this.handleError(error, 'Failed to fetch user profile');
        }
    }

    /**
     * Updates the authenticated user profile
     * @param data - Data to update
     * @returns Updated user
     * @throws ApiErrorResponse if update fails
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

            return await apiClient.put<UserResponse>(configService.getEndpoint('auth', 'me'), updateData);
        } catch (error: unknown) {
            throw this.handleError(error, 'Failed to update profile');
        }
    }

    /**
     * Deletes the authenticated user account
     * @returns Confirmation message
     * @throws ApiErrorResponse if deletion fails
     */
    async deleteAccount(): Promise<DeleteAccountResponse> {
        try {
            return await apiClient.delete<DeleteAccountResponse>(configService.getEndpoint('auth', 'me'));
        } catch (error: unknown) {
            throw this.handleError(error, 'Failed to delete account');
        }
    }

    /**
     * Handles API errors and converts them to readable messages
     * @param error - Caught error
     * @param defaultMessage - Default message if cannot be extracted
     * @returns Error with formatted message
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

