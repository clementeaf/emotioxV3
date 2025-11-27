import { useCallback, useEffect, useRef, useState } from 'react';
import { MonitoringEvent, ParticipantStatus, ResearchMonitoringData } from '../../../shared/interfaces/websocket-events.interface';
import { DYNAMIC_API_ENDPOINTS, getWebsocketUrl } from '../api/dynamic-endpoints';
import { useAuth } from '../providers/AuthProvider';
// debug-env eliminado - usar herramientas nativas del navegador

/**
 * Hook para recibir eventos de monitoreo en tiempo real
 * En el dashboard del frontend
 * USANDO ENDPOINTS DINÁMICOS
 */
export const useMonitoringReceiver = (researchId: string) => {
  const { token: contextToken } = useAuth();

  // 🎯 FALLBACK: OBTENER TOKEN DEL LOCALSTORAGE SI EL CONTEXTO NO FUNCIONA
  const [localToken, setLocalToken] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [endpoints, setEndpoints] = useState<any>(null);
  const [isLoadingEndpoints, setIsLoadingEndpoints] = useState(true);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    setLocalToken(storedToken);
  }, []);

  // 🎯 USAR TOKEN DEL CONTEXTO O FALLBACK AL LOCALSTORAGE
  const token = contextToken || localToken;

  const wsRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [monitoringData, setMonitoringData] = useState<ResearchMonitoringData>({
    researchId,
    participants: [],
    totalParticipants: 0,
    activeParticipants: 0,
    completedParticipants: 0,
    disqualifiedParticipants: 0,
    averageProgress: 0,
    lastUpdate: new Date().toISOString()
  });

  // 🎯 CARGAR ENDPOINTS DINÁMICOS
  useEffect(() => {
    const loadEndpoints = () => {
      try {
        const dynamicEndpoints = DYNAMIC_API_ENDPOINTS;
        setEndpoints(dynamicEndpoints);
      } catch (error) {
        setEndpoints(null);
      } finally {
        setIsLoadingEndpoints(false);
      }
    };

    loadEndpoints();
  }, []);

  // 🎯 CONECTAR AL WEBSOCKET
  const connect = useCallback(() => {
    if (!token || !researchId || isConnecting || isLoadingEndpoints || !endpoints) {
      return;
    }

    setIsConnecting(true);

    try {
      // 🎯 DIAGNÓSTICO: VERIFICAR VARIABLES DE ENTORNO
      // debugEnvironmentVariables(); // Eliminado - usar herramientas nativas del navegador

      // 🎯 USAR ENDPOINT CORRECTO DE AWS
      const wsUrl = getWebsocketUrl();


      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        setIsConnected(true);
        setIsConnecting(false);
        reconnectAttemptsRef.current = 0; // Reset intentos al conectar exitosamente

        // 🎯 ENVIAR EVENTO DE CONEXIÓN DE MONITOREO (mismo formato que public-tests)
        const connectMessage = {
          type: 'MONITORING_CONNECT',
          data: {
            researchId,
            timestamp: new Date().toISOString()
          }
        };

        // 🎯 VERIFICAR QUE EL WEBSOCKET ESTÉ LISTO ANTES DE ENVIAR
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify(connectMessage));
        }
      };

      wsRef.current.onclose = (event) => {
        setIsConnected(false);
        setIsConnecting(false);
        wsRef.current = null; // Limpiar referencia

        // 🎯 DELAY ANTES DE RECONECTAR (5 SEGUNDOS)
        if (event.code !== 1000 && event.code !== 1001) { // No es cierre limpio o going away
          reconnectAttemptsRef.current++;
          
          if (reconnectAttemptsRef.current <= maxReconnectAttempts) {
            const delay = Math.min(5000 * reconnectAttemptsRef.current, 30000); // Incrementar delay, máximo 30s
            
            setTimeout(() => {
              // 🎯 VERIFICAR QUE NO ESTEMOS YA CONECTANDO Y QUE NO HAYA OTRA CONEXIÓN
              if (token && researchId && !wsRef.current && !isConnecting) {
                connect();
              }
            }, delay);
          } else {
          }
        }
      };

      wsRef.current.onerror = (event) => {
        setIsConnected(false);
        setIsConnecting(false);
      };

      wsRef.current.onmessage = (event) => {
        try {
          const rawMessage = JSON.parse(event.data);

          // 🎯 CONVERTIR FORMATO DE BACKEND A FORMATO ESPERADO
          // Backend envía: { type: 'status_update', data: { message: 'PARTICIPANT_LOGIN', metadata: {...} } }
          // Frontend espera: { type: 'PARTICIPANT_LOGIN', data: {...} }
          let message: MonitoringEvent;

          if (rawMessage.type === 'status_update' && rawMessage.data?.message) {
            // Convertir de formato backend a formato frontend
            message = {
              type: rawMessage.data.message,
              data: rawMessage.data.metadata || rawMessage.data
            };
          } else {
            // Ya está en el formato correcto
            message = rawMessage;
          }

          handleMonitoringEvent(message);
        } catch (error) {
        }
      };

    } catch (error) {
      setIsConnecting(false);
    }
  }, [token, researchId, endpoints, isLoadingEndpoints]);

  // 🎯 DESCONECTAR
  const disconnect = useCallback(() => {
    if (wsRef.current) {
      // Limpiar event handlers antes de cerrar para evitar reconexión
      wsRef.current.onclose = null;
      wsRef.current.onerror = null;
      wsRef.current.onmessage = null;
      wsRef.current.onopen = null;
      
      if (wsRef.current.readyState === WebSocket.OPEN || 
          wsRef.current.readyState === WebSocket.CONNECTING) {
        wsRef.current.close(1000, 'Disconnect requested');
      }
      wsRef.current = null;
    }
    setIsConnected(false);
    setIsConnecting(false);
    reconnectAttemptsRef.current = 0;
  }, []);

  // 🎯 MANEJAR EVENTOS DE MONITOREO
  const handleMonitoringEvent = useCallback((event: MonitoringEvent) => {

    switch (event.type) {
      case 'PARTICIPANT_LOGIN':
        handleParticipantLogin(event.data);
        break;
      case 'PARTICIPANT_STEP':
        handleParticipantStep(event.data);
        break;
      case 'PARTICIPANT_DISQUALIFIED':
        handleParticipantDisqualified(event.data);
        break;
      case 'PARTICIPANT_QUOTA_EXCEEDED':
        handleParticipantQuotaExceeded(event.data);
        break;
      case 'PARTICIPANT_COMPLETED':
        handleParticipantCompleted(event.data);
        break;
      case 'PARTICIPANT_ERROR':
        handleParticipantError(event.data);
        break;
      default:
    }
  }, []);

  // 🎯 MANEJAR LOGIN DE PARTICIPANTE
  const handleParticipantLogin = useCallback((data: any) => {
    setMonitoringData(prev => {

      const existingParticipant = prev.participants.find(p => p.participantId === data.participantId);

      if (existingParticipant) {

        // Actualizar participante existente
        const updatedParticipants = prev.participants.map(p =>
          p.participantId === data.participantId
            ? { ...p, lastActivity: data.timestamp, status: 'in_progress' as const }
            : p
        );

        const newState = {
          ...prev,
          participants: updatedParticipants,
          activeParticipants: updatedParticipants.filter(p => p.status === 'in_progress').length,
          lastUpdate: data.timestamp
        };

        return newState;
      } else {

        // Agregar nuevo participante
        const newParticipant: ParticipantStatus = {
          participantId: data.participantId,
          email: data.email,
          status: 'in_progress',
          progress: 0,
          lastActivity: data.timestamp
        };

        const updatedParticipants = [...prev.participants, newParticipant];

        const newState = {
          ...prev,
          participants: updatedParticipants,
          totalParticipants: updatedParticipants.length,
          activeParticipants: updatedParticipants.filter(p => p.status === 'in_progress').length,
          lastUpdate: data.timestamp
        };

        return newState;
      }
    });
  }, []);

  // 🎯 MANEJAR STEP DE PARTICIPANTE
  const handleParticipantStep = useCallback((data: any) => {
    setMonitoringData(prev => {
      const updatedParticipants = prev.participants.map(p =>
        p.participantId === data.participantId
          ? {
            ...p,
            currentStep: data.stepName,
            progress: data.progress,
            lastActivity: data.timestamp,
            duration: data.duration
          }
          : p
      );

      const averageProgress = updatedParticipants.length > 0
        ? updatedParticipants.reduce((sum, p) => sum + p.progress, 0) / updatedParticipants.length
        : 0;

      return {
        ...prev,
        participants: updatedParticipants,
        averageProgress,
        lastUpdate: data.timestamp
      };
    });
  }, []);

  // 🎯 MANEJAR DESCALIFICACIÓN DE PARTICIPANTE
  const handleParticipantDisqualified = useCallback((data: any) => {
    setMonitoringData(prev => {
      const updatedParticipants = prev.participants.map(p =>
        p.participantId === data.participantId
          ? {
            ...p,
            status: 'disqualified' as const,
            disqualificationReason: data.reason,
            lastActivity: data.timestamp
          }
          : p
      );

      return {
        ...prev,
        participants: updatedParticipants,
        disqualifiedParticipants: updatedParticipants.filter(p => p.status === 'disqualified').length,
        activeParticipants: updatedParticipants.filter(p => p.status === 'in_progress').length,
        lastUpdate: data.timestamp
      };
    });
  }, []);

  // 🎯 MANEJAR EXCESO DE CUOTA
  const handleParticipantQuotaExceeded = useCallback((data: any) => {
    setMonitoringData(prev => {
      const updatedParticipants = prev.participants.map(p =>
        p.participantId === data.participantId
          ? {
            ...p,
            status: 'disqualified' as const,
            disqualificationReason: `Cuota excedida: ${data.quotaType} - ${data.quotaValue}`,
            quotaExceeded: {
              type: data.quotaType,
              value: data.quotaValue
            },
            lastActivity: data.timestamp
          }
          : p
      );

      return {
        ...prev,
        participants: updatedParticipants,
        disqualifiedParticipants: updatedParticipants.filter(p => p.status === 'disqualified').length,
        activeParticipants: updatedParticipants.filter(p => p.status === 'in_progress').length,
        lastUpdate: data.timestamp
      };
    });
  }, []);

  // 🎯 MANEJAR COMPLETACIÓN DE PARTICIPANTE
  const handleParticipantCompleted = useCallback((data: any) => {
    setMonitoringData(prev => {
      const updatedParticipants = prev.participants.map(p =>
        p.participantId === data.participantId
          ? {
            ...p,
            status: 'completed' as const,
            progress: 100,
            lastActivity: data.timestamp
          }
          : p
      );

      return {
        ...prev,
        participants: updatedParticipants,
        completedParticipants: updatedParticipants.filter(p => p.status === 'completed').length,
        activeParticipants: updatedParticipants.filter(p => p.status === 'in_progress').length,
        lastUpdate: data.timestamp
      };
    });
  }, []);

  // 🎯 MANEJAR ERROR DE PARTICIPANTE
  const handleParticipantError = useCallback((data: any) => {
    setMonitoringData(prev => {
      const updatedParticipants = prev.participants.map(p =>
        p.participantId === data.participantId
          ? {
            ...p,
            status: 'error' as const,
            lastActivity: data.timestamp
          }
          : p
      );

      return {
        ...prev,
        participants: updatedParticipants,
        lastUpdate: data.timestamp
      };
    });
  }, []);

  // 🎯 CONECTAR AL MONTAR
  useEffect(() => {
    if (token && researchId && !isLoadingEndpoints && endpoints) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [token, researchId, endpoints, isLoadingEndpoints]);

  return {
    isConnected,
    monitoringData,
    reconnect: connect
  };
};
