import { useState, useEffect, useCallback } from 'react';
import { configService } from '../services/api/config.service';

interface Participant {
    id: string;
    name: string;
    email: string;
    status: 'En proceso' | 'Por iniciar' | 'Completado';
    progress: number;
    duration: string;
    lastActivity: string;
    steps: Array<{
        name: string;
        completed: boolean;
        duration: string;
    }>;
}

interface MonitoringDataState {
    participants: Participant[];
    metrics: {
        total: number;
        active: number;
        completed: number;
        avgCompletionTime: string;
        completionRate: number;
    };
    lastUpdate: string;
}

export const useMonitoringReceiver = (researchId: string | null, token: string | null) => {
    const [ws, setWs] = useState<WebSocket | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [monitoringData, setMonitoringData] = useState<MonitoringDataState>({
        participants: [],
        metrics: {
            total: 0,
            active: 0,
            completed: 0,
            avgCompletionTime: '00:00:00',
            completionRate: 0
        },
        lastUpdate: new Date().toISOString()
    });

    /**
     * Obtiene la URL del WebSocket API desde la configuración
     * Funciona tanto en desarrollo local como en producción (S3/CloudFront)
     * @returns URL completa del WebSocket API Gateway o null si no está disponible
     */
    const getWebsocketUrl = async (): Promise<string | null> => {
        // Priority 1: Allow override via environment variable (useful for production with distinct API Gateway)
        if (import.meta.env.VITE_WEBSOCKET_URL) {
            return import.meta.env.VITE_WEBSOCKET_URL;
        }

        // Priority 2: Try to get from config service (works in both local and production)
        try {
            // Ensure config is initialized - init() is idempotent and handles both local and production
            // In local: uses VITE_API_URL or DEFAULT_LOCAL_API_BASE_URL
            // In production: reads /runtime-config.json from CloudFront, then calls ${apiBaseUrl}/config
            await configService.init();
            const config = configService.getConfig();
            if (config.websocketApiUrl) {
                return config.websocketApiUrl;
            }
        } catch (error) {
            console.warn('Failed to get WebSocket URL from config service, using fallback', error);
        }

        // Priority 3: Fallback based on environment
        // In local development: use localhost
        // In production: this should not happen if config service is working correctly
        const isLocalhost = typeof window !== 'undefined' && window.location.hostname === 'localhost';
        if (isLocalhost) {
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            return `${protocol}//localhost:3001`;
        }

        // Last resort: try to construct from current origin (should not be needed in production)
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.host;
        console.warn('Using fallback WebSocket URL. This should not happen in production.', `${protocol}//${host}`);
        return `${protocol}//${host}`;
    };

    // Event handlers
    const handleParticipantLogin = useCallback((data: { participantId: string; timestamp: string }) => {
        setMonitoringData(prev => {
            const participantExists = prev.participants.some(p => p.id === data.participantId);
            if (participantExists) {
                return prev;
            }

            const newParticipant: Participant = {
                id: data.participantId,
                name: `Participant ${prev.participants.length + 1}`,
                email: `participant${prev.participants.length + 1}@example.com`,
                status: 'Por iniciar' as const,
                progress: 0,
                duration: '00:00:00',
                lastActivity: data.timestamp,
                steps: []
            };

            return {
                ...prev,
                participants: [...prev.participants, newParticipant],
                metrics: {
                    ...prev.metrics,
                    total: prev.metrics.total + 1,
                    active: prev.metrics.active + 1
                },
                lastUpdate: new Date().toISOString()
            };
        });
    }, []);

    const handleParticipantStep = useCallback((data: { participantId: string; stepName: string; progress: number; timestamp: string; duration: string }) => {
        setMonitoringData(prev => {
            const updatedParticipants = prev.participants.map(p => {
                if (p.id === data.participantId) {
                    // Check if step already exists
                    const stepExists = p.steps.some(step => step.name === data.stepName);

                    const updatedSteps = stepExists
                        ? p.steps.map(step =>
                            step.name === data.stepName
                                ? { ...step, completed: true, duration: data.duration }
                                : step
                        )
                        : [...p.steps, { name: data.stepName, completed: true, duration: data.duration }];

                    const completedSteps = updatedSteps.filter(step => step.completed).length;
                    const totalSteps = updatedSteps.length;
                    const newProgress = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

                    return {
                        ...p,
                        progress: newProgress,
                        status: (newProgress === 100 ? 'Completado' : 'En proceso') as Participant['status'],
                        duration: data.duration,
                        lastActivity: data.timestamp,
                        steps: updatedSteps
                    };
                }
                return p;
            });

            const completedCount = updatedParticipants.filter(p => p.status === 'Completado').length;
            const activeCount = updatedParticipants.filter(p => p.status === 'En proceso' || p.status === 'Por iniciar').length;

            return {
                ...prev,
                participants: updatedParticipants,
                metrics: {
                    ...prev.metrics,
                    active: activeCount,
                    completed: completedCount,
                    completionRate: prev.participants.length > 0 ? Math.round((completedCount / prev.participants.length) * 100) : 0
                },
                lastUpdate: new Date().toISOString()
            };
        });
    }, []);

    const handleParticipantDisqualified = useCallback((data: { participantId: string; reason: string; timestamp: string }) => {
        setMonitoringData(prev => {
            const updatedParticipants = prev.participants.map(p =>
                p.id === data.participantId
                    ? {
                        ...p,
                        status: 'Completado' as const // Disqualified participants are marked as completed
                    }
                    : p
            );

            const completedCount = updatedParticipants.filter(p => p.status === 'Completado').length;

            return {
                ...prev,
                participants: updatedParticipants,
                metrics: {
                    ...prev.metrics,
                    completed: completedCount,
                    completionRate: prev.participants.length > 0 ? Math.round((completedCount / prev.participants.length) * 100) : 0
                },
                lastUpdate: new Date().toISOString()
            };
        });
    }, []);

    const handleParticipantQuotaExceeded = useCallback((data: { participantId: string; quotaType: string; quotaValue: string; timestamp: string }) => {
        // Handle quota exceeded event
        console.log('Quota exceeded:', data);
    }, []);

    const handleParticipantCompleted = useCallback((data: { participantId: string; timestamp: string }) => {
        setMonitoringData(prev => {
            const updatedParticipants = prev.participants.map(p =>
                p.id === data.participantId
                    ? { ...p, status: 'Completado' as const, progress: 100 }
                    : p
            );

            const completedCount = updatedParticipants.filter(p => p.status === 'Completado').length;

            return {
                ...prev,
                participants: updatedParticipants,
                metrics: {
                    ...prev.metrics,
                    active: prev.metrics.active - 1,
                    completed: completedCount,
                    completionRate: prev.participants.length > 0 ? Math.round((completedCount / prev.participants.length) * 100) : 0
                },
                lastUpdate: new Date().toISOString()
            };
        });
    }, []);

    const handleParticipantError = useCallback((data: { participantId: string; timestamp: string }) => {
        // Handle participant error event
        console.log('Participant error:', data);
    }, []);

    // Initialize connection when researchId and token are available
    useEffect(() => {
        if (!researchId || !token) {
            return;
        }

        let socket: WebSocket | null = null;

        const connectWebSocket = async (): Promise<void> => {
            try {
                const baseUrl = await getWebsocketUrl();
                if (!baseUrl) {
                    console.error('WebSocket URL not available');
                    setError('WebSocket URL not configured');
                    return;
                }

                // Ensure baseUrl doesn't have trailing slash, and add query params
                const cleanBaseUrl = baseUrl.replace(/\/+$/, '');
                const wsUrl = `${cleanBaseUrl}?researchId=${encodeURIComponent(researchId)}&token=${encodeURIComponent(token)}`;
                socket = new WebSocket(wsUrl);

                socket.onopen = () => {
                    setIsConnected(true);
                    setError(null);
                    console.log('Monitoring WebSocket connected');
                };

                socket.onmessage = (event) => {
                    try {
                        const eventMessage = JSON.parse(event.data);

                        switch (eventMessage.type) {
                            case 'RESEARCH_UPDATE':
                                // Handle full state update from backend
                                setMonitoringData(prev => ({
                                    ...prev,
                                    ...eventMessage.data, // Expecting { metrics, participants }
                                    lastUpdate: new Date().toISOString()
                                }));
                                break;

                            case 'PARTICIPANT_LOGIN':
                                handleParticipantLogin(eventMessage.data as { participantId: string; timestamp: string });
                                break;
                            case 'PARTICIPANT_STEP':
                                handleParticipantStep(eventMessage.data as { participantId: string; stepName: string; progress: number; timestamp: string; duration: string });
                                break;
                            case 'PARTICIPANT_DISQUALIFIED':
                                handleParticipantDisqualified(eventMessage.data as { participantId: string; reason: string; timestamp: string });
                                break;
                            case 'PARTICIPANT_QUOTA_EXCEEDED':
                                handleParticipantQuotaExceeded(eventMessage.data as { participantId: string; quotaType: string; quotaValue: string; timestamp: string });
                                break;
                            case 'PARTICIPANT_COMPLETED':
                                handleParticipantCompleted(eventMessage.data as { participantId: string; timestamp: string });
                                break;
                            case 'PARTICIPANT_ERROR':
                                handleParticipantError(eventMessage.data as { participantId: string; timestamp: string });
                                break;
                            default:
                                break;
                        }
                    } catch (parseError) {
                        console.error('Error parsing WebSocket message:', parseError);
                    }
                };

                socket.onerror = (error) => {
                    console.error('WebSocket error:', error);
                    // Only set error if we are not already connected to avoid loop on immediate fail
                    setIsConnected(false);
                    setError('WebSocket connection error');
                };

                socket.onclose = () => {
                    setIsConnected(false);
                    console.log('Monitoring WebSocket disconnected');
                };

                setWs(socket);
            } catch (connectionError) {
                console.error('Failed to create WebSocket connection:', connectionError);
                setError('Failed to establish WebSocket connection');
            }
        };

        void connectWebSocket();

        return () => {
            if (socket) {
                socket.close();
            }
        };
    }, [researchId, token, handleParticipantLogin, handleParticipantStep, handleParticipantDisqualified, handleParticipantQuotaExceeded, handleParticipantCompleted, handleParticipantError]);

    const connect = useCallback(() => {
        // No-op - connection is managed by useEffect now
        // Force re-render or logic if needed, but for now we rely on auto-connect
        console.log('Manual connect requested - handled by effect');
    }, []);

    const disconnect = useCallback(() => {
        if (ws) {
            ws.close();
        }
    }, [ws]);

    return {
        isConnected,
        error,
        monitoringData,
        connect,
        disconnect
    };
};