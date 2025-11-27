/**
 * Utilidad para manejar localStorage de forma segura en SSR
 */

const isClient = typeof window !== 'undefined';

export const storage = {
  getItem: (key: string): string | null => {
    if (!isClient) return null;
    try {
      return localStorage.getItem(key);
    } catch (error) {
      return null;
    }
  },

  setItem: (key: string, value: string): void => {
    if (!isClient) return;
    try {
      localStorage.setItem(key, value);
    } catch (error) {
    }
  },

  removeItem: (key: string): void => {
    if (!isClient) return;
    try {
      localStorage.removeItem(key);
    } catch (error) {
    }
  },

  clear: (): void => {
    if (!isClient) return;
    try {
      localStorage.clear();
    } catch (error) {
    }
  },

  key: (index: number): string | null => {
    if (!isClient) return null;
    try {
      return localStorage.key(index);
    } catch (error) {
      return null;
    }
  },

  get length(): number {
    if (!isClient) return 0;
    try {
      return localStorage.length;
    } catch (error) {
      return 0;
    }
  },

  // Métodos para sessionStorage
  getSessionItem: (key: string): string | null => {
    if (!isClient) return null;
    try {
      return sessionStorage.getItem(key);
    } catch (error) {
      return null;
    }
  },

  setSessionItem: (key: string, value: string): void => {
    if (!isClient) return;
    try {
      sessionStorage.setItem(key, value);
    } catch (error) {
    }
  },

  removeSessionItem: (key: string): void => {
    if (!isClient) return;
    try {
      sessionStorage.removeItem(key);
    } catch (error) {
    }
  },

  // Utilidad para obtener todas las keys
  getKeys: (): string[] => {
    if (!isClient) return [];
    try {
      return Object.keys(localStorage);
    } catch (error) {
      return [];
    }
  },

  getSessionKeys: (): string[] => {
    if (!isClient) return [];
    try {
      return Object.keys(sessionStorage);
    } catch (error) {
      return [];
    }
  }
};
