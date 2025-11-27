import { useEffect, useState } from 'react';

import { useAuth } from '@/providers/AuthProvider';
// jwt-utils eliminado - usar herramientas nativas del navegador

interface TokenInfo {
  isValid: boolean;
  expiresAt?: Date;
  timeRemaining?: string;
  payload?: any;
}

export const useAuthDebugger = () => {
  const { token, user, logout } = useAuth();
  const [localToken, setLocalToken] = useState<string | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [tokenInfo, setTokenInfo] = useState<TokenInfo>({ isValid: false });
  const [showDebugger, setShowDebugger] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const localStorageToken = localStorage.getItem('token');
    const sessionStorageToken = sessionStorage.getItem('token');

    setLocalToken(localStorageToken);
    setSessionToken(sessionStorageToken);

    const tokenToAnalyze = localStorageToken || sessionStorageToken;
    if (tokenToAnalyze) {
      // analyzeToken eliminado - usar herramientas nativas del navegador
      setTokenInfo({ isValid: true, expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) });
    } else {
      setTokenInfo({ isValid: false });
    }
  }, [token]);

  const handleFix = () => {
    if (localToken && !token) {
      window.location.reload();
    } else {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('user');
      window.location.href = '/login';
    }
  };

  const toggleDebugger = () => {
    setShowDebugger(prev => !prev);
  };

  const getStatusInfo = () => {
    let statusClass = 'bg-gray-100 text-gray-800';
    let statusMessage = 'Verificando estado de autenticación...';

    if (!localToken && !sessionToken) {
      statusClass = 'bg-red-100 text-red-800';
      statusMessage = 'No estás autenticado. No se encontró ningún token.';
    } else if (!tokenInfo.isValid) {
      statusClass = 'bg-red-100 text-red-800';
      statusMessage = 'Token inválido o expirado.';
    } else if (localToken && token) {
      statusClass = 'bg-green-100 text-green-800';
      statusMessage = 'Autenticación correcta.';
    } else {
      statusClass = 'bg-yellow-100 text-yellow-800';
      statusMessage = 'Token en storage pero no en contexto de aplicación.';
    }

    return { statusClass, statusMessage };
  };

  return {
    showDebugger,
    localToken,
    sessionToken,
    token,
    user,
    tokenInfo,
    toggleDebugger,
    handleFix,
    logout,
    getStatusInfo
  };
};
