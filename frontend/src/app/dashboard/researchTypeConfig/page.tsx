'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useGlobalResearchData } from '@/hooks/useGlobalResearchData';
import { Settings, Save, Eye, Brain, Users, BarChart3 } from 'lucide-react';

export default function ResearchTypeConfigPage() {
  const searchParams = useSearchParams();
  const researchId = searchParams?.get('research') || '';
  const { researchData, isLoading } = useGlobalResearchData(researchId);
  
  const [config, setConfig] = useState({
    technique: '',
    eyeTracking: {
      enabled: false,
      parameters: {
        saveResponseTimes: false,
        saveUserJourney: false,
        showProgressBar: true
      }
    },
    smartVOC: {
      enabled: false,
      questions: []
    },
    cognitiveTasks: {
      enabled: false,
      tasks: []
    },
    demographics: {
      enabled: false,
      questions: []
    }
  });

  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (researchData) {
      setConfig({
        technique: researchData.technique || '',
        eyeTracking: {
          enabled: (researchData as any).eyeTracking?.enabled || false,
          parameters: {
            saveResponseTimes: (researchData as any).eyeTracking?.parameterOptions?.saveResponseTimes || false,
            saveUserJourney: (researchData as any).eyeTracking?.parameterOptions?.saveUserJourney || false,
            showProgressBar: (researchData as any).eyeTracking?.linkConfig?.showProgressBar ?? true
          }
        },
        smartVOC: {
          enabled: (researchData as any).smartVOC?.enabled || false,
          questions: (researchData as any).smartVOC?.questions || []
        },
        cognitiveTasks: {
          enabled: (researchData as any).cognitiveTasks?.enabled || false,
          tasks: (researchData as any).cognitiveTasks?.tasks || []
        },
        demographics: {
          enabled: (researchData as any).demographics?.enabled || false,
          questions: (researchData as any).demographics?.questions || []
        }
      });
    }
  }, [researchData]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // TODO: Implementar guardado de configuración
      console.log('Guardando configuración:', config);
      // Aquí iría la llamada a la API para guardar la configuración
    } catch (error) {
      console.error('Error guardando configuración:', error);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-gray-600">Cargando configuración...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Configuración de Investigación</h1>
          <p className="text-gray-600 mt-1">
            {researchData?.name || 'Sin nombre'} - {researchData?.technique || 'Sin técnica'}
          </p>
        </div>
        <Button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2"
        >
          <Save className="w-4 h-4" />
          {isSaving ? 'Guardando...' : 'Guardar Configuración'}
        </Button>
      </div>

      {/* Configuración de Eye Tracking */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <Eye className="w-5 h-5 text-blue-600" />
          <h2 className="text-lg font-semibold text-gray-900">Eye Tracking</h2>
        </div>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-gray-900">Habilitar Eye Tracking</h3>
              <p className="text-sm text-gray-600">Activar seguimiento ocular para esta investigación</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={config.eyeTracking.enabled}
                onChange={(e) => setConfig(prev => ({
                  ...prev,
                  eyeTracking: { ...prev.eyeTracking, enabled: e.target.checked }
                }))}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          {config.eyeTracking.enabled && (
            <div className="pl-4 border-l-2 border-blue-200 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-gray-900">Guardar tiempos de respuesta</h4>
                  <p className="text-sm text-gray-600">Registrar cuánto tiempo tarda cada respuesta</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.eyeTracking.parameters.saveResponseTimes}
                    onChange={(e) => setConfig(prev => ({
                      ...prev,
                      eyeTracking: {
                        ...prev.eyeTracking,
                        parameters: {
                          ...prev.eyeTracking.parameters,
                          saveResponseTimes: e.target.checked
                        }
                      }
                    }))}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-gray-900">Guardar journey del usuario</h4>
                  <p className="text-sm text-gray-600">Registrar la navegación y comportamiento del usuario</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.eyeTracking.parameters.saveUserJourney}
                    onChange={(e) => setConfig(prev => ({
                      ...prev,
                      eyeTracking: {
                        ...prev.eyeTracking,
                        parameters: {
                          ...prev.eyeTracking.parameters,
                          saveUserJourney: e.target.checked
                        }
                      }
                    }))}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-gray-900">Mostrar barra de progreso</h4>
                  <p className="text-sm text-gray-600">Mostrar el progreso del test al usuario</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.eyeTracking.parameters.showProgressBar}
                    onChange={(e) => setConfig(prev => ({
                      ...prev,
                      eyeTracking: {
                        ...prev.eyeTracking,
                        parameters: {
                          ...prev.eyeTracking.parameters,
                          showProgressBar: e.target.checked
                        }
                      }
                    }))}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Configuración de Smart VOC */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <BarChart3 className="w-5 h-5 text-green-600" />
          <h2 className="text-lg font-semibold text-gray-900">Smart VOC</h2>
        </div>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-gray-900">Habilitar Smart VOC</h3>
              <p className="text-sm text-gray-600">Activar preguntas de Voice of Customer</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={config.smartVOC.enabled}
                onChange={(e) => setConfig(prev => ({
                  ...prev,
                  smartVOC: { ...prev.smartVOC, enabled: e.target.checked }
                }))}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
            </label>
          </div>

          {config.smartVOC.enabled && (
            <div className="pl-4 border-l-2 border-green-200">
              <p className="text-sm text-gray-600">
                {config.smartVOC.questions.length} preguntas configuradas
              </p>
              <Button variant="outline" size="sm" className="mt-2">
                Configurar Preguntas
              </Button>
            </div>
          )}
        </div>
      </Card>

      {/* Configuración de Tareas Cognitivas */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <Brain className="w-5 h-5 text-purple-600" />
          <h2 className="text-lg font-semibold text-gray-900">Tareas Cognitivas</h2>
        </div>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-gray-900">Habilitar Tareas Cognitivas</h3>
              <p className="text-sm text-gray-600">Activar ejercicios de evaluación cognitiva</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={config.cognitiveTasks.enabled}
                onChange={(e) => setConfig(prev => ({
                  ...prev,
                  cognitiveTasks: { ...prev.cognitiveTasks, enabled: e.target.checked }
                }))}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
            </label>
          </div>

          {config.cognitiveTasks.enabled && (
            <div className="pl-4 border-l-2 border-purple-200">
              <p className="text-sm text-gray-600">
                {config.cognitiveTasks.tasks.length} tareas configuradas
              </p>
              <Button variant="outline" size="sm" className="mt-2">
                Configurar Tareas
              </Button>
            </div>
          )}
        </div>
      </Card>

      {/* Configuración de Demográficos */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <Users className="w-5 h-5 text-orange-600" />
          <h2 className="text-lg font-semibold text-gray-900">Datos Demográficos</h2>
        </div>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-gray-900">Habilitar Demográficos</h3>
              <p className="text-sm text-gray-600">Recopilar información demográfica de los participantes</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={config.demographics.enabled}
                onChange={(e) => setConfig(prev => ({
                  ...prev,
                  demographics: { ...prev.demographics, enabled: e.target.checked }
                }))}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600"></div>
            </label>
          </div>

          {config.demographics.enabled && (
            <div className="pl-4 border-l-2 border-orange-200">
              <p className="text-sm text-gray-600">
                {config.demographics.questions.length} preguntas demográficas configuradas
              </p>
              <Button variant="outline" size="sm" className="mt-2">
                Configurar Preguntas Demográficas
              </Button>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
