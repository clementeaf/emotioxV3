import { useCallback, useEffect, useRef } from 'react';

import { getWebsocketUrl } from '@/api/dynamic-endpoints';
import {
  ParticipantLoginData,
  ParticipantResponseSavedData,
  ParticipantStepData,
  WebSocketEvent,
  WebSocketMessage
} from '../../../shared/src/types/websocket.types';
import { useAuth } from '../providers/AuthProvider';

const TOKEN_REFRESH_INTERVAL = 12 * 60 * 60 * 1000; // 12 horas

export const useWebSocketConnection = () => {
  const ws = useRef<WebSocket | null>(null);
  const { token } = useAuth();
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const tokenRefreshIntervalRef = useRef<NodeJS.Timeout>();

  const connect = useCallback(() => {
    if (!token) { return; }

    const wsUrl = `${getWebsocketUrl()}?token=${token}`;
    ws.current = new WebSocket(wsUrl);

    ws.current.onopen = () => {
      // Iniciar el intervalo de renovación del token
      tokenRefreshIntervalRef.current = setInterval(() => {
        if (ws.current?.readyState === WebSocket.OPEN) {
          ws.current.send(JSON.stringify({
            event: WebSocketEvent.TOKEN_REFRESH,
            data: { token }
          }));
        }
      }, TOKEN_REFRESH_INTERVAL);
    };

    ws.current.onclose = () => {
      // Limpiar el intervalo de renovación del token
      if (tokenRefreshIntervalRef.current) {
        clearInterval(tokenRefreshIntervalRef.current);
      }
      // Intentar reconectar después de 5 segundos
      reconnectTimeoutRef.current = setTimeout(() => {
        connect();
      }, 5000);
    };

    ws.current.onerror = (error) => {
    };

    ws.current.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data) as WebSocketMessage;

        switch (message.event) {
          case WebSocketEvent.TOKEN_REFRESHED:
            const { token: newToken } = message.data as { token: string };
            break;
          case WebSocketEvent.ERROR:
            break;

          // 🎯 MONITORING EVENTS
          case WebSocketEvent.MONITORING_CONNECT:
            break;

          case WebSocketEvent.PARTICIPANT_LOGIN:
            const loginData = message.data as ParticipantLoginData;
            // 🎯 AQUÍ PODRÍAS ACTUALIZAR EL ESTADO DEL DASHBOARD
            break;

          case WebSocketEvent.PARTICIPANT_STEP:
            const stepData = message.data as ParticipantStepData;
            // 🎯 AQUÍ PODRÍAS ACTUALIZAR EL PROGRESO DEL PARTICIPANTE
            break;

          case WebSocketEvent.PARTICIPANT_RESPONSE_SAVED:
            const responseData = message.data as ParticipantResponseSavedData;
            // 🎯 AQUÍ PODRÍAS ACTUALIZAR LAS RESPUESTAS Y PROGRESO
            break;

          case WebSocketEvent.PARTICIPANT_DISQUALIFIED:
            break;

          case WebSocketEvent.PARTICIPANT_QUOTA_EXCEEDED:
            break;

          case WebSocketEvent.PARTICIPANT_COMPLETED:
            break;

          case WebSocketEvent.PARTICIPANT_ERROR:
            break;
        }
      } catch (error) {
      }
    };
  }, [token]);

  const disconnect = useCallback(() => {
    if (ws.current) {
      ws.current.close();
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (tokenRefreshIntervalRef.current) {
      clearInterval(tokenRefreshIntervalRef.current);
    }
  }, []);

  const sendMessage = useCallback((message: WebSocketMessage) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(message));
    } else {
    }
  }, []);

  useEffect(() => {
    connect();
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    sendMessage,
    isConnected: ws.current?.readyState === WebSocket.OPEN
  };
};
