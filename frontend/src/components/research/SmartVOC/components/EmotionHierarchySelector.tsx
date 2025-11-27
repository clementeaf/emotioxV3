import React from 'react';

interface EmotionHierarchySelectorProps {
  selectedCluster?: string;
  onClusterSelect?: (clusterId: string) => void;
  className?: string;
}

/**
 * Componente para mostrar la jerarquía de valor emocional
 * Basado en la imagen de BeyondPhilosophy.com
 */
export const EmotionHierarchySelector: React.FC<EmotionHierarchySelectorProps> = ({
  selectedCluster,
  onClusterSelect,
  className = ''
}) => {
  return (
    <div className={`space-y-4 ${className}`}>
      {/* Título y descripción */}
      <div className="text-center mb-6">
        <h3 className="text-lg font-semibold text-neutral-900 mb-2">
          Jerarquía de Valor Emocional
        </h3>
        <p className="text-sm text-neutral-600">
          Selecciona el cluster emocional que mejor describe tu experiencia
        </p>
      </div>

      {/* Pirámide de clusters */}
      <div className="flex flex-col items-center space-y-2">
        {/* Advocacy Cluster (Top) */}
        <div className="w-full max-w-md">
          <button
            onClick={() => onClusterSelect?.('advocacy')}
            className={`w-full p-4 rounded-lg border-2 transition-all duration-200 ${
              selectedCluster === 'advocacy'
                ? 'border-green-500 bg-green-50 shadow-lg scale-105'
                : 'border-green-200 bg-green-50 hover:border-green-300 hover:shadow-md'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="text-left">
                <h4 className="font-semibold text-green-800">Advocacy</h4>
                <p className="text-xs text-green-600 mt-1">Happy, Pleased</p>
                <p className="text-xs text-green-500 mt-1">Estados más positivos que llevan a la defensa de la marca</p>
              </div>
              <div className="w-4 h-4 rounded-full bg-green-400"></div>
            </div>
          </button>
        </div>

        {/* Recommendation Cluster */}
        <div className="w-full max-w-md">
          <button
            onClick={() => onClusterSelect?.('recommendation')}
            className={`w-full p-4 rounded-lg border-2 transition-all duration-200 ${
              selectedCluster === 'recommendation'
                ? 'border-green-600 bg-green-50 shadow-lg scale-105'
                : 'border-green-300 bg-green-50 hover:border-green-400 hover:shadow-md'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="text-left">
                <h4 className="font-semibold text-green-700">Recommendation</h4>
                <p className="text-xs text-green-600 mt-1">Trusting, Valued, Cared for, Focused, Safe</p>
                <p className="text-xs text-green-500 mt-1">Estados que fomentan confianza y llevan a recomendaciones</p>
              </div>
              <div className="w-4 h-4 rounded-full bg-green-500"></div>
            </div>
          </button>
        </div>

        {/* Attention Cluster */}
        <div className="w-full max-w-md">
          <button
            onClick={() => onClusterSelect?.('attention')}
            className={`w-full p-4 rounded-lg border-2 transition-all duration-200 ${
              selectedCluster === 'attention'
                ? 'border-green-700 bg-green-50 shadow-lg scale-105'
                : 'border-green-400 bg-green-50 hover:border-green-500 hover:shadow-md'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="text-left">
                <h4 className="font-semibold text-green-600">Attention</h4>
                <p className="text-xs text-green-600 mt-1">Interesting, Energetic, Stimulated, Exploratory, Indulgent</p>
                <p className="text-xs text-green-500 mt-1">Emociones que capturan atención y engagement</p>
              </div>
              <div className="w-4 h-4 rounded-full bg-green-600"></div>
            </div>
          </button>
        </div>

        {/* Destroying Cluster (Bottom) */}
        <div className="w-full max-w-md">
          <button
            onClick={() => onClusterSelect?.('destroying')}
            className={`w-full p-4 rounded-lg border-2 transition-all duration-200 ${
              selectedCluster === 'destroying'
                ? 'border-red-500 bg-red-50 shadow-lg scale-105'
                : 'border-red-200 bg-red-50 hover:border-red-300 hover:shadow-md'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="text-left">
                <h4 className="font-semibold text-red-800">Destroying</h4>
                <p className="text-xs text-red-600 mt-1">Irritated, Hurried, Neglected, Unhappy, Unsatisfied, Stressed, Disappointment, Frustrated</p>
                <p className="text-xs text-red-500 mt-1">Estados emocionales destructivos que generan valor negativo</p>
              </div>
              <div className="w-4 h-4 rounded-full bg-red-400"></div>
            </div>
          </button>
        </div>
      </div>

      {/* Información adicional */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
              <span className="text-white text-xs font-bold">i</span>
            </div>
          </div>
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">¿Cómo funciona la jerarquía?</p>
            <p className="text-xs">
              Los clusters superiores generan mayor valor a largo plazo y llevan a la defensa de la marca. 
              Los clusters inferiores pueden ser destructivos para la relación con el cliente.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

// 🎯 COMPONENTE ELIMINADO - CONSOLIDADO EN PUBLIC-TESTS
// El componente DetailedEmotionSelector se ha movido a:
// public-tests/src/components/TestLayout/emotion/DetailedEmotionSelector.tsx
// para evitar duplicación de código 