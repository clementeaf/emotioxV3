import React from 'react';

interface Emotion {
    id: string;
    name: string;
    color: string;
}

interface EmotionSelectorProps {
    value: string[];
    onChange: (emotions: string[]) => void;
    onComplete?: () => void;
    minEmotions?: number;
}

// 20 emociones organizadas en 3 filas con sus colores
const EMOTIONS: Emotion[][] = [
    // Fila 1 - Emociones Positivas (7) - Verde Claro
    [
        { id: 'feliz', name: 'Feliz', color: '#86efac' },
        { id: 'satisfecho', name: 'Satisfecho', color: '#86efac' },
        { id: 'confiado', name: 'Confiado', color: '#86efac' },
        { id: 'valorado', name: 'Valorado', color: '#86efac' },
        { id: 'cuidado', name: 'Cuidado', color: '#86efac' },
        { id: 'seguro', name: 'Seguro', color: '#86efac' },
        { id: 'enfocado', name: 'Enfocado', color: '#86efac' },
    ],
    // Fila 2 - Emociones de Atención (6) - Verde Medio
    [
        { id: 'indulgente', name: 'Indulgente', color: '#bbf7d0' },
        { id: 'estimulado', name: 'Estimulado', color: '#bbf7d0' },
        { id: 'exploratorio', name: 'Exploratorio', color: '#bbf7d0' },
        { id: 'interesado', name: 'Interesado', color: '#bbf7d0' },
        { id: 'energico', name: 'Enérgico', color: '#bbf7d0' },
        { id: 'descontento', name: 'Descontento', color: '#bbf7d0' },
    ],
    // Fila 3 - Emociones Negativas (7) - Rojo Claro
    [
        { id: 'frustrado', name: 'Frustrado', color: '#fecaca' },
        { id: 'irritado', name: 'Irritado', color: '#fecaca' },
        { id: 'decepcion', name: 'Decepción', color: '#fecaca' },
        { id: 'estresado', name: 'Estresado', color: '#fecaca' },
        { id: 'infeliz', name: 'Infeliz', color: '#fecaca' },
        { id: 'desatendido', name: 'Desatendido', color: '#fecaca' },
        { id: 'apresurado', name: 'Apresurado', color: '#fecaca' },
    ],
];

export const EmotionSelector: React.FC<EmotionSelectorProps> = ({ value, onChange, onComplete, minEmotions }) => {
    const toggleEmotion = (emotionId: string): void => {
        const newValue = value.includes(emotionId)
            ? value.filter(id => id !== emotionId)
            : [...value, emotionId];
        
        onChange(newValue);
        
        // Auto-advance if minimum emotions requirement is met
        if (onComplete && minEmotions !== undefined && minEmotions > 0) {
            if (newValue.length >= minEmotions) {
                setTimeout(() => {
                    onComplete();
                }, 500);
            }
        } else if (onComplete && (!minEmotions || minEmotions === 0)) {
            // If no minimum requirement, advance on any selection
            if (newValue.length > 0) {
                setTimeout(() => {
                    onComplete();
                }, 500);
            }
        }
    };

    return (
        <div className="w-full space-y-4">
            {EMOTIONS.map((row, rowIndex) => (
                <div
                    key={rowIndex}
                    className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2"
                >
                    {row.map((emotion) => {
                        const isSelected = value.includes(emotion.id);

                        return (
                            <button
                                key={emotion.id}
                                type="button"
                                onClick={() => toggleEmotion(emotion.id)}
                                className="relative px-3 py-4 rounded-lg border-2 text-sm font-medium transition-all min-h-[64px] flex items-center justify-center text-center"
                                style={{
                                    backgroundColor: emotion.color,
                                    borderColor: isSelected ? '#3b82f6' : '#d1d5db',
                                    color: '#1f2937',
                                    boxShadow: isSelected ? '0 0 0 4px rgba(59, 130, 246, 0.3)' : 'none',
                                }}
                            >
                                <span className="leading-tight break-words px-1">
                                    {emotion.name}
                                </span>

                                {/* Checkmark */}
                                {isSelected && (
                                    <div className="absolute top-1 right-1">
                                        <svg
                                            className="w-4 h-4 text-blue-600"
                                            fill="currentColor"
                                            viewBox="0 0 20 20"
                                        >
                                            <path
                                                fillRule="evenodd"
                                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                                clipRule="evenodd"
                                            />
                                        </svg>
                                    </div>
                                )}
                            </button>
                        );
                    })}
                </div>
            ))}
        </div>
    );
};
