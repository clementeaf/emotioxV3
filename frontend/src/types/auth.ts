export interface User {
  id: string;
  name: string;
  email: string;
  role?: 'admin' | 'researcher' | 'user' | 'participant';
}

export interface AuthResponse {
  token: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    name: string;
  };
}

export interface RequestOTPPayload {
  email: string;
}

export interface ValidateOTPPayload {
  email: string;
  code: string;
}

export interface JwtPayload {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'researcher' | 'user' | 'participant';
  iat?: number;
  exp?: number;
  sub?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface CreateUserRequest {
  email: string;
  password: string;
  name?: string;
  role?: 'admin' | 'researcher' | 'user' | 'participant';
}

export interface UpdateUserRequest {
  email?: string;
  password?: string;
  name?: string;
  role?: 'admin' | 'researcher' | 'user' | 'participant';
  status?: 'active' | 'inactive';
}

export interface AdminUser {
  id: string;
  email: string;
  name?: string;
  role: 'admin' | 'researcher' | 'user' | 'participant';
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
  loginCount: number;
} 