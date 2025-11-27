'use client';

import React, { useState, useEffect } from 'react';
import { Settings, Loader2 } from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
import { DYNAMIC_API_ENDPOINTS } from '@/api/dynamic-endpoints';
import { FormTextarea } from '@/components/common/FormTextarea';

interface EducationalContent {
  id: string;
  contentType: 'smart_voc' | 'cognitive_task';
  title: string;
  generalDescription: string;
  typeExplanation: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Página de Configuraciones del Dashboard
 */
export default function SettingsPage() {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [smartVocDescription, setSmartVocDescription] = useState('');
  const [smartVocExplanation, setSmartVocExplanation] = useState('');
  const [cognitiveDescription, setCognitiveDescription] = useState('');
  const [cognitiveExplanation, setCognitiveExplanation] = useState('');

  useEffect(() => {
    loadEducationalContent();
  }, []);

  const loadEducationalContent = async () => {
    try {
      setLoading(true);
      
      if (!token) {
        setError('No se pudo obtener el token de autenticación');
        return;
      }

      const response = await fetch(`${DYNAMIC_API_ENDPOINTS.http}/educational-content`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        const contents = data.data;
        
        const smartVoc = contents.find((c: EducationalContent) => c.contentType === 'smart_voc');
        const cognitive = contents.find((c: EducationalContent) => c.contentType === 'cognitive_task');
        
        if (smartVoc) {
          setSmartVocDescription(smartVoc.generalDescription);
          setSmartVocExplanation(smartVoc.typeExplanation);
        }
        
        if (cognitive) {
          setCognitiveDescription(cognitive.generalDescription);
          setCognitiveExplanation(cognitive.typeExplanation);
        }
      } else {
        setError('Error al cargar el contenido educativo');
      }
    } catch (error) {
      console.error('Error loading educational content:', error);
      setError('Error al cargar el contenido educativo');
    } finally {
      setLoading(false);
    }
  };

  const saveEducationalContent = async () => {
    try {
      setSaving(true);
      setError(null);
      
      if (!token) {
        setError('No se pudo obtener el token de autenticación');
        return;
      }

      await fetch(`${DYNAMIC_API_ENDPOINTS.http}/educational-content/smart_voc`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          generalDescription: smartVocDescription,
          typeExplanation: smartVocExplanation,
        }),
      });

      await fetch(`${DYNAMIC_API_ENDPOINTS.http}/educational-content/cognitive_task`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          generalDescription: cognitiveDescription,
          typeExplanation: cognitiveExplanation,
        }),
      });

      await loadEducationalContent();
      
    } catch (error) {
      console.error('Error saving educational content:', error);
      setError('Error al guardar el contenido educativo');
    } finally {
      setSaving(false);
    }
  };
  const [activeSection, setActiveSection] = useState('smartvoc');

  const sections = [
    {
      id: 'smartvoc',
      title: 'SmartVOC',
      description: 'Configuración de contenido educativo para SmartVOC'
    },
    {
      id: 'cognitive',
      title: 'Cognitive Task',
      description: 'Configuración de contenido educativo para Cognitive Task'
    }
  ];

  return (
    <div className="flex h-full max-h-screen">
      <div className="w-80 bg-white rounded-xl shadow-sm border border-gray-100 p-6 mr-6 flex-shrink-0">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Settings className="w-8 h-8 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">Configuraciones</h1>
          </div>
          <p className="text-sm text-gray-600">
            Gestiona las configuraciones generales del sistema
          </p>
        </div>

        <nav className="space-y-3">
          {sections.map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={`w-full text-left p-4 rounded-xl transition-all duration-200 hover:scale-[1.02] ${
                activeSection === section.id
                  ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 text-blue-700 shadow-md'
                  : 'bg-gray-50 border-2 border-transparent text-gray-700 hover:bg-gray-100 hover:shadow-sm'
              }`}
            >
              <div>
                <div className="font-semibold text-lg">{section.title}</div>
                <div className="text-sm text-gray-500 mt-1">{section.description}</div>
              </div>
            </button>
          ))}
        </nav>
      </div>

      {/* Contenido principal - Estilo Vambeai */}
      <div className="flex-1 min-h-0">
        <div className="p-6 h-full overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              <span className="ml-3 text-gray-600">Cargando contenido educativo...</span>
            </div>
          ) : (
            <div className="max-w-4xl">
              {activeSection === 'smartvoc' && (
                <div className="space-y-8">
                  <div>
                    <h2 className="text-3xl font-bold text-gray-900 mb-3">SmartVOC - Contenido Educativo</h2>
                    <p className="text-gray-600 text-lg">
                      Configura el contenido educativo que aparece en las columnas laterales para explicar qué es SmartVOC y para qué sirve cada pregunta
                    </p>
                  </div>

                  <div className="space-y-8">
                    <div>
                      <label className="block text-lg font-semibold text-gray-900 mb-4">
                        Descripción General de SmartVOC
                      </label>
                      <FormTextarea
                        label=""
                        rows={3}
                        value={smartVocDescription}
                        onChange={(value) => setSmartVocDescription(value)}
                        placeholder="Explica qué es SmartVOC y para qué sirve"
                        className="w-full resize-none"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-lg font-semibold text-gray-900 mb-4">
                        Explicación de Tipos de Preguntas
                      </label>
                      <FormTextarea
                        label=""
                        rows={5}
                        value={smartVocExplanation}
                        onChange={(value) => setSmartVocExplanation(value)}
                        placeholder="Describe para qué sirve cada tipo de pregunta SmartVOC"
                        className="w-full resize-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {activeSection === 'cognitive' && (
                <div className="space-y-8">
                  <div className="mb-8">
                    <h2 className="text-3xl font-bold text-gray-900 mb-3">Cognitive Task - Contenido Educativo</h2>
                    <p className="text-gray-600 text-lg">
                      Configura el contenido educativo que aparece en las columnas laterales para explicar qué son las Tareas Cognitivas y para qué sirven
                    </p>
                  </div>

                  <div className="space-y-8">
                    <div>
                      <label className="block text-lg font-semibold text-gray-900 mb-4">
                        Descripción General de Cognitive Task
                      </label>
                      <FormTextarea
                        label=""
                        rows={15}
                        value={cognitiveDescription}
                        onChange={(value) => setCognitiveDescription(value)}
                        placeholder="Explica qué son las Tareas Cognitivas y para qué sirven"
                        className="w-full resize-none"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-lg font-semibold text-gray-900 mb-4">
                        Explicación de Tipos de Tareas
                      </label>
                      <FormTextarea
                        label=""
                        rows={20}
                        value={cognitiveExplanation}
                        onChange={(value) => setCognitiveExplanation(value)}
                        placeholder="Describe los diferentes tipos de tareas cognitivas y su propósito"
                        className="w-full resize-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Botón de Guardar - Estilo Vambeai */}
              <div className="pt-10 border-t border-gray-200">
                <button 
                  onClick={saveEducationalContent}
                  disabled={saving}
                  className="inline-flex items-center px-8 py-4 border border-transparent text-lg font-semibold rounded-xl text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transition-all duration-200"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin mr-3" />
                      Guardando...
                    </>
                  ) : (
                    'Guardar Contenido Educativo'
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}