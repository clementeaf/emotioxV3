/**
 * Utilidades para detección de dispositivo, navegador y sistema operativo
 */

export type DeviceType = 'desktop' | 'mobile' | 'tablet';

export interface LocationInfo {
  country: string;
  city: string;
  ip: string;
}

export interface DeviceInfo {
  type: DeviceType;
  browser: string;
  os: string;
  screenSize: string;
}

/**
 * Detecta el tipo de dispositivo basado en las dimensiones de pantalla
 */
export const getDeviceType = (): DeviceType => {
  const width = window.screen.width;
  const height = window.screen.height;
  const ratio = width / height;

  if (width >= 1024) return 'desktop';
  if (width >= 768 && ratio > 1.2) return 'tablet';
  return 'mobile';
};

/**
 * Detecta el navegador basado en el user agent
 */
export const getBrowserInfo = (): string => {
  const userAgent = navigator.userAgent;
  if (userAgent.includes('Chrome')) return 'Chrome';
  if (userAgent.includes('Firefox')) return 'Firefox';
  if (userAgent.includes('Safari')) return 'Safari';
  if (userAgent.includes('Edge')) return 'Edge';
  return 'Unknown';
};

/**
 * Detecta el sistema operativo basado en el user agent
 */
export const getOSInfo = (): string => {
  const userAgent = navigator.userAgent;
  if (userAgent.includes('Windows')) return 'Windows';
  if (userAgent.includes('Mac')) return 'macOS';
  if (userAgent.includes('Linux')) return 'Linux';
  if (userAgent.includes('Android')) return 'Android';
  if (userAgent.includes('iOS')) return 'iOS';
  return 'Unknown';
};

/**
 * Obtiene información de ubicación del usuario
 * Usa el endpoint del backend para evitar problemas de CORS
 */
export const getLocationInfo = async (): Promise<LocationInfo> => {
  try {
    // Importar dinámicamente para evitar dependencias circulares
    const { getApiUrl } = await import('../config/endpoints');
    
    // Usar endpoint del backend que hace proxy de servicios externos
    const response = await fetch(getApiUrl('device-info/location'), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
    const data = result.data || result;

    return {
      country: data.country || 'Chile',
      city: data.city || 'Valparaíso',
      ip: data.ip || 'N/A'
    };
  } catch (error) {
    console.error('[getLocationInfo] Error obteniendo información de ubicación:', error);
    return {
      country: 'Chile',
      city: 'Valparaíso',
      ip: 'N/A'
    };
  }
};

/**
 * Obtiene información completa del dispositivo
 */
export const getDeviceInfo = (): DeviceInfo => {
  return {
    type: getDeviceType(),
    browser: getBrowserInfo(),
    os: getOSInfo(),
    screenSize: `${window.screen.width}x${window.screen.height}`
  };
};
