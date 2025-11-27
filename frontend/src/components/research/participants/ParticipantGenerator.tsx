'use client';

import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { apiClient } from '@/api/config';
import { getPublicTestsUrl } from '@/api/config';
import { Copy, ExternalLink, Plus, Users } from 'lucide-react';
import { useState } from 'react';

interface GeneratedParticipant {
  id: string;
  name: string;
  email: string;
}

interface ParticipantGeneratorProps {
  researchId: string;
  onParticipantsGenerated?: (participants: GeneratedParticipant[]) => void;
}

export function ParticipantGenerator({ researchId, onParticipantsGenerated }: ParticipantGeneratorProps) {
  const [count, setCount] = useState(5);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedParticipants, setGeneratedParticipants] = useState<GeneratedParticipant[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!researchId || count < 1 || count > 15) return;

    setIsGenerating(true);
    setError(null);

    try {
      // Configurar token de autenticación
      

      const response = await apiClient.post<{
        data: {
          researchId: string;
          participants: GeneratedParticipant[];
          totalGenerated: number;
        };
        status: number;
      }>('participants', 'generate', {
        researchId,
        count
      });

      if (response.data) {
        setGeneratedParticipants(response.data.participants);
        onParticipantsGenerated?.(response.data.participants);
      }
    } catch (err: any) {
      setError(err.message || 'Error al generar participantes');
    } finally {
      setIsGenerating(false);
    }
  };

  const copyUrl = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
    } catch (err) {
    }
  };

  const openPublicTests = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="space-y-6">
      {/* Generador de participantes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Generar Participantes de Prueba
          </CardTitle>
          <CardDescription>
            Crea participantes dummy con URLs únicas para acceder a public-tests
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-4">
            <div className="flex-1 max-w-xs">
              <Label htmlFor="count">Número de participantes</Label>
              <Input
                id="count"
                type="number"
                min="1"
                max="15"
                value={count}
                onChange={(e) => setCount(parseInt(e.target.value) || 1)}
                className="mt-1"
              />
            </div>
            <Button
              onClick={handleGenerate}
              disabled={isGenerating || !researchId}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              {isGenerating ? 'Generando...' : 'Generar Participantes'}
            </Button>
          </div>

          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Lista de participantes generados */}
      {generatedParticipants.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Participantes Generados ({generatedParticipants.length})</CardTitle>
            <CardDescription>
              Haz clic en "Ir a Public-Tests" para abrir la prueba con cada participante
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {generatedParticipants.map((participant, index) => (
                <div
                  key={participant.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-sm font-medium text-blue-600">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{participant.name}</p>
                        <p className="text-sm text-gray-600">{participant.email}</p>
                        <p className="text-xs text-gray-500 font-mono">ID: {participant.id}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const url = getPublicTestsUrl(researchId, participant.id);
                        copyUrl(url);
                      }}
                      className="flex items-center gap-2"
                    >
                      <Copy className="h-4 w-4" />
                      Copiar URL
                    </Button>
                    <Button
                      onClick={() => {
                        const url = getPublicTestsUrl(researchId, participant.id);
                        openPublicTests(url);
                      }}
                      className="flex items-center gap-2"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Ir a Public-Tests
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}