export interface User {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    role: 'admin' | 'researcher';
}

export interface RefreshTokenResponse {
    message: string;
    token?: string;
    expiresIn?: number;
}
