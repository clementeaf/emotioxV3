export interface AOI {
  id: string;
  label: string;
  /** Rect in percent (0-100) of image */
  x: number;
  y: number;
  width: number;
  height: number;
}

/** AOI with computed stats (percentage/count) derived from current (filtered) responses */
export interface AOIWithStats extends AOI {
  /** % of total participants who clicked inside */
  percentage: number;
  /** Unique participants who clicked inside */
  participantCount: number;
}

export interface NavigationResponse {
  participantId: string;
  completed?: boolean;
  completedFlow?: boolean;
  clicks?: number;
  totalClicks?: number;
  correctClicks: number;
  accuracy?: number;
  duration?: number;
  totalDuration?: number;
  heatmapData?: Array<{ x: number; y: number; timestamp: number; isCorrect: boolean }>;
}

export interface NavigationStep {
  stepNumber: number;
  title: string;
  description?: string;
  duration: string;
  completionRate: number;
  participantCount: number;
  aois?: AOI[];
  hasHeatmap?: boolean;
  heatmapData?: Array<{ x: number; y: number; value?: number; isCorrect?: boolean; timestamp?: number; participantId?: string }>;
  imageUrl?: string;
  hitZones?: Array<{ x: number; y: number; width: number; height: number }>;
  responses?: NavigationResponse[];
  /** TranSalNet saliency prediction data (per-image) */
  predictionHeatmap?: Array<{ x: number; y: number; value: number }>;
}

export interface NavigationTestCardProps {
  questionNumber: string;
  questionText: string;
  questionType?: string;
  conditionalityDisabled?: boolean;
  required?: boolean;
  steps: NavigationStep[];
  onDownloadCSV?: () => void;
  className?: string;
}
