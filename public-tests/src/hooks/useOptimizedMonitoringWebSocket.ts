import { useCallback, useEffect, useRef, useState } from 'react';
import { MonitoringEvent } from '../../../shared/interfaces/websocket-events.interface';
import { getWebsocketUrl } from '../config/dynamic-endpoints';
import { useTestStore } from '../stores/useTestStore';
import { QuotaType } from './WebSocketTypes';

/**
 * Hook optimizado para envío eficiente de eventos de monitoreo
 * - Debouncing para eventos frecuentes
 * - Queue para eventos offline
 * - Reconexión automática
 * - Logging reducido en producción
 */
export const useOptimizedMonitoringWebSocket = () => {
  const { researchId } = useTestStore();
  const wsRef = useRef<WebSocket | null>(null);
  const isConnectedRef = useRef(false);
  const eventQueueRef = useRef<MonitoringEvent[]>([]);
  const sentEventsRef = useRef<Set<string>>(new Set());
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const debounceTimersRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  const [participantState, setParticipantState] = useState<{
    hasLoggedIn: boolean;
    lastStep: string | null;
    lastProgress: number;
  }>({
    hasLoggedIn: false,
    lastStep: null,
    lastProgress: 0
  });

  const isDev = import.meta.env.DEV;

  const generateEventId = useCallback((event: MonitoringEvent): string => {
    const timestamp = Date.now();
    const participantId = ('participantId' in event.data) ? event.data.participantId : 'unknown';
    return `${event.type}-${participantId}-${timestamp}`;
  }, []);

  const log = useCallback((level: 'info' | 'warn' | 'error', message: string, data?: unknown) => {
  }, []);

  const connect = useCallback(() => {
    if (!researchId || isConnectedRef.current) return;

    try {
      const wsUrl = import.meta.env.VITE_WS_URL || getWebsocketUrl();
      
      log('info', '🔧 Variables de entorno:', {
        VITE_WS_URL: import.meta.env.VITE_WS_URL,
        VITE_API_URL: import.meta.env.VITE_API_URL,
        fallbackWsUrl: getWebsocketUrl(),
        finalWsUrl: wsUrl
      });
      
      log('info', `🔌 Conectando a WebSocket: ${wsUrl}`);

      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        log('info', '✅ WebSocket conectado exitosamente');
        isConnectedRef.current = true;

        if (eventQueueRef.current.length > 0) {
          log('info', `📤 Enviando ${eventQueueRef.current.length} eventos en cola`);
          eventQueueRef.current.forEach(event => sendEventNow(event));
          eventQueueRef.current = [];
        }

        if (researchId) {
          sendEventNow({
            type: 'MONITORING_CONNECT',
            data: {
              researchId,
              timestamp: new Date().toISOString()
            }
          });
        }
      };

      wsRef.current.onclose = (event) => {
        log('warn', `❌ WebSocket desconectado: ${event.code}`, event.reason);
        isConnectedRef.current = false;

        if (event.code !== 1000) {
          const delay = Math.min(5000 * Math.pow(2, eventQueueRef.current.length / 10), 30000);
          reconnectTimeoutRef.current = setTimeout(() => connect(), delay);
        }
      };

      wsRef.current.onerror = (error) => {
        log('error', '❌ Error en WebSocket:', error);
        isConnectedRef.current = false;
      };

    } catch (error) {
      log('error', '❌ Error creando WebSocket:', error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [researchId, log]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = undefined;
    }
    
    debounceTimersRef.current.forEach(timer => clearTimeout(timer));
    debounceTimersRef.current.clear();

    if (wsRef.current) {
      const readyState = wsRef.current.readyState;
      // 🎯 Solo cerrar si el WebSocket está abierto (OPEN = 1)
      // Evitar cerrar si está en estado CONNECTING (0) para prevenir warnings
      if (readyState === WebSocket.OPEN) {
        wsRef.current.close(1000, 'Component unmount');
      }
      // Si está en CONNECTING, simplemente limpiar la referencia
      // El WebSocket se cerrará automáticamente cuando se complete la conexión
      wsRef.current = null;
    }
    isConnectedRef.current = false;
  }, []);

  const sendEventNow = useCallback((event: MonitoringEvent) => {
    const eventId = generateEventId(event);
    
    if (sentEventsRef.current.has(eventId)) {
      return false;
    }

    if (!wsRef.current || !isConnectedRef.current) {
      eventQueueRef.current.push(event);
      log('warn', `📋 Evento agregado a cola offline: ${event.type}`);
      return false;
    }

    try {
      wsRef.current.send(JSON.stringify(event));
      sentEventsRef.current.add(eventId);
      
      if (sentEventsRef.current.size > 50) {
        sentEventsRef.current = new Set(Array.from(sentEventsRef.current).slice(25));
      }

      log('info', `✅ Evento enviado: ${event.type}`);
      return true;
    } catch (error) {
      log('error', '❌ Error enviando evento:', error);
      return false;
    }
  }, [generateEventId, log]);

  const sendEventDebounced = useCallback((event: MonitoringEvent, debounceMs = 1000) => {
    const participantId = ('participantId' in event.data) ? event.data.participantId : 'unknown';
    const questionKey = ('questionKey' in event.data) ? event.data.questionKey : 'default';
    const debounceKey = `${event.type}-${participantId}-${questionKey}`;
    
    const existingTimer = debounceTimersRef.current.get(debounceKey);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    const timer = setTimeout(() => {
      sendEventNow(event);
      debounceTimersRef.current.delete(debounceKey);
    }, debounceMs);

    debounceTimersRef.current.set(debounceKey, timer);
  }, [sendEventNow]);

  const sendParticipantLogin = useCallback((participantId: string, email?: string) => {
    if (participantState.hasLoggedIn) {
      log('info', '⏭️ Login ya enviado, omitiendo duplicado');
      return false;
    }

    const success = sendEventNow({
      type: 'PARTICIPANT_LOGIN',
      data: {
        researchId: researchId || '',
        participantId,
        email,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent
      }
    });

    if (success) {
      setParticipantState(prev => ({ ...prev, hasLoggedIn: true }));
    }

    return success;
  }, [researchId, sendEventNow, participantState.hasLoggedIn, log]);

  const sendParticipantStep = useCallback((
    participantId: string,
    stepName: string,
    stepNumber: number,
    totalSteps: number,
    progress: number,
    duration?: number
  ) => {
    if (participantState.lastStep === stepName && Math.abs(participantState.lastProgress - progress) < 5) {
      return false;
    }

    const success = sendEventDebounced({
      type: 'PARTICIPANT_STEP',
      data: {
        researchId: researchId || '',
        participantId,
        stepName,
        stepNumber,
        totalSteps,
        progress,
        timestamp: new Date().toISOString(),
        duration
      }
    }, 2000);

    setParticipantState(prev => ({
      ...prev,
      lastStep: stepName,
      lastProgress: progress
    }));

    return success;
  }, [researchId, sendEventDebounced, participantState]);

  const sendParticipantResponseSaved = useCallback((
    participantId: string,
    questionKey: string,
    response: unknown,
    stepNumber: number,
    totalSteps: number,
    progress: number
  ) => {
    return sendEventDebounced({
      type: 'PARTICIPANT_RESPONSE_SAVED',
      data: {
        researchId: researchId || '',
        participantId,
        questionKey,
        response: response as string | number | boolean | string[] | Record<string, string | number | boolean | null> | null,
        timestamp: new Date().toISOString(),
        stepNumber,
        totalSteps,
        progress
      }
    }, 500);
  }, [researchId, sendEventDebounced]);

  const sendParticipantCompleted = useCallback((
    participantId: string,
    totalDuration: number,
    responsesCount: number
  ) => {
    return sendEventNow({
      type: 'PARTICIPANT_COMPLETED',
      data: {
        researchId: researchId || '',
        participantId,
        totalDuration,
        timestamp: new Date().toISOString(),
        responsesCount
      }
    });
  }, [researchId, sendEventNow]);

  const sendParticipantDisqualified = useCallback((
    participantId: string,
    reason: string,
    demographicData: Record<string, string>,
    disqualificationType: 'demographics' | 'quota' | 'manual'
  ) => {
    return sendEventNow({
      type: 'PARTICIPANT_DISQUALIFIED',
      data: {
        researchId: researchId || '',
        participantId,
        reason,
        demographicData,
        timestamp: new Date().toISOString(),
        disqualificationType
      }
    });
  }, [researchId, sendEventNow]);

  const sendParticipantQuotaExceeded = useCallback((
    participantId: string,
    quotaType: string,
    quotaValue: string,
    currentCount: number,
    maxQuota: number,
    demographicData: Record<string, string>
  ) => {
    return sendEventNow({
      type: 'PARTICIPANT_QUOTA_EXCEEDED',
      data: {
        researchId: researchId || '',
        participantId,
        quotaType: quotaType as QuotaType,
        quotaValue,
        currentCount,
        maxQuota,
        demographicData,
        timestamp: new Date().toISOString()
      }
    });
  }, [researchId, sendEventNow]);

  const sendParticipantError = useCallback((
    participantId: string,
    error: string,
    stepName?: string
  ) => {
    return sendEventNow({
      type: 'PARTICIPANT_ERROR',
      data: {
        researchId: researchId || '',
        participantId,
        error,
        stepName,
        timestamp: new Date().toISOString()
      }
    });
  }, [researchId, sendEventNow]);

  useEffect(() => {
    if (researchId) {
      connect();
    }

    return disconnect;
  }, [researchId, connect, disconnect]);

  // 🎯 RESET STATE CUANDO CAMBIA RESEARCH
  useEffect(() => {
    setParticipantState({
      hasLoggedIn: false,
      lastStep: null,
      lastProgress: 0
    });
    sentEventsRef.current.clear();
  }, [researchId]);

  return {
    isConnected: isConnectedRef.current,
    queueLength: eventQueueRef.current.length,
    participantState,
    // Métodos optimizados
    sendParticipantLogin,
    sendParticipantStep,
    sendParticipantResponseSaved,
    sendParticipantCompleted,
    sendParticipantDisqualified,
    sendParticipantQuotaExceeded,
    sendParticipantError,
    // Control manual
    connect,
    disconnect
  };
};