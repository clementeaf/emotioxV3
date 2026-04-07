import apiClient from './api/client';
import { configService } from './api/config.service';
import type { User, RefreshTokenResponse } from '../types/auth';
import type { ApiErrorResponse } from './api/types';

export interface LogoutResponse {
    message: string;
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
 * Google OAuth only — no manual login/register
 */
class AuthService {
    /**
     * Refreshes the access token using a refresh token (cookie or body fallback).
     */
    async refresh(refreshToken?: string | null): Promise<RefreshTokenResponse> {
        try {
            const endpoint = configService.getEndpoint('auth', 'refresh');
            const payload: Record<string, string> = {};
            if (typeof refreshToken === 'string' && refreshToken.trim().length > 0) {
                payload.refreshToken = refreshToken;
            }
            return await apiClient.post<RefreshTokenResponse>(endpoint, payload);
        } catch (error: unknown) {
            throw this.handleError(error, 'Token refresh failed');
        }
    }

    /**
     * Logs out the user and clears cookies
     */
    async logout(): Promise<LogoutResponse> {
        try {
            const endpoint = configService.getEndpoint('auth', 'logout') || '/auth/logout';
            return await apiClient.post<LogoutResponse>(endpoint, {});
        } catch (error: unknown) {
            throw this.handleError(error, 'Failed to logout');
        }
    }

    /**
     * Gets the authenticated user profile
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
     */
    async deleteAccount(): Promise<DeleteAccountResponse> {
        try {
            return await apiClient.delete<DeleteAccountResponse>(configService.getEndpoint('auth', 'me'));
        } catch (error: unknown) {
            throw this.handleError(error, 'Failed to delete account');
        }
    }

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
