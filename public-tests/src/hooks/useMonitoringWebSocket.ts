import { useCallback, useEffect, useRef } from 'react';
import { MonitoringEvent } from '../../../shared/interfaces/websocket-events.interface';
import { getWebsocketUrl } from '../config/dynamic-endpoints';
import { useTestStore } from '../stores/useTestStore';
import { QuotaType } from './WebSocketTypes';

/**
 * Hook para enviar eventos de monitoreo vía WebSocket
 * Desde public-tests hacia el dashboard
 */
export const useMonitoringWebSocket = () => {
  const { researchId } = useTestStore();
  const wsRef = useRef<WebSocket | null>(null);
  const isConnectedRef = useRef(false);

  // 🎯 CONECTAR AL WEBSOCKET
  const connect = useCallback(() => {
    if (!researchId) {
      return;
    }

    try {
      // 🎯 USAR ENDPOINT DINÁMICO SINCRONIZADO
      const wsUrl = import.meta.env.VITE_WS_URL || getWebsocketUrl();

      wsRef.current = new WebSocket(wsUrl);

      if (wsRef.current) {
        wsRef.current.onopen = () => {
          isConnectedRef.current = true;

          // 🎯 ENVIAR EVENTO DE CONEXIÓN
          if (researchId) {
            sendEvent({
              type: 'MONITORING_CONNECT',
              data: {
                researchId,
                timestamp: new Date().toISOString()
              }
            });
          }
        };

        wsRef.current.onclose = (event) => {
          isConnectedRef.current = false;
        };

        wsRef.current.onerror = (error) => {
          isConnectedRef.current = false;
        };
      }

    } catch (error) {
      isConnectedRef.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [researchId]);

  // 🎯 DESCONECTAR
  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    isConnectedRef.current = false;
  }, []);

  // 🎯 ENVIAR EVENTO
  const sendEvent = useCallback((event: MonitoringEvent) => {
    if (!wsRef.current || !isConnectedRef.current) {
      return false;
    }

    try {
      const messageString = JSON.stringify(event);
      wsRef.current.send(messageString);
      return true;
    } catch (error) {
      return false;
    }
  }, []);

  // 🎯 EVENTOS ESPECÍFICOS
  const sendParticipantLogin = useCallback((participantId: string, email?: string) => {
    const result = sendEvent({
      type: 'PARTICIPANT_LOGIN',
      data: {
        researchId: researchId || '',
        participantId,
        email,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        ipAddress: undefined // Se obtiene del servidor
      }
    });

    return result;
  }, [researchId, sendEvent]);

  const sendParticipantStep = useCallback((
    participantId: string,
    stepName: string,
    stepNumber: number,
    totalSteps: number,
    progress: number,
    duration?: number
  ) => {
    return sendEvent({
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
    });
  }, [researchId, sendEvent]);

  const sendParticipantDisqualified = useCallback((
    participantId: string,
    reason: string,
    demographicData: Record<string, string>,
    disqualificationType: 'demographics' | 'quota' | 'manual'
  ) => {
    return sendEvent({
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
  }, [researchId, sendEvent]);

  const sendParticipantQuotaExceeded = useCallback((
    participantId: string,
    quotaType: string,
    quotaValue: string,
    currentCount: number,
    maxQuota: number,
    demographicData: Record<string, string>
  ) => {
    return sendEvent({
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
  }, [researchId, sendEvent]);

  const sendParticipantCompleted = useCallback((
    participantId: string,
    totalDuration: number,
    responsesCount: number
  ) => {
    return sendEvent({
      type: 'PARTICIPANT_COMPLETED',
      data: {
        researchId: researchId || '',
        participantId,
        totalDuration,
        timestamp: new Date().toISOString(),
        responsesCount
      }
    });
  }, [researchId, sendEvent]);

  const sendParticipantError = useCallback((
    participantId: string,
    error: string,
    stepName?: string
  ) => {
    return sendEvent({
      type: 'PARTICIPANT_ERROR',
      data: {
        researchId: researchId || '',
        participantId,
        error,
        stepName,
        timestamp: new Date().toISOString()
      }
    });
  }, [researchId, sendEvent]);

  // 🎯 ENVIAR EVENTO DE RESPUESTA GUARDADA
  const sendParticipantResponseSaved = useCallback((
    participantId: string,
    questionKey: string,
    response: unknown,
    stepNumber: number,
    totalSteps: number,
    progress: number
  ) => {
    return sendEvent({
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
    });
  }, [researchId, sendEvent]);

  // 🎯 CONECTAR AL MONTAR
  useEffect(() => {
    if (researchId) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [researchId, connect, disconnect]);

  return {
    isConnected: isConnectedRef.current,
    sendParticipantLogin,
    sendParticipantStep,
    sendParticipantDisqualified,
    sendParticipantQuotaExceeded,
    sendParticipantCompleted,
    sendParticipantError,
    sendParticipantResponseSaved
  };
};
