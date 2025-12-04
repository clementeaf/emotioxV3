import { useMemo } from 'react';

/**
 * Hook para leer parámetros de la URL de forma síncrona
 * Prioriza los parámetros de la URL sobre localStorage
 * Útil para móviles donde localStorage puede tardar en cargar
 */
export function useUrlParams() {
  return useMemo(() => {
    // Leer directamente de window.location.search (más confiable en móviles)
    const urlParams = new URLSearchParams(window.location.search);
    const researchId = urlParams.get('researchId');
    const participantId = urlParams.get('participantId') || urlParams.get('userId');
    
    return {
      researchId,
      participantId,
      hasParams: Boolean(researchId)
    };
  }, []); // Solo leer una vez al montar
}

/**
 * Función síncrona para leer parámetros de la URL
 * Útil para leer antes de que React renderice
 */
export function getUrlParams(): { researchId: string | null; participantId: string | null } {
  const urlParams = new URLSearchParams(window.location.search);
  return {
    researchId: urlParams.get('researchId'),
    participantId: urlParams.get('participantId') || urlParams.get('userId')
  };
}

