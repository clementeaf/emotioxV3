/**
 * Servicio de gestión de tokens
 * Maneja la renovación automática, almacenamiento y validación de tokens de autenticación
 */
import { storage } from '@/utils/storage';

// Intervalo para renovación periódica del token (30 minutos)
const TOKEN_REFRESH_INTERVAL = 30 * 60 * 1000;

// Tiempo mínimo que debe quedar para considerar renovar el token (2 horas)
const TOKEN_REFRESH_THRESHOLD = 2 * 60 * 60 * 1000;

// Variable para almacenar el temporizador de renovación
let refreshTimer: NodeJS.Timeout | null = null;

// Variable para controlar cuándo se muestran los mensajes de log
type LogLevel = 'ERROR' | 'WARN' | 'INFO' | 'DEBUG';
const LOG_LEVEL: LogLevel = (process.env.NODE_ENV === 'production' ? 'ERROR' : 'INFO') as LogLevel;
const SHOW_DETAILED_LOGS = process.env.NODE_ENV !== 'production';

/**
 * Función personalizada de logging para evitar mensajes excesivos en consola
 */
const logService = {
  info: (message: string, ...args: any[]) => {
    if (LOG_LEVEL === 'INFO' || LOG_LEVEL === 'DEBUG') {
    }
  },
  warn: (message: string, ...args: any[]) => {
    // Para advertencias relacionadas con tokens ausentes, usar info en lugar de warn
    if (message.includes('No hay token') || message.includes('token ausente')) {
      if (SHOW_DETAILED_LOGS) {
      }
    } else {
    }
  },
  error: (message: string, ...args: any[]) => {
  }
};

/**
 * Verifica si estamos en el navegador
 */
const isClient = typeof window !== 'undefined';

/**
 * Decodifica un token JWT sin verificar la firma
 * @param token Token JWT
 * @returns Payload decodificado o null si hay error
 */
const decodeToken = (token: string): any | null => {
  try {
    // Obtener la parte del payload (segunda parte del token)
    const base64Url = token.split('.')[1];
    if (!base64Url) {return null;}

    // Decodificar el base64
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      window
        .atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );

    return JSON.parse(jsonPayload);
  } catch (error) {
    logService.error('Error al decodificar token:', error);
    return null;
  }
};

/**
 * Verifica si un token está próximo a expirar
 * @param token Token JWT
 * @returns true si está próximo a expirar, false en caso contrario
 */
const isTokenExpiringSoon = (token: string): boolean => {
  try {
    const payload = decodeToken(token);
    if (!payload || !payload.exp) {return true;}

    // Convertir exp a milisegundos
    const expirationTime = payload.exp * 1000;
    const currentTime = Date.now();

    // Si el token expira en menos del umbral, considerar que está próximo a expirar
    return expirationTime - currentTime < TOKEN_REFRESH_THRESHOLD;
  } catch (error) {
    logService.error('Error al verificar expiración del token:', error);
    return true; // En caso de error, asumir que el token está próximo a expirar
  }
};

/**
 * Obtiene el token actual del almacenamiento con verificaciones adicionales
 * @returns Token o null si no existe
 */
const getToken = (): string | null => {
  try {
    // Verificar que estamos en el cliente
    if (!isClient) {
      return null;
    }

    // Verificación principal: intentar obtener el token de localStorage
    const token = storage.getItem('token');

    if (token) {
      // Remover el prefijo Bearer si existe para devolver solo el token
      const cleanToken = token.replace('Bearer ', '').trim();
      //   cleanToken.substring(0, 20) + '...');
      return cleanToken;
    }

    // Si no se encuentra en localStorage, intentar obtener de sessionStorage como respaldo
    const sessionToken = storage.getSessionItem('token');
    if (sessionToken) {
      // Remover el prefijo Bearer si existe para devolver solo el token
      const cleanToken = sessionToken.replace('Bearer ', '').trim();
      //   cleanToken.substring(0, 20) + '...');

      // Guardar en localStorage para futuras solicitudes (sin prefijo Bearer)
      storage.setItem('token', cleanToken);

      return cleanToken;
    }

    // Verificar si hay información de almacenamiento en localStorage
    const storageType = storage.getItem('auth_storage_type');

    return null;
  } catch (error) {
    return null;
  }
};

/**
 * Guarda el token en el almacenamiento
 * @param token Token JWT
 */
const saveToken = (token: string): void => {
  if (!isClient) {
    return;
  }

  // Remover el prefijo Bearer si existe para guardar solo el token
  const cleanToken = token.replace('Bearer ', '').trim();
  storage.setItem('token', cleanToken);
  logService.info('Token actualizado en localStorage');
};

