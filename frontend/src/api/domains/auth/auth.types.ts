/**
 * Auth Domain Types
 */

export interface User {
  id: string;
  email: string;
  name?: string;
  role?: 'admin' | 'researcher' | 'user' | 'participant';
  createdAt?: string;
  updatedAt?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name?: string;
}

export interface RegisterResponse {
  token: string;
  user: User;
}

export interface ProfileResponse {
  user: User;
}

export interface ApiError {
  response?: {
    data?: {
      message?: string;
    };
  };
  message?: string;
}