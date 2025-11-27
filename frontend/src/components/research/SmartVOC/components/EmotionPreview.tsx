import React, { useState } from 'react';

// TODO: Implementar configuración de emociones
const EMOTION_SELECTOR_CONFIGS = {
  quadrants: {
    name: 'Cuadrantes Emocionales',
    description: 'Selecciona el cuadrante emocional que mejor represente tu estado',
    quadrants: [
      { name: 'Alto Placer', description: 'Emociones positivas intensas', color: '#4ade80', emotions: ['Felicidad', 'Alegría', 'Éxtasis'] },
      { name: 'Bajo Placer', description: 'Emociones negativas intensas', color: '#ef4444', emotions: ['Tristeza', 'Ira', 'Miedo'] },
      { name: 'Alto Dominio', description: 'Sentimiento de control', color: '#3b82f6', emotions: ['Confianza', 'Poder', 'Control'] },
      { name: 'Bajo Dominio', description: 'Sentimiento de impotencia', color: '#8b5cf6', emotions: ['Vergüenza', 'Culpa', 'Impaciencia'] }
    ]
  }
};
import { EmotionHierarchySelector } from './EmotionHierarchySelector';
// 🎯 DetailedEmotionSelector eliminado - usar componente consolidado en public-tests

interface EmotionPreviewProps {
  type: string;
  className?: string;
}

/**
 * Componente de vista previa para mostrar diferentes tipos de selectores de emociones
 */
export const EmotionPreview: React.FC<EmotionPreviewProps> = ({
  type,
  className = ''
}) => {
  const [selectedCluster, setSelectedCluster] = useState<string>('');

  const handleClusterSelect = (clusterId: string) => {
    setSelectedCluster(clusterId);
  };

  const renderPreview = () => {
    switch (type) {
      case 'hierarchy':
        return (
          <div className="p-6 bg-white rounded-lg border border-gray-200">
            <EmotionHierarchySelector
              selectedCluster={selectedCluster}
              onClusterSelect={handleClusterSelect}
            />
          </div>
        );

      case 'detailed':
        return (
          <div className="p-6 bg-white rounded-lg border border-gray-200">
            <div className="text-center text-gray-500 py-8">
              <p>DetailedEmotionSelector consolidado en public-tests</p>
              <p className="text-sm mt-2">Usar componente consolidado</p>
            </div>
          </div>
        );



      case 'quadrants':
        return (
          <div className="p-6 bg-white rounded-lg border border-gray-200">
            <div className="text-center mb-4">
              <h3 className="text-lg font-semibold text-neutral-900 mb-2">
                4 Estadios Emocionales
              </h3>
              <p className="text-sm text-neutral-600">
                Selecciona el cuadrante que mejor describe tu estado emocional
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
              {EMOTION_SELECTOR_CONFIGS.quadrants.quadrants.map((quadrant, idx) => (
                <button
                  key={idx}
                  className="p-4 rounded-lg border-2 border-gray-200 hover:border-gray-300 transition-colors"
                  style={{ backgroundColor: quadrant.color + '20' }}
                >
                  <h4 className="font-semibold text-sm mb-2">{quadrant.name}</h4>
                  <p className="text-xs text-gray-600">
                    {quadrant.emotions.slice(0, 2).join(', ')}
                    {quadrant.emotions.length > 2 && '...'}
                  </p>
                </button>
              ))}
            </div>
          </div>
        );

      default:
        return (
          <div className="p-6 bg-gray-50 rounded-lg border border-gray-200 text-center">
            <p className="text-gray-500">Tipo de selector no reconocido</p>
          </div>
        );
    }
  };

  return (
    <div className={className}>
      <div className="mb-4">
        <h4 className="text-sm font-medium text-gray-700 mb-2">
          Vista Previa: {EMOTION_SELECTOR_CONFIGS[type as keyof typeof EMOTION_SELECTOR_CONFIGS]?.name || type}
        </h4>
        <p className="text-xs text-gray-500">
          {EMOTION_SELECTOR_CONFIGS[type as keyof typeof EMOTION_SELECTOR_CONFIGS]?.description || 'Descripción no disponible'}
        </p>
      </div>
      {renderPreview()}
    </div>
  );
};
