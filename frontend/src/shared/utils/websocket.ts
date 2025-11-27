import { useEffect, useRef } from 'react';

// import { API_BASE_URL } from '../api/config'; // Comentado - ruta no existe
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
import { useAuth } from '@/providers/AuthProvider';

// Estado de la conexión
export enum ConnectionStatus {
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
  ERROR = 'error',
}

// Utilidad para el WebSocket
export const useWebSocketConnection = () => {
  const { token } = useAuth();
  const wsRef = useRef<WebSocket | null>(null);
  const statusRef = useRef<ConnectionStatus>(ConnectionStatus.DISCONNECTED);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const tokenRefreshTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Establecer la conexión
  const connect = () => {
    if (!token) {return;}

    try {
      // Cerrar la conexión existente si hay alguna
      if (wsRef.current) {
        wsRef.current.close();
      }

      statusRef.current = ConnectionStatus.CONNECTING;

      // Crear nueva conexión con el token como parámetro
      const httpUrl = API_BASE_URL;
      const wsProtoUrl = httpUrl.replace(/^http/, 'ws'); // Cambiar http:// a ws:// o https:// a wss://
      // Asumir ruta /ws y token como query param (ajustar si es diferente)
      const wsUrl = `${wsProtoUrl}/ws?token=${token}`;

      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        statusRef.current = ConnectionStatus.CONNECTED;

        // Programar refresh del token 5 minutos antes de que expire
        const payload = JSON.parse(atob(token.split('.')[1]));
        const expiryTime = payload.exp * 1000; // Convertir a milisegundos
        const timeToExpiry = expiryTime - Date.now();
        const refreshTime = timeToExpiry - (5 * 60 * 1000); // 5 minutos antes

        if (tokenRefreshTimerRef.current) {
          clearTimeout(tokenRefreshTimerRef.current);
        }

        if (refreshTime > 0) {
          tokenRefreshTimerRef.current = setTimeout(() => {
            if (wsRef.current?.readyState === WebSocket.OPEN) {
              wsRef.current.send(JSON.stringify({
                action: 'refreshToken',
                token
              }));
            }
          }, refreshTime);
        }
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.action === 'tokenRefreshed' && data.token) {
            // Note: Token refresh is handled at the WebSocket level.
            // Global token state updates are managed by the auth context separately.
          }
        } catch (error) {
          // Error handling for WebSocket message processing
        }
      };

      ws.onerror = () => {
        statusRef.current = ConnectionStatus.ERROR;
      };

      ws.onclose = () => {
        statusRef.current = ConnectionStatus.DISCONNECTED;

        // Reintentar conexión después de un tiempo
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
        }

        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, 5000); // Reintentar después de 5 segundos
      };

      wsRef.current = ws;
    } catch (error) {
      statusRef.current = ConnectionStatus.ERROR;
    }
  };

  // Desconectar
  const disconnect = () => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (tokenRefreshTimerRef.current) {
      clearTimeout(tokenRefreshTimerRef.current);
      tokenRefreshTimerRef.current = null;
    }

    statusRef.current = ConnectionStatus.DISCONNECTED;
  };

  // Conectar al montar y desconectar al desmontar
  useEffect(() => {
    if (token) {
      connect();
    } else {
      disconnect();
    }

    return () => {
      disconnect();
    };
  }, [token]);

  return {
    status: statusRef.current,
    reconnect: connect,
    disconnect
  };
};
