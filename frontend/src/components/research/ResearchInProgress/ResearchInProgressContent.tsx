'use client';

import { ParticipantGenerator } from '@/components/research/participants/ParticipantGenerator';
import { ParticipantsTable } from '@/components/research/participants/ParticipantsTable';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { useMonitoringReceiver } from '@/hooks/useMonitoringReceiver';
import { researchInProgressApi } from '@/api/domains/research-in-progress';
import { useAuth } from '@/providers/AuthProvider';
import { Activity, CheckCircle, Clock, Info, Users } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

interface ResearchStatus {
  status: {
    value: string;
    description: string;
    icon: string;
  };
  participants: {
    value: string;
    description: string;
    icon: string;
  };
  completionRate: {
    value: string;
    description: string;
    icon: string;
  };
  averageTime: {
    value: string;
    description: string;
    icon: string;
  };
}

interface Participant {
  id: string;
  name: string;
  email: string;
  status: string;
  progress: number;
  duration: string;
  lastActivity: string;
}

interface ResearchConfiguration {
  allowMobileDevices: boolean;
  trackLocation: boolean;
}

interface ResearchInProgressContentProps {
  researchId?: string;
}

export function ResearchInProgressContent({ researchId: propResearchId }: ResearchInProgressContentProps = {} as ResearchInProgressContentProps) {
  const searchParams = useSearchParams();
  const researchId = propResearchId || searchParams?.get('research');
  const { token, authLoading } = useAuth();

  const { isConnected, monitoringData, reconnect } = useMonitoringReceiver(researchId || '');

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

  useEffect(() => {
    const loadData = async () => {
      if (!researchId || authLoading || !token) return;

      setIsLoading(true);
      setError(null);

      try {
        const [metricsResponse, participantsResponse, configResponse] = await Promise.all([
          researchInProgressApi.getOverviewMetrics(researchId),
          researchInProgressApi.getParticipantsWithStatus(researchId),
          researchInProgressApi.getResearchConfiguration(researchId)
        ]);

        // Handle metrics
        if ((metricsResponse?.success && metricsResponse?.data) || (metricsResponse?.status === 200 && metricsResponse?.data)) {
          const metricsData = metricsResponse.data as ResearchStatus;
          if (metricsData.status && metricsData.participants && metricsData.completionRate && metricsData.averageTime) {
            setStatus(metricsData);
          }
        }

        // Handle participants
        if ((participantsResponse.success && participantsResponse.data) || (participantsResponse.status === 200 && participantsResponse.data)) {
          let participantsData;
          
          // If data is directly an array
          if (Array.isArray(participantsResponse.data)) {
            participantsData = participantsResponse.data;
          }
          // If data has nested data property
          else if (participantsResponse.data.data && Array.isArray(participantsResponse.data.data)) {
            participantsData = participantsResponse.data.data;
          }
          // Fallback
          else {
            participantsData = [];
          }
          
          setParticipants(participantsData);
        }

        // Handle research configuration
        if ((configResponse?.success && configResponse?.data) || (configResponse?.status === 200 && configResponse?.data)) {
          const config = configResponse.data;
          setResearchConfig({
            allowMobileDevices: config.linkConfig?.allowMobileDevices ?? true,
            trackLocation: config.linkConfig?.trackLocation ?? true
          });
        }
      } catch (error: any) {
        setError(error.message || 'Error al cargar los datos de la investigación');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [researchId, token, authLoading]);

  const handleParticipantDeleted = (participantId: string) => {
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

  const handleOpenPublicTests = () => {
    if (researchId) {
      setShowInfoModal(true);
    }
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Cargando...</span>
      </div>
    );
  }

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
      <div className="mb-6 p-4 rounded-lg border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className="text-sm font-medium">
              {isConnected ? 'Conectado en tiempo real' : 'Desconectado'}
            </span>
          </div>
          <div className="text-xs text-gray-500">
            {monitoringData?.participants?.length || 0} participantes monitoreados
          </div>
        </div>
        {!isConnected && (
          <button
            onClick={reconnect}
            className="mt-2 text-sm text-blue-600 hover:text-blue-800 underline"
          >
            Reconectar
          </button>
        )}
      </div>

      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Investigación en Curso</h1>
          <p className="text-gray-600 mt-2">
            Monitoreo en tiempo real de participantes y progreso
          </p>
        </div>
        <Button onClick={handleOpenPublicTests} variant="outline">
          <Info className="w-4 h-4 mr-2" />
          Acceso a Tests
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Estado</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{status.status?.value || '--'}</div>
            <p className="text-xs text-muted-foreground">{status.status?.description || 'Cargando...'}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Participantes</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{status.participants?.value || '--'}</div>
            <p className="text-xs text-muted-foreground">{status.participants?.description || 'Cargando...'}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tasa de completitud</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{status.completionRate?.value || '--'}</div>
            <p className="text-xs text-muted-foreground">{status.completionRate?.description || 'Cargando...'}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tiempo promedio</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{status.averageTime?.value || '--'}</div>
            <p className="text-xs text-muted-foreground">{status.averageTime?.description || 'Cargando...'}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="participants" className="space-y-4">
        <TabsList>
          <TabsTrigger value="participants">Participantes</TabsTrigger>
          <TabsTrigger value="generator">Generar Participantes</TabsTrigger>
        </TabsList>

        <TabsContent value="participants" className="space-y-4">
          <ParticipantsTable
            participants={participants}
            onViewDetails={() => { }}
            researchId={researchId || ''}
            onParticipantDeleted={handleParticipantDeleted}
            isLoading={isLoading}
            researchConfig={researchConfig}
          />
        </TabsContent>

        <TabsContent value="generator" className="space-y-4">
          <ParticipantGenerator
            researchId={researchId || ''}
            onParticipantsGenerated={() => {
              // Actualizar la lista de participantes si es necesario
            }}
          />
        </TabsContent>

      </Tabs>

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
                    https://d35071761848hm.cloudfront.net?researchId=XXX&userId=YYY
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

