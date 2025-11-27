export interface SmartVOCResultsProps {
  researchId: string;
  className?: string;
}

export interface MetricCardProps {
  title: string;
  score: number;
  question: string;
  data: Array<{
    date: string;
    satisfied: number;
    dissatisfied: number;
  }>;
  className?: string;
  hasData?: boolean;
}

export interface TrustFlowData {
  stage: string;
  nps: number;
  nev: number;
  count?: number;
  timestamp?: string; // Timestamp original para filtrado por rango de tiempo
}

export interface CPVChartData {
  value: number;
}

export interface Distribution {
  label: string;
  percentage: number;
  color: string;
}

export interface QuestionResult {
  questionNumber: string;
  title: string;
  type: string;
  conditionality: string;
  required: boolean;
  question: string;
  responses: {
    count: number;
    timeAgo: string;
  };
  score: number;
  distribution: Distribution[];
}

export interface EmotionalState {
  name: string;
  value: number;
  isPositive: boolean;
}

export interface Cluster {
  name: string;
  value: number;
  trend: 'up' | 'down';
}

export interface EmotionalStatesData {
  states: EmotionalState[];
  longTermClusters: Cluster[];
  shortTermClusters: Cluster[];
}
