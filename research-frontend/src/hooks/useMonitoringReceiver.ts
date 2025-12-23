import { useState, useEffect, useCallback } from 'react';

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

    const getWebsocketUrl = (): string => {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.host;
        return `${protocol}//${host}/ws`;
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

    const connect = useCallback(() => {
        if (!researchId || !token) {
            setError('Missing researchId or token');
            return;
        }

        // Close existing connection if any
        if (ws) {
            ws.close();
        }

        try {
            const wsUrl = `${getWebsocketUrl()}?researchId=${researchId}&token=${token}`;
            const newWs = new WebSocket(wsUrl);

            newWs.onopen = () => {
                setIsConnected(true);
                setError(null);
                console.log('Monitoring WebSocket connected');
            };

            newWs.onmessage = (event) => {
                try {
                    const eventMessage = JSON.parse(event.data);

                    switch (eventMessage.type) {
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

            newWs.onerror = (error) => {
                console.error('WebSocket error:', error);
                setError('WebSocket connection error');
            };

            newWs.onclose = () => {
                setIsConnected(false);
                console.log('Monitoring WebSocket disconnected');
            };

            setWs(newWs);
        } catch (connectionError) {
            console.error('Failed to create WebSocket connection:', connectionError);
            setError('Failed to establish WebSocket connection');
        }
    }, [researchId, token, ws, handleParticipantLogin, handleParticipantStep, handleParticipantDisqualified, handleParticipantQuotaExceeded, handleParticipantCompleted, handleParticipantError]);

    const disconnect = useCallback(() => {
        if (ws) {
            ws.close();
            setWs(null);
            setIsConnected(false);
        }
    }, [ws]);

    // Initialize connection when researchId and token are available
    useEffect(() => {
        if (researchId && token) {
            connect();
        } else {
            disconnect();
        }

        return () => {
            disconnect();
        };
    }, [researchId, token, connect, disconnect]);

    return {
        isConnected,
        error,
        monitoringData,
        connect,
        disconnect
    };
};