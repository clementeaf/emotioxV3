import type { AxiosError } from 'axios';

export interface ApiResponse<T> {
    data: T;
}

export interface ApiError {
    error: string;
}

export type ApiErrorResponse = AxiosError<ApiError>;

export interface PaginatedResponse<T> {
    data: T[];
    total: number;
    page: number;
    limit: number;
}

