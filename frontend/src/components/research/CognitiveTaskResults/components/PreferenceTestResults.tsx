'use client';

import { useState } from 'react';

export interface PreferenceTestData {
  question: string;
  description?: string;
  options: {
    id: string;
    name: string;
    image?: string;
    selected: number;
    percentage: number;
    color?: string;
  }[];
  totalSelections: number;
  totalParticipants: number;
  responseTime?: string;
  responseTimes?: number[]; // 🎯 NUEVO: Array de tiempos de respuesta
  preferenceAnalysis?: string;
  mostPreferred?: string;
  leastPreferred?: string;
  allImages?: Array<{
    url: string;
    name: string;
    id: string;
  }>; // 🎯 NUEVO: Todas las imágenes que se presentaron al usuario
}

interface PreferenceTestResultsProps {
  data: PreferenceTestData;
}

export function PreferenceTestResults({ data }: PreferenceTestResultsProps) {
  const [expandedStep, setExpandedStep] = useState<string | null>(null);

  // Verificar que los datos sean válidos
  // Aceptar tanto 'options' como 'preferences' para compatibilidad
  const validOptions = data?.options || (data as any)?.preferences || [];
  
  if (!data || !Array.isArray(validOptions) || validOptions.length === 0) {
    return (
      <div className="p-6 text-center">
        <p className="text-gray-500">No hay datos de preferencias disponibles.</p>
        <p className="text-xs mt-2">data: {JSON.stringify(data)}</p>
      </div>
    );
  }

  const {
    question,
    description,
    totalSelections,
    totalParticipants,
    responseTime,
  } = data;
  
  // Usar validOptions procesadas arriba
  const options = validOptions;

  // Función para extraer el nombre de la opción de manera segura
  const extractOptionName = (option: any): string => {
    if (typeof option.name === 'string') {
      return option.name;
    } else if (typeof option.name === 'object' && option.name !== null) {
      return option.name.name ||
        option.name.text ||
        option.name.label ||
        option.name.value ||
        option.name.title ||
        JSON.stringify(option.name);
    } else {
      return String(option.name || 'Opción sin nombre');
    }
  };

  // Calcular tiempo promedio por step (usar tiempo específico de cada opción)
  const calculateStepTime = (option: any, selected: number, total: number): string => {
    if (selected === 0) return 'N/A';

    // Usar el tiempo específico de la opción si está disponible
    if (option.responseTime) {
      return option.responseTime;
    }

    // Fallback: calcular tiempo basado en selecciones (simulado)
    const baseTime = 30; // tiempo base en segundos
    const timePerSelection = baseTime / total;
    const stepTime = Math.round(selected * timePerSelection);
    return stepTime > 0 ? `${stepTime}s` : 'N/A';
  };

  // Función para alternar la expansión de un step
  const toggleStepExpansion = (stepId: string) => {
    setExpandedStep(expandedStep === stepId ? null : stepId);
  };

  return (
    <div className="p-6">
      <div className="space-y-4">
        {options.map((option, index) => {
          const stepNumber = index + 1;
          const stepTime = calculateStepTime(option, option.selected, totalSelections);
          const isExpanded = expandedStep === option.id;

          return (
            <div key={option.id || `step-${index}`} className="bg-white border border-gray-200 rounded-lg p-4">
              {/* Step Header */}
              <div className="flex items-center space-x-4">
                {/* Thumbnail */}
                <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 border flex-shrink-0">
                  {option.image ? (
                    <img
                      src={option.image}
                      alt={extractOptionName(option)}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                      <span className="text-gray-600 font-semibold text-xs">
                        {extractOptionName(option).charAt(0)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Step Label */}
                <div className="flex-1">
                  <h4 className="text-md font-medium text-gray-900">Step {stepNumber}</h4>
                </div>

                {/* Progress Bar */}
                <div className="flex-1">
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                      style={{ width: `${option.percentage}%` }}
                    ></div>
                  </div>
                </div>

                {/* Metrics */}
                <div className="flex items-center space-x-4 text-sm">
                  <span className="text-gray-600">{stepTime}</span>
                  <span className="text-blue-600 font-medium">{option.percentage}%</span>
                  <div className="flex items-center space-x-1">
                    <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <span className="text-gray-600">{option.selected}</span>
                  </div>
                </div>

                {/* Show Details Button */}
                <button
                  onClick={() => toggleStepExpansion(option.id)}
                  className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors duration-200"
                >
                  {isExpanded ? 'Hide details' : 'Show details'}
                </button>
              </div>

              {/* Expanded Details */}
              {isExpanded && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Image Preview */}
                    <div>
                      <h5 className="text-sm font-medium text-gray-700 mb-2">Vista Previa</h5>
                      <div className="w-full h-48 rounded-lg overflow-hidden bg-gray-100 border">
                        {option.image ? (
                          <img
                            src={option.image}
                            alt={extractOptionName(option)}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                            <span className="text-gray-600 font-semibold text-lg">
                              {extractOptionName(option).charAt(0)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Statistics */}
                    <div>
                      <h5 className="text-sm font-medium text-gray-700 mb-2">Estadísticas</h5>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Selecciones:</span>
                          <span className="text-sm font-medium text-gray-900">{option.selected}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Porcentaje:</span>
                          <span className="text-sm font-medium text-gray-900">{option.percentage}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Tiempo promedio:</span>
                          <span className="text-sm font-medium text-gray-900">{stepTime}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Nombre:</span>
                          <span className="text-sm font-medium text-gray-900">{extractOptionName(option)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Summary Stats */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h4 className="text-md font-semibold text-gray-800 mb-3">Resumen General</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{totalSelections}</div>
            <div className="text-sm text-gray-600">Total Selecciones</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{totalParticipants}</div>
            <div className="text-sm text-gray-600">Participantes</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">{options.length}</div>
            <div className="text-sm text-gray-600">Opciones</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">{responseTime || 'N/A'}</div>
            <div className="text-sm text-gray-600">Tiempo Total</div>
          </div>
        </div>
        
        {/* Imágenes presentadas al usuario */}
        {(data.allImages && data.allImages.length > 0) && (
          <div className="mt-6 pt-4 border-t border-gray-300">
            <h5 className="text-sm font-semibold text-gray-700 mb-3">
              Imágenes presentadas al usuario ({data.allImages.length})
            </h5>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {data.allImages.map((img, index) => (
                <div
                  key={img.id || index}
                  className="relative group cursor-pointer"
                  title={img.name}
                >
                  <div className="aspect-square rounded-lg overflow-hidden bg-gray-100 border-2 border-gray-200 hover:border-blue-400 transition-colors">
                    <img
                      src={img.url}
                      alt={img.name || `Opción ${index + 1}`}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        const parent = target.parentElement;
                        if (parent) {
                          parent.innerHTML = `
                            <div class="w-full h-full flex items-center justify-center bg-gray-200">
                              <span class="text-gray-500 text-xs">Sin imagen</span>
                            </div>
                          `;
                        }
                      }}
                    />
                  </div>
                  <div className="mt-1 text-xs text-gray-600 text-center truncate">
                    {img.name || `Opción ${index + 1}`}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
