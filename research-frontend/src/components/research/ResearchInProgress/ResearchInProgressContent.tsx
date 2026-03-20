import { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { ParticipantsTable } from '../participants/ParticipantsTable';
import { Button } from '../../ui/Button';
import { useAuthStore } from '../../../stores/auth.store';
import { useMonitoringReceiver } from '../../../hooks/useMonitoringReceiver';
import { researchInProgressService, type ResearchStatus, type Participant, type ResearchConfiguration } from '../../../services/researchInProgress.service';
import { Info } from 'lucide-react';
import { useToast } from '../../../hooks/useToast';

interface ResearchInProgressContentProps {
    researchId?: string;
}

/**
 * Componente principal para el monitoreo de investigación en curso
 * Muestra métricas, participantes y permite generar nuevos participantes
 * @param researchId - ID de la investigación (opcional, se obtiene de params si no se proporciona)
 */
export function ResearchInProgressContent({ researchId: propResearchId }: ResearchInProgressContentProps = {} as ResearchInProgressContentProps) {
    const params = useParams<{ id: string }>();
    const researchId = propResearchId || params.id;
    const toast = useToast();
    const toastRef = useRef(toast);
    const token = useAuthStore(state => state.token);

    toastRef.current = toast;

    // SSE monitoring (kept for future use, data loaded via REST for now)
    useMonitoringReceiver(researchId || null, token || null);

    const [status, setStatus] = useState<ResearchStatus>({
        status: { value: '--', description: 'Cargando...', icon: 'chart-line' },
        participants: { value: '--', description: 'Cargando...', icon: 'users' },
        completionRate: { value: '--', description: 'Cargando...', icon: 'check-circle' },
        averageTime: { value: '--', description: 'Cargando...', icon: 'clock' }
    });
    const [participants, setParticipants] = useState<Participant[]>([]);
    const [researchConfig, setResearchConfig] = useState<ResearchConfiguration | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showInfoModal, setShowInfoModal] = useState(false);

    const loadData = async (): Promise<void> => {
        if (!researchId) return;

        setIsLoading(true);
        setError(null);

        try {
            const [metricsResponse, participantsResponse, configResponse] = await Promise.all([
                researchInProgressService.getOverviewMetrics(researchId),
                researchInProgressService.getParticipantsWithStatus(researchId),
                researchInProgressService.getResearchConfiguration(researchId)
            ]);

            if ((metricsResponse?.success && metricsResponse?.data) || (metricsResponse?.status === 200 && metricsResponse?.data)) {
                const metricsData = metricsResponse.data as ResearchStatus;
                if (metricsData.status && metricsData.participants && metricsData.completionRate && metricsData.averageTime) {
                    setStatus(metricsData);
                }
            }

            if ((participantsResponse.success && participantsResponse.data) || (participantsResponse.status === 200 && participantsResponse.data)) {
                let participantsData: Participant[];

                if (Array.isArray(participantsResponse.data)) {
                    participantsData = participantsResponse.data;
                } else if (participantsResponse.data && typeof participantsResponse.data === 'object' && 'data' in participantsResponse.data && Array.isArray(participantsResponse.data.data)) {
                    participantsData = participantsResponse.data.data;
                } else {
                    participantsData = [];
                }

                setParticipants(participantsData);
            }

            if ((configResponse?.success && configResponse?.data) || (configResponse?.status === 200 && configResponse?.data)) {
                const config = configResponse.data;
                setResearchConfig({
                    allowMobileDevices: config.linkConfig?.allowMobileDevices ?? true,
                    trackLocation: config.linkConfig?.trackLocation ?? true
                });
            }
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Error al cargar los datos de la investigación';
            setError(errorMessage);
            toastRef.current.error(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [researchId]);

    const handleParticipantDeleted = (participantId: string): void => {
        setParticipants(prev => prev.filter(p => p.id !== participantId));

        setStatus(prev => ({
            ...prev,
            participants: {
                value: (participants.length - 1).toString(),
                description: `${Math.max(0, participants.filter(p => p.status === 'in_progress').length - 1)} activos`,
                icon: 'users'
            }
        }));
    };

    const handleOpenPublicTests = (): void => {
        if (researchId) {
            setShowInfoModal(true);
        }
    };

    if (error) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="text-center">
                    <h2 className="text-xl font-semibold text-red-600 mb-2">Error</h2>
                    <p className="text-gray-600">{error}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex justify-end mb-6">
                <Button onClick={handleOpenPublicTests} variant="outline">
                    <Info className="w-4 h-4 mr-2" />
                    Acceso a Tests
                </Button>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
                <div className="p-3 rounded-lg border border-gray-200 bg-white">
                    <p className="text-xs text-gray-500 mb-1">Estado</p>
                    <p className="text-sm font-semibold text-gray-900">{status.status?.value || '--'}</p>
                    <p className="text-[11px] text-gray-400">{status.status?.description || 'Cargando...'}</p>
                </div>
                <div className="p-3 rounded-lg border border-gray-200 bg-white">
                    <p className="text-xs text-gray-500 mb-1">Módulos</p>
                    <p className="text-sm font-semibold text-gray-900">{status.totalModules ?? '--'}</p>
                    <p className="text-[11px] text-gray-400">configurados</p>
                </div>
                <div className="p-3 rounded-lg border border-gray-200 bg-white">
                    <p className="text-xs text-gray-500 mb-1">Participantes</p>
                    <p className="text-sm font-semibold text-gray-900">{status.participants?.value || '--'}</p>
                    <p className="text-[11px] text-gray-400">{status.participants?.description || 'Cargando...'}</p>
                </div>
                <div className="p-3 rounded-lg border border-gray-200 bg-white">
                    <p className="text-xs text-gray-500 mb-1">Tasa de completitud</p>
                    <p className="text-sm font-semibold text-gray-900">{status.completionRate?.value || '--'}</p>
                    <p className="text-[11px] text-gray-400">{status.completionRate?.description || 'Cargando...'}</p>
                </div>
                <div className="p-3 rounded-lg border border-gray-200 bg-white">
                    <p className="text-xs text-gray-500 mb-1">Tiempo promedio</p>
                    <p className="text-sm font-semibold text-gray-900">{status.averageTime?.value || '--'}</p>
                    <p className="text-[11px] text-gray-400">{status.averageTime?.description || 'Cargando...'}</p>
                </div>
            </div>

            <ParticipantsTable
                participants={participants}
                onViewDetails={() => { }}
                researchId={researchId || ''}
                onParticipantDeleted={handleParticipantDeleted}
                isLoading={isLoading}
                researchConfig={researchConfig}
            />

            {showInfoModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                        <div className="flex items-center gap-3 mb-4">
                            <Info className="h-6 w-6 text-blue-500" />
                            <h3 className="text-lg font-semibold text-gray-900">
                                Acceso a Tests por Participante
                            </h3>
                        </div>

                        <div className="space-y-3 mb-6">
                            <p className="text-gray-600">
                                Cada participante tiene una URL única para acceder a los tests sin necesidad de login.
                            </p>

                            <div className="bg-blue-50 p-3 rounded-lg">
                                <p className="text-sm text-blue-800 font-medium">¿Cómo acceder?</p>
                                <ul className="text-sm text-blue-700 mt-1 space-y-1">
                                    <li>• Usa la pestaña "Generar Participantes" para crear participantes</li>
                                    <li>• En la tabla de participantes, usa los botones de "Acceso directo"</li>
                                    <li>• Cada participante tiene su propia URL con su ID incluido</li>
                                </ul>
                            </div>

                            <div className="bg-gray-50 p-3 rounded-lg">
                                <p className="text-xs text-gray-600">
                                    <strong>Formato de URL:</strong><br />
                                    <code className="text-xs">
                                        {typeof window !== 'undefined' ? window.location.origin : ''}?researchId=XXX&userId=YYY
                                    </code>
                                </p>
                            </div>
                        </div>

                        <div className="flex justify-end">
                            <Button
                                onClick={() => setShowInfoModal(false)}
                            >
                                Entendido
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

