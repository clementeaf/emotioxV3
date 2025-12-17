export interface User {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    role: 'admin' | 'researcher';
}

export interface LoginResponse {
    message: string;
    token?: string;
    refreshToken?: string;
    expiresIn?: number;
}

export interface RefreshTokenResponse {
    message: string;
    token?: string;
    expiresIn?: number;
}

export interface RegisterResponse {
    user: User;
}

export interface LoginCredentials {
    email: string;
    password: string;
}

export interface LoginRequest extends LoginCredentials {
    rememberMe: boolean;
}

export interface RegisterCredentials {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
}
