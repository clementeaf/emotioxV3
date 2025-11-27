/**
 * Types for data processors
 * These interfaces define the structure of data used in data processing functions
 */

/**
 * Response item from API
 */
export interface ResponseItem {
  participantId: string;
  value: string | number | boolean | string[] | Record<string, unknown>;
  timestamp?: string;
  [key: string]: unknown;
}

/**
 * Grouped response structure
 */
export interface GroupedResponse {
  questionKey: string;
  responses: ResponseItem[];
  [key: string]: unknown;
}

/**
 * SmartVOC response structure
 */
export interface SmartVOCResponse {
  questionKey: string;
  response: string | number | string[];
  participantId: string;
  participantName: string;
  timestamp: string;
}

/**
 * VOC response structure
 */
export interface VOCResponse {
  text: string;
  participantId: string;
  participantName: string;
  timestamp?: string;
}

/**
 * SmartVOC processed data result
 */
export interface SmartVOCProcessedData {
  totalResponses: number;
  uniqueParticipants: number;
  npsScore: number;
  csatScores: number[];
  cesScores: number[];
  nevScores: number[];
  cvScores: number[];
  vocResponses: VOCResponse[];
  smartVOCResponses: SmartVOCResponse[];
}

/**
 * CPV metrics result
 */
export interface CPVMetrics {
  cpvValue: number;
  satisfaction: number;
  retention: number;
  impact: 'Alto' | 'Medio' | 'Bajo';
  trend: 'Positiva' | 'Neutral' | 'Negativa';
  csatPercentage: number;
  cesPercentage: number;
  cvValue: number;
  nevValue: number;
  npsValue: number;
  peakValue: number;
}

/**
 * TrustFlow data point
 */
export interface TrustFlowDataPoint {
  stage: string;
  nps: number;
  nev: number;
  timestamp: string;
}

/**
 * Processors accumulator for SmartVOC
 */
export interface SmartVOCProcessors {
  smartVOCResponses: SmartVOCResponse[];
  npsScores: number[];
  csatScores: number[];
  cesScores: number[];
  nevScores: number[];
  cvScores: number[];
  vocResponses: VOCResponse[];
}

/**
 * Scores accumulator for CPV
 */
export interface CPVScores {
  csat: number[];
  ces: number[];
  nps: number[];
  nev: number[];
  cv: number[];
}

