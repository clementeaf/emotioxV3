export interface User {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    role: 'admin' | 'researcher';
}

export interface AuthResponse {
    tokens: {
        accessToken: string;
        idToken: string;
        refreshToken: string;
        expiresIn: number;
    };
    user: User;
}

export interface LoginCredentials {
    email: string;
    password: string;
}

export interface RegisterCredentials {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
}
