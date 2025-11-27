'use client';

import { User } from '@/api/domains/auth/auth.types';
import React, { createContext, useCallback, useContext, useState, useEffect } from 'react';

interface AuthContextType {
  user: User | null;
  token: string | null;
  authLoading: boolean;
  authError: string | null;
  login: (token: string, rememberMe: boolean) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
  restoreSession: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth debe usarse dentro de un AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  // Check auth state on mount and listen for changes
  useEffect(() => {
    const checkAuthState = () => {
      if (typeof window !== 'undefined') {
        const storedToken = localStorage.getItem('token') || sessionStorage.getItem('token');
        const storedUser = localStorage.getItem('user') || sessionStorage.getItem('user');
        
        if (storedToken && storedUser) {
          try {
            const userData = JSON.parse(storedUser);
            setToken(storedToken);
            setUser(userData);
          } catch {
            // Invalid user data, clear storage
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            sessionStorage.removeItem('token');
            sessionStorage.removeItem('user');
          }
        }
        setAuthLoading(false);
      }
    };

    checkAuthState();

    // Listen for auth state changes
    const handleAuthChange = () => {
      checkAuthState();
    };

    window.addEventListener('authStateChanged', handleAuthChange);

    return () => {
      window.removeEventListener('authStateChanged', handleAuthChange);
    };
  }, []);

  const login = useCallback(async (newToken: string, rememberMe: boolean) => {
    try {
      const tokenParts = newToken.split('.');
      if (tokenParts.length !== 3) throw new Error('Token inválido');

      const payload = JSON.parse(atob(tokenParts[1]));
      const userData: User = {
        id: payload.id || payload.sub,
        email: payload.email,
        name: payload.name
      };

      // Save to storage
      const storage = rememberMe ? localStorage : sessionStorage;
      storage.setItem('token', newToken);
      storage.setItem('user', JSON.stringify(userData));
      storage.setItem('auth_type', rememberMe ? 'local' : 'session');

      // Update state
      setToken(newToken);
      setUser(userData);
      setAuthError(null);
    } catch (error) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('user');
      setAuthError('Error al procesar el login');
      throw error;
    }
  }, []);

  const logout = useCallback(async () => {
    // Clear storage
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('auth_type');
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
    sessionStorage.removeItem('auth_type');
    
    // Clear state
    setToken(null);
    setUser(null);
    setAuthError(null);
  }, []);

  const restoreSession = useCallback(async (): Promise<boolean> => {
    return token !== null;
  }, [token]);

  const clearError = useCallback(() => {
    setAuthError(null);
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      token,
      authLoading,
      authError,
      login,
      logout,
      clearError,
      restoreSession
    }}>
      {children}
    </AuthContext.Provider>
  );
};
