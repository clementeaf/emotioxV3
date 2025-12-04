import React from 'react';

// 🎯 USAR LA MISMA ESTRUCTURA QUE FRONTEND - CLUSTERS ORGANIZADOS EN ESPAÑOL
const EMOTION_CLUSTERS = [
  {
    id: 'advocacy',
    name: 'Advocacy',
    color: '#86efac', // Light Green
    emotions: ['Feliz', 'Satisfecho']
  },
  {
    id: 'recommendation',
    name: 'Recommendation',
    color: '#22c55e', // Medium Green
    emotions: ['Confiado', 'Valorado', 'Cuidado', 'Seguro', 'Enfocado']
  },
  {
    id: 'attention',
    name: 'Attention',
    color: '#16a34a', // Dark Green
    emotions: ['Indulgente', 'Estimulado', 'Exploratorio', 'Interesado', 'Enérgico']
  },
  {
    id: 'destroying',
    name: 'Destroying',
    color: '#ef4444', // Red
    emotions: ['Frustrado', 'Irritado', 'Decepción', 'Estresado', 'Infeliz', 'Desatendido', 'Apresurado', 'Descontento']
  }
];

interface DetailedEmotionSelectorProps {
  selectedEmotions: string[];
  onEmotionSelect: (emotionId: string) => void;
  maxSelections?: number;
  className?: string;
}

/**
 * Selector de emociones detalladas organizado por clusters como en frontend
 */
export const DetailedEmotionSelector: React.FC<DetailedEmotionSelectorProps> = ({
  selectedEmotions = [],
  onEmotionSelect,
  maxSelections,
  className = ''
}) => {
  const getEmotionBackgroundColor = (clusterId: string) => {
    switch (clusterId) {
      case 'advocacy':
        return 'bg-green-200 border-green-300 hover:bg-green-300';
      case 'recommendation':
        return 'bg-green-300 border-green-400 hover:bg-green-400';
      case 'attention':
        return 'bg-green-400 border-green-500 hover:bg-green-500';
      case 'destroying':
        return 'bg-red-200 border-red-300 hover:bg-red-300';
      default:
        return 'bg-gray-100 border-gray-300 hover:bg-gray-200';
    }
  };

  const handleEmotionClick = (emotionId: string) => {
    if (selectedEmotions.includes(emotionId)) {
      onEmotionSelect(emotionId);
    } else if (maxSelections === undefined || selectedEmotions.length < maxSelections) {
      onEmotionSelect(emotionId);
    }
  };

  // 🎯 Aplanar todas las emociones en una sola lista para un layout fluido
  const allEmotions = EMOTION_CLUSTERS.flatMap(cluster =>
    cluster.emotions.map(emotion => ({
      ...cluster,
      emotionName: emotion,
      emotionId: emotion.toLowerCase().replace(/\s+/g, '_').replace(/[áéíóú]/g, (match) => {
        const accents: { [key: string]: string } = { 'á': 'a', 'é': 'e', 'í': 'i', 'ó': 'o', 'ú': 'u' };
        return accents[match] || match;
      })
    }))
  );

  return (
    <div className={`w-full ${className}`}>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {allEmotions.map(({ id: clusterId, emotionName, emotionId }) => {
          const isSelected = selectedEmotions.includes(emotionId);
          const isDisabled = maxSelections !== undefined && !isSelected && selectedEmotions.length >= maxSelections;

          return (
            <button
              key={emotionId}
              type="button"
              onClick={() => handleEmotionClick(emotionId)}
              onTouchEnd={(e) => {
                // Evitar doble disparo si el dispositivo soporta ambos
                e.preventDefault();
                handleEmotionClick(emotionId);
              }}
              disabled={isDisabled}
              className={`
                ${getEmotionBackgroundColor(clusterId)}
                ${isSelected
                  ? 'ring-4 ring-blue-500 ring-offset-2 bg-blue-500 text-white border-blue-600'
                  : 'hover:shadow-md hover:-translate-y-0.5'
                }
                relative
                ${isDisabled
                  ? 'opacity-50 cursor-not-allowed'
                  : 'cursor-pointer'
                }
                px-2 py-3 rounded-xl border-2 text-sm font-semibold transition-all duration-200 
                text-center break-words min-h-[50px] flex items-center justify-center
                shadow-sm active:scale-95
              `}
              title={emotionName}
            >
              <span className="z-10 relative">{emotionName}</span>
              {isSelected && (
                <div className="absolute top-1 right-1">
                  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {maxSelections && (
        <p className="text-center text-sm text-gray-500 mt-4">
          Seleccionado: {selectedEmotions.length} / {maxSelections}
        </p>
      )}
    </div>
  );
};