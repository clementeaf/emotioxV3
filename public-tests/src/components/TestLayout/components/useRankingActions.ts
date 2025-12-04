import { useCallback } from 'react';
import { useFormDataStore } from '../../../stores/useFormDataStore';
import { UseRankingActionsProps } from './RankingListTypes';
import { swapArrayElements, canMoveUp, canMoveDown } from './RankingListUtils';

/**
 * Hook para manejar las acciones de movimiento en el ranking
 */
export const useRankingActions = ({
  rankedItems,
  setRankedItems,
  currentQuestionKey,
  onMoveUp,
  onMoveDown
}: UseRankingActionsProps) => {
  const { setFormData } = useFormDataStore();

  const saveRanking = useCallback((newRanking: string[]) => {
    if (currentQuestionKey) {
      setFormData(currentQuestionKey, {
        selectedValue: JSON.stringify(newRanking)
      });
    }
  }, [currentQuestionKey, setFormData]);

  const handleMoveUp = useCallback((index: number) => {
    if (!canMoveUp(index)) return;

    const newRanking = swapArrayElements(rankedItems, index, index - 1);
    setRankedItems(newRanking);
    saveRanking(newRanking);
    onMoveUp(index);
  }, [rankedItems, setRankedItems, saveRanking, onMoveUp]);

  const handleMoveDown = useCallback((index: number) => {
    if (!canMoveDown(index, rankedItems.length)) return;

    const newRanking = swapArrayElements(rankedItems, index, index + 1);
    setRankedItems(newRanking);
    saveRanking(newRanking);
    onMoveDown(index);
  }, [rankedItems, setRankedItems, saveRanking, onMoveDown]);

  return {
    handleMoveUp,
    handleMoveDown
  };
};
