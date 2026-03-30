import React from 'react';

interface Emotion {
    id: string;
    name: string;
    color: string;
}

interface EmotionSelectorProps {
    value: string[];
    onChange: (emotions: string[]) => void;
    maxSelections?: number;
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
    // Fila 2 - Emociones de Atención (5) - Verde Medio
    [
        { id: 'indulgente', name: 'Indulgente', color: '#bbf7d0' },
        { id: 'estimulado', name: 'Estimulado', color: '#bbf7d0' },
        { id: 'exploratorio', name: 'Exploratorio', color: '#bbf7d0' },
        { id: 'interesado', name: 'Interesado', color: '#bbf7d0' },
        { id: 'energico', name: 'Enérgico', color: '#bbf7d0' },
    ],
    // Fila 3 - Emociones Negativas (8) - Rojo Claro
    [
        { id: 'descontento', name: 'Descontento', color: '#fecaca' },
        { id: 'frustrado', name: 'Frustrado', color: '#fecaca' },
        { id: 'irritado', name: 'Irritado', color: '#fecaca' },
        { id: 'decepcion', name: 'Decepción', color: '#fecaca' },
        { id: 'estresado', name: 'Estresado', color: '#fecaca' },
        { id: 'infeliz', name: 'Infeliz', color: '#fecaca' },
        { id: 'desatendido', name: 'Desatendido', color: '#fecaca' },
        { id: 'apresurado', name: 'Apresurado', color: '#fecaca' },
    ],
];

export const EmotionSelector: React.FC<EmotionSelectorProps> = ({ value, onChange, maxSelections }) => {
    const toggleEmotion = (emotionId: string): void => {
        const isSelected = value.includes(emotionId);

        if (!isSelected && typeof maxSelections === 'number' && value.length >= maxSelections) {
            return;
        }

        const newValue = value.includes(emotionId)
            ? value.filter(id => id !== emotionId)
            : [...value, emotionId];

        onChange(newValue);
    };

    const allEmotions = EMOTIONS.flat();

    return (
        <div className="w-full">
            <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-7 gap-1.5">
                {allEmotions.map((emotion) => {
                    const isSelected = value.includes(emotion.id);
                    const isDisabled = !isSelected && typeof maxSelections === 'number' && value.length >= maxSelections;

                    return (
                        <button
                            key={emotion.id}
                            type="button"
                            disabled={isDisabled}
                            onClick={() => toggleEmotion(emotion.id)}
                            className="relative px-1 py-1.5 rounded-md border-2 text-[10px] sm:text-xs font-medium transition-all min-h-[36px] flex items-center justify-center text-center disabled:cursor-not-allowed disabled:opacity-60"
                            style={{
                                backgroundColor: emotion.color,
                                borderColor: isSelected ? '#3b82f6' : '#d1d5db',
                                color: '#1f2937',
                                boxShadow: isSelected ? '0 0 0 2px rgba(59, 130, 246, 0.3)' : 'none',
                            }}
                        >
                            <span className="leading-tight break-words w-full">
                                {emotion.name}
                            </span>

                            {/* Checkmark */}
                            {isSelected && (
                                <div className="absolute top-0.5 right-0.5">
                                    <svg
                                        className="w-3 h-3 text-blue-600"
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
        </div>
    );
};
