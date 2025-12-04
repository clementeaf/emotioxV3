import React from 'react';
import { RankingListUIProps } from './RankingListTypes';
import { getMoveButtonClasses, getMoveButtonAriaLabel, canMoveUp, canMoveDown } from './RankingListUtils';

/**
 * Componente UI puro para renderizar la lista de ranking
 */
export const RankingListUI: React.FC<RankingListUIProps> = ({
  rankedItems,
  isSaving,
  isApiLoading,
  dataLoading,
  onMoveUp,
  onMoveDown
}) => {
  const isLoading = isSaving || isApiLoading || dataLoading;

  if (rankedItems.length === 0) {
    return (
      <div className="mb-4">
        <p className="text-red-500">⚠️ No hay opciones para mostrar</p>
      </div>
    );
  }

  return (
    <div className="mb-4 w-full flex flex-col items-center">
      {rankedItems.map((item, index) => {
        const canMoveUpItem = canMoveUp(index);
        const canMoveDownItem = canMoveDown(index, rankedItems.length);

        return (
          <div 
            key={`${item}-${index}`} 
            className="flex items-center justify-between border rounded-md p-3 mb-2 bg-white shadow-sm w-full max-w-2xl"
          >
            <span className="text-lg text-neutral-700">{item}</span>
            <div className="flex space-x-1">
              <button
                onClick={() => onMoveUp(index)}
                disabled={!canMoveUpItem || isLoading}
                className={getMoveButtonClasses(!canMoveUpItem || isLoading, 'text-lg')}
                aria-label={getMoveButtonAriaLabel(item, 'up')}
              >
                ▲
              </button>
              <button
                onClick={() => onMoveDown(index)}
                disabled={!canMoveDownItem || isLoading}
                className={getMoveButtonClasses(!canMoveDownItem || isLoading, 'text-lg')}
                aria-label={getMoveButtonAriaLabel(item, 'down')}
              >
                ▼
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};
