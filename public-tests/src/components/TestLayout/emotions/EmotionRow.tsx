import React from 'react';
import { EmotionButton } from './EmotionButton';

export interface EmotionRowProps {
  emotions: string[];
  value: unknown;
  onEmotionClick: (emotion: string) => void;
  gridClass: string;
  buttonClass: string;
  selectedClass: string;
}

export const EmotionRow: React.FC<EmotionRowProps> = ({
  emotions,
  value,
  onEmotionClick,
  gridClass,
  buttonClass,
  selectedClass
}) => {
  return (
    <div className={`grid ${gridClass} gap-2`}>
      {emotions.map((emotion) => {
        const isSelected = Array.isArray(value) ? value.includes(emotion) : value === emotion;
        return (
          <EmotionButton
            key={`${emotion}-${isSelected}`}
            emotion={emotion}
            isSelected={isSelected}
            onClick={onEmotionClick}
            buttonClass={buttonClass}
            selectedClass={selectedClass}
          />
        );
      })}
    </div>
  );
};

EmotionRow.displayName = 'EmotionRow';