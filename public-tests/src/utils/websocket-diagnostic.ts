import { getWebsocketUrl } from '../config/dynamic-endpoints';


/**
 * Función para probar la conectividad del WebSocket
 */
export async function testWebSocketConnection(): Promise<{
  success: boolean;
  error?: string;
  details?: unknown;
}> {
  return new Promise((resolve) => {
    try {
      const wsUrl = import.meta.env.VITE_WS_URL || getWebsocketUrl();
      const ws = new WebSocket(wsUrl);

      const timeout = setTimeout(() => {
        ws.close();
        resolve({
          success: false,
          error: 'Timeout en conexión WebSocket',
          details: { wsUrl }
        });
      }, 10000); // 10 segundos

      ws.onopen = () => {
        clearTimeout(timeout);
        ws.close();
        resolve({
          success: true,
          details: { wsUrl }
        });
      };

      ws.onclose = (event) => {
        clearTimeout(timeout);
        resolve({
          success: false,
          error: `WebSocket desconectado: ${event.code} - ${event.reason}`,
          details: { wsUrl, event }
        });
      };

      ws.onerror = (error) => {
        console.error('❌ Error en WebSocket:', error);
        clearTimeout(timeout);
        resolve({
          success: false,
          error: 'Error en WebSocket',
          details: { wsUrl, error }
        });
      };

    } catch (error) {
      console.error('❌ Error creando WebSocket:', error);
      resolve({
        success: false,
        error: 'Error creando WebSocket',
        details: { error }
      });
    }
  });
}

/**
 * Función para verificar variables de entorno
 */
export function checkEnvironmentVariables(): {
  VITE_WS_URL: string | undefined;
  VITE_API_URL: string | undefined;
} {
  const env = {
    VITE_WS_URL: import.meta.env.VITE_WS_URL,
    VITE_API_URL: import.meta.env.VITE_API_URL
  };

  return env;
}

/**
 * Función para diagnosticar problemas de red
 */
export async function diagnoseNetworkIssues(): Promise<void> {
}

// 🎯 EXPORTAR PARA USO EN CONSOLA DEL NAVEGADOR
if (typeof window !== 'undefined') {
  (window as any).testWebSocketConnection = testWebSocketConnection;
  (window as any).checkEnvironmentVariables = checkEnvironmentVariables;
  (window as any).diagnoseNetworkIssues = diagnoseNetworkIssues;
}
