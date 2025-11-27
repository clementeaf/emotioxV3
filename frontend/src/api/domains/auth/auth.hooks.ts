/**
 * Auth Domain Hooks - React Query implementation
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { authApi } from './auth.api';
import { updateApiToken } from '@/api/config/axios';
import type { LoginRequest, RegisterRequest, User, ApiError } from './auth.types';

// Query keys
export const authKeys = {
  all: ['auth'] as const,
  profile: () => [...authKeys.all, 'profile'] as const,
  session: () => [...authKeys.all, 'session'] as const,
};

/**
 * Hook for login
 */
export function useLogin() {
  const router = useRouter();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (credentials: LoginRequest) => authApi.login(credentials),
    onSuccess: async (data, variables) => {
      // Choose storage based on rememberMe preference
      const storage = variables.rememberMe ? localStorage : sessionStorage;

      // Save token and user data
      storage.setItem('token', data.token);
      storage.setItem('user', JSON.stringify(data.user));
      storage.setItem('auth_type', variables.rememberMe ? 'local' : 'session');

      // Update axios token
      updateApiToken(data.token);

      // Notify auth state change for same-tab updates
      window.dispatchEvent(new CustomEvent('authStateChanged'));

      // Redirect immediately (no toast, no delay)
      router.push('/dashboard');

      // Invalidate auth queries in background (non-blocking)
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: authKeys.all });
      }, 0);
    },
    onError: (error: ApiError) => {
      const message = error.response?.data?.message || 'Error al iniciar sesión';
      toast.error(message);
    },
  });
}

/**
 * Hook for register
 */
export function useRegister() {
  const router = useRouter();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userData: RegisterRequest) => authApi.register(userData),
    onSuccess: (data) => {
      // Save token and user data
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));

      // Update axios token
      updateApiToken(data.token);

      // Invalidate and refetch user queries
      queryClient.invalidateQueries({ queryKey: authKeys.all });

      // Show success message
      toast.success('Registro exitoso');

      // Redirect to dashboard
      router.push('/dashboard');
    },
    onError: (error: ApiError) => {
      const message = error.response?.data?.message || 'Error al registrarse';
      toast.error(message);
    },
  });
}

/**
 * Hook for logout
 */
export function useLogout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => authApi.logout(),
    onSuccess: () => {
      // Clear all storage
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('auth_type');
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('user');
      sessionStorage.removeItem('auth_type');

      // Clear axios token
      updateApiToken(null);

      // Clear all queries
      queryClient.clear();

      // Show success message
      toast.success('Sesión cerrada');

      // Force redirect using window.location to ensure clean navigation
      window.location.href = '/login';
    },
    onError: () => {
      // Even if logout fails on backend, clear local session
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('auth_type');
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('user');
      sessionStorage.removeItem('auth_type');
      updateApiToken(null);
      queryClient.clear();

      // Force redirect using window.location
      window.location.href = '/login';
    },
  });
}

/**
 * Hook for getting user profile
 */
export function useProfile() {
  const { token } = useAuth();

  return useQuery({
    queryKey: authKeys.profile(),
    queryFn: () => authApi.getProfile(),
    retry: 1,
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: token !== null, // Only fetch if token exists
  });
}

/**
 * Hook for checking auth status
 */
export function useAuth() {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const checkAuthState = useCallback(() => {
    // Check localStorage first
    let storedToken = localStorage.getItem('token');
    let storedUser = localStorage.getItem('user');

    // If not in localStorage, check sessionStorage
    if (!storedToken || !storedUser) {
      storedToken = sessionStorage.getItem('token');
      storedUser = sessionStorage.getItem('user');
    }

    let parsedUser: User | null = null;
    try {
      parsedUser = storedUser ? JSON.parse(storedUser) : null;
    } catch {
      parsedUser = null;
    }

    setToken(storedToken);
    setUser(parsedUser);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    checkAuthState();

    // Listen for storage changes
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'token' || e.key === 'user') {
        checkAuthState();
      }
    };

    // Listen for custom events (for same-tab updates)
    const handleAuthChange = () => {
      checkAuthState();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('authStateChanged', handleAuthChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('authStateChanged', handleAuthChange);
    };
  }, [checkAuthState]);

  return {
    isAuthenticated: token !== null,
    user,
    token,
    isLoading,
  };
}

/**
 * Hook for protecting routes
 */
export function useRequireAuth() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated && typeof window !== 'undefined') {
    router.push('/login');
    return { isAuthenticated: false, isLoading: true };
  }

  return { isAuthenticated, isLoading: false };
}