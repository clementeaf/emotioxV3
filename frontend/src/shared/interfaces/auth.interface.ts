export interface LoginFormState {
  email: string;
  password: string;
  rememberMe: boolean;
}

export interface RegisterFormState {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface ValidationState {
  email: {
    isValid: boolean;
    message: string | null;
  };
  password: {
    isValid: boolean;
    message: string | null;
  };
  name?: {
    isValid: boolean;
    message: string | null;
  };
  confirmPassword?: {
    isValid: boolean;
    message: string | null;
  };
}

export interface TokenInfo {
  isValid: boolean;
  expiresAt?: Date;
  timeRemaining?: string;
  payload?: {
    id: string;
    email: string;
    name: string;
    role: 'admin' | 'researcher' | 'user' | 'participant';
    iat?: number;
    exp?: number;
  };
}

export type LoginStatus = 'idle' | 'validating' | 'connecting' | 'authenticating' | 'success' | 'error';
export type AuthStep = 'email' | 'code';

export interface AuthResponse {
  data: {
    token?: string;
    auth?: {
      token: string;
    };
  };
}
