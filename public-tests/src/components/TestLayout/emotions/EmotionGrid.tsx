import React from 'react';
import { EmotionRow } from './EmotionRow';
import { EMOTIONS, EMOTION_GRID_CONFIG, EmotionCategory } from '../../../constants/emotions';

export interface EmotionGridProps {
  value: unknown;
  onEmotionClick: (emotion: string) => void;
}

export const EmotionGrid: React.FC<EmotionGridProps> = ({
  value,
  onEmotionClick
}) => (
  <div className="space-y-4">
    {(Object.keys(EMOTIONS) as EmotionCategory[]).map((category) => {
      const config = EMOTION_GRID_CONFIG[category];
      return (
        <EmotionRow
          key={category}
          emotions={[...EMOTIONS[category]]}
          value={value}
          onEmotionClick={onEmotionClick}
          gridClass={config.className}
          buttonClass={config.buttonClass}
          selectedClass={config.selectedClass}
        />
      );
    })}
  </div>
);

EmotionGrid.displayName = 'EmotionGrid';