/**
 * Interfaces para el componente RankingList
 */

export interface RankingListProps {
  items: string[];
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
  isSaving: boolean;
  isApiLoading: boolean;
  dataLoading: boolean;
  currentQuestionKey?: string;
  initialFormData?: Record<string, unknown>;
}

export interface RankingListUIProps {
  rankedItems: string[];
  isSaving: boolean;
  isApiLoading: boolean;
  dataLoading: boolean;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
}

export interface UseRankingDataProps {
  items: string[];
  currentQuestionKey?: string;
  initialFormData?: Record<string, unknown>;
}

export interface UseRankingActionsProps {
  rankedItems: string[];
  setRankedItems: (items: string[]) => void;
  currentQuestionKey?: string;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
}

export interface RankingData {
  rankedItems: string[];
  isLoading: boolean;
  error: string | null;
}
