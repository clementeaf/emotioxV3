import { useEffect } from 'react';

import { apiClient } from '../api/config';

export const useAppInitialization = () => {
  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const initializeApp = () => {
      const isDevEnv = process.env.NODE_ENV === 'development';

      // Debugging removido - usar herramientas nativas del navegador

      initializeApiAuth();
    };

    const initializeApiAuth = () => {
      try {
        const storageType = localStorage.getItem('auth_storage_type') || 'local';
        const storage = storageType === 'local' ? localStorage : sessionStorage;
        const token = storage.getItem('token');

        if (token) {
          apiClient.setAuthToken(token);
        }
      } catch (error) {
      }
    };

    initializeApp();
  }, []);
};