/**
 * Elimina el token del almacenamiento
 */
const removeToken = (): void => {
  if (!isClient) {
    return;
  }

  storage.removeItem('token');
  logService.info('Token eliminado de localStorage');

  // Detener el temporizador si existe
  if (refreshTimer) {
    clearInterval(refreshTimer);
    refreshTimer = null;
  }
};

/**
 * Renueva el token si es necesario
 * @returns Promise con el resultado de la renovación
 */
const refreshTokenIfNeeded = async (): Promise<boolean> => {
  try {
    const currentToken = getToken();
    if (!currentToken) {
      return false;
    }

    // Validar formato del token
    const cleanToken = currentToken.replace('Bearer ', '').trim();
    if (!cleanToken || cleanToken.split('.').length !== 3) {
      removeToken();
      return false;
    }

    // Decodificar y verificar expiración
    const payload = decodeToken(cleanToken);
    if (!payload || !payload.exp) {
      removeToken();
      return false;
    }

    const expirationTime = payload.exp * 1000;
    const currentTime = Date.now();
    const timeToExpire = expirationTime - currentTime;

    // Si el token ya expiró, limpiarlo y retornar
    if (timeToExpire <= 0) {
      removeToken();
      return false;
    }

    // Si el token aún tiene más de 2 horas de validez, no renovar
    if (timeToExpire > TOKEN_REFRESH_THRESHOLD) {
      return false;
    }

    try {
      // Use domain API instead of legacy api-client
      const { authApi } = await import('@/api/domains/auth');
      const response = await authApi.refreshToken();
      if (!response?.token) {
        throw new Error('No se recibió token en la respuesta');
      }

      const newToken = response.token;
      if (!newToken.includes('.') || newToken.split('.').length !== 3) {
        throw new Error('Token recibido tiene formato inválido');
      }

      saveToken(newToken);
      return true;
    } catch (error) {
      if (error instanceof Error &&
         (error.message.includes('401') ||
          error.message === 'NO_TOKEN_AVAILABLE' ||
          error.message === 'INVALID_TOKEN_FORMAT')) {
        removeToken();
        stopAutoRefresh();
      }
      return false;
    }
  } catch (error) {
    removeToken();
    return false;
  }
};

/**
 * Fuerza la renovación del token sin importar su estado actual
 * @returns Promise con el resultado de la renovación
 */
const forceTokenRefresh = async (): Promise<boolean> => {
  try {
    const currentToken = getToken();
    if (!currentToken) {
      logService.warn('No hay token disponible para forzar renovación');
      return false;
    }

    logService.info('Forzando renovación de token...');
    // Use domain API instead of legacy api-client
    const { authApi } = await import('@/api/domains/auth');
    const response = await authApi.refreshToken();

    if (response && response.token) {
      // Guardar siempre el token renovado
      logService.info('Token renovado forzosamente con éxito');
      saveToken(response.token);
      return true;
    } else {
      logService.warn('Respuesta de renovación forzada inválida:', response);
      return false;
    }
  } catch (error) {
    logService.error('Error al forzar renovación de token:', error);
    return false;
  }
};

/**
 * Inicia la renovación automática del token
 */
const startAutoRefresh = (): void => {
  // Detener cualquier temporizador existente
  stopAutoRefresh();

  // Verificar si hay un token válido antes de iniciar
  const currentToken = getToken();
  if (!currentToken) {
    return;
  }

  // Intentar renovar inmediatamente solo si es necesario
  refreshTokenIfNeeded().catch(() => {
    // Si falla la renovación inicial, detener el auto-refresh
    stopAutoRefresh();
  });

  // Configurar nuevo temporizador
  refreshTimer = setInterval(async () => {
    try {
      const success = await refreshTokenIfNeeded();
      if (!success) {
        stopAutoRefresh();
      }
    } catch {
      stopAutoRefresh();
    }
  }, TOKEN_REFRESH_INTERVAL);
};

/**
 * Detiene la renovación automática del token
 */
const stopAutoRefresh = (): void => {
  if (refreshTimer) {
    clearInterval(refreshTimer);
    refreshTimer = null;
    logService.info('Renovación automática de token detenida');
  }
};

// Exportar funciones del servicio
const tokenService = {
  getToken,
  saveToken,
  removeToken,
  refreshTokenIfNeeded,
  forceTokenRefresh,
  startAutoRefresh,
  stopAutoRefresh,
  isTokenExpiringSoon,
  decodeToken
};

export default tokenService;
