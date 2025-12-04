import { useCallback } from 'react';

/**
 * Tipo mínimo requerido para backlinks
 * Compatible con ambas definiciones de EyeTrackingConfig
 */
interface BacklinkConfig {
  backlinks?: {
    complete?: string;
    disqualified?: string;
    overquota?: string;
  };
}

/**
 * Hook genérico para manejar redirecciones a backlinks
 * Soporta redirecciones para: complete, disqualified, overquota
 */
export const useBacklinkRedirect = () => {
  /**
   * Realiza la redirección a la URL especificada
   */
  const performRedirect = useCallback((url: string) => {
    // Validar que la URL sea válida
    if (!url || typeof url !== 'string' || url.trim() === '') {
      return;
    }

    // Agregar protocolo si no lo tiene
    let redirectUrl = url;
    if (!redirectUrl.startsWith('http://') && !redirectUrl.startsWith('https://')) {
      redirectUrl = 'https://' + redirectUrl;
    }

    // Verificar que la URL sea válida
    if (!redirectUrl.startsWith('http')) {
      return;
    }

    // Intentar redirección con múltiples métodos
    try {
      const newWindow = window.open(redirectUrl, '_self');
      if (!newWindow) {
        // Fallback: usar assign
        window.location.assign(redirectUrl);
      }
    } catch {
      // Fallback: usar href
      try {
        window.location.href = redirectUrl;
      } catch {
        // Último fallback: mostrar mensaje
        console.error('No se pudo redirigir a:', redirectUrl);
      }
    }
  }, []);

  /**
   * Muestra un mensaje de fallback cuando no hay backlink configurado
   */
  const showFallbackMessage = useCallback((
    backlinkType: 'complete' | 'disqualified' | 'overquota',
    customMessage?: string
  ) => {
    const messages = {
      complete: customMessage || '¡Gracias por completar la investigación!',
      disqualified: customMessage || 'Has sido descalificado de esta investigación.',
      overquota: customMessage || 'La cuota de participantes ha sido alcanzada.'
    };

    const colors = {
      complete: '#10b981', // green
      disqualified: '#ef4444', // red
      overquota: '#f59e0b' // orange
    };

    const messageContainer = document.createElement('div');
    messageContainer.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.8);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
      color: white;
      font-family: Arial, sans-serif;
    `;

    messageContainer.innerHTML = `
      <div style="text-align: center; padding: 2rem; max-width: 500px;">
        <h2 style="color: ${colors[backlinkType]}; margin-bottom: 1rem;">
          ${backlinkType === 'complete' ? 'Participación Completada' : 
            backlinkType === 'disqualified' ? 'Participación Descalificada' : 
            'Cuota Alcanzada'}
        </h2>
        <p style="margin-bottom: 1rem; font-size: 1.1rem;">
          ${messages[backlinkType]}
        </p>
        <p style="font-size: 0.9rem; opacity: 0.8;">
          Gracias por tu interés en participar. Puedes cerrar esta ventana cuando desees.
        </p>
        <button
          onclick="this.parentElement.parentElement.parentElement.remove()"
          style="
            background: ${colors[backlinkType]};
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 4px;
            cursor: pointer;
            margin-top: 1rem;
          "
        >
          Cerrar mensaje
        </button>
      </div>
    `;

    document.body.appendChild(messageContainer);
  }, []);

  /**
   * Redirige a un backlink específico con fallbacks
   * @param eyeTrackingConfig - Configuración de eye tracking con backlinks
   * @param backlinkType - Tipo de backlink: 'complete' | 'disqualified' | 'overquota'
   * @param message - Mensaje opcional a mostrar si no hay backlink configurado
   */
  const redirectToBacklink = useCallback((
    eyeTrackingConfig: BacklinkConfig | undefined,
    backlinkType: 'complete' | 'disqualified' | 'overquota',
    message?: string
  ) => {
    if (!eyeTrackingConfig?.backlinks) {
      return;
    }

    // Obtener URL del backlink solicitado
    let targetUrl: string | undefined;
    
    if (backlinkType === 'complete') {
      targetUrl = eyeTrackingConfig.backlinks.complete;
    } else if (backlinkType === 'disqualified') {
      targetUrl = eyeTrackingConfig.backlinks.disqualified;
    } else if (backlinkType === 'overquota') {
      targetUrl = eyeTrackingConfig.backlinks.overquota;
    }

    // Si no hay URL configurada, intentar fallbacks
    if (!targetUrl) {
      // Fallback 1: Intentar otros backlinks disponibles
      if (backlinkType !== 'complete' && eyeTrackingConfig.backlinks.complete) {
        targetUrl = eyeTrackingConfig.backlinks.complete;
      } else if (backlinkType !== 'overquota' && eyeTrackingConfig.backlinks.overquota) {
        targetUrl = eyeTrackingConfig.backlinks.overquota;
      } else if (backlinkType !== 'disqualified' && eyeTrackingConfig.backlinks.disqualified) {
        targetUrl = eyeTrackingConfig.backlinks.disqualified;
      }
    }

    // Si después de fallbacks aún no hay URL, mostrar mensaje
    if (!targetUrl) {
      showFallbackMessage(backlinkType, message);
      return;
    }

    // Validar y redirigir
    performRedirect(targetUrl);
  }, [performRedirect, showFallbackMessage]);

  return {
    redirectToBacklink,
    redirectToComplete: useCallback((eyeTrackingConfig: BacklinkConfig | undefined) => {
      redirectToBacklink(eyeTrackingConfig, 'complete');
    }, [redirectToBacklink]),
    redirectToDisqualified: useCallback((eyeTrackingConfig: BacklinkConfig | undefined, reason?: string) => {
      redirectToBacklink(eyeTrackingConfig, 'disqualified', reason);
    }, [redirectToBacklink]),
    redirectToOverquota: useCallback((eyeTrackingConfig: BacklinkConfig | undefined) => {
      redirectToBacklink(eyeTrackingConfig, 'overquota');
    }, [redirectToBacklink])
  };
};

