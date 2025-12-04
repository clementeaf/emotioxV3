import React, { useCallback } from 'react';

export interface EmotionButtonProps {
  emotion: string;
  isSelected: boolean;
  onClick: (emotion: string) => void;
  buttonClass: string;
  selectedClass: string;
}

export const EmotionButton: React.FC<EmotionButtonProps> = ({
  emotion,
  isSelected,
  onClick,
  buttonClass,
  selectedClass
}) => {
  const handleClick = useCallback(() => {
    // 🎯 CLICK SIMPLE: Alternar selección (seleccionar si no está seleccionada, deseleccionar si está seleccionada)
    onClick(emotion);
  }, [emotion, onClick]);

  return (
    <button
      onClick={handleClick}
      className={`px-2 py-3 rounded-lg border-2 text-xs font-medium transition-all cursor-pointer min-h-[56px] flex items-center justify-center text-center relative w-full ${
        isSelected ? selectedClass : buttonClass
      } ${isSelected ? 'ring-4 ring-blue-300 ring-offset-2' : ''}`}
    >
      <span className="leading-tight break-words px-1 w-full text-center">{emotion}</span>
      {isSelected && (
        <div className="absolute top-1 right-1">
          <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        </div>
      )}
    </button>
  );
};

EmotionButton.displayName = 'EmotionButton';