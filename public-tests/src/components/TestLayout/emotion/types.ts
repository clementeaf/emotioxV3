/**
 * Interfaces para los componentes de jerarquía de emociones
 */

export interface EmotionCluster {
  id: string;
  name: string;
  color: string;
  emotions: string[];
  description: string;
  value: number;
}

export interface EmotionOption {
  id: string;
  name: string;
  cluster: string;
  value: number;
  color: string;
}

export interface EmotionHierarchySelectorProps {
  selectedCluster?: string;
  onClusterSelect?: (clusterId: string) => void;
  className?: string;
}

export interface DetailedEmotionSelectorProps {
  selectedEmotions?: string[];
  onEmotionSelect?: (emotionId: string) => void;
  maxSelections?: number;
  className?: string;
}
