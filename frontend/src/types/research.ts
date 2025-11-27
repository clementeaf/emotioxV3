/**
 * Research Types - Centralized type definitions for research functionality
 * Re-exports from shared interfaces and defines frontend-specific types
 */

// Import specific types to avoid conflicts
import type {
  ResearchType as SharedResearchType,
  ResearchStatus as SharedResearchStatus,
  ResearchRecord,
  ResearchConfig,
  ResearchFormData,
  ResearchCreationResponse
} from '../../../shared/interfaces/research.interface';

import type {
  ResearchModel,
  CreateResearchModelRequest,
  CreateResearchResponse,
  ResearchBasicData
} from '../../../shared/interfaces/research.model';

// Re-export with explicit names
export type { ResearchRecord, ResearchConfig, ResearchFormData, ResearchCreationResponse };
export type { ResearchModel as Research, CreateResearchModelRequest as CreateResearchRequest, CreateResearchResponse, ResearchBasicData };
export { SharedResearchType as ResearchType, SharedResearchStatus as ResearchStatus };

// Type alias for extended research (non-conflicting)
export type ResearchWithExtensions = ResearchRecord & {
  title?: string;
  technique?: string;
}

// Type for research data as it comes from the API (flat structure)
export interface ResearchAPIResponse {
  id: string;
  name: string;
  companyId: string;
  type: string;
  technique: string;
  description: string;
  targetParticipants: number;
  objectives: string[];
  tags: string[];
  status: string;
  createdAt: string;
  updatedAt?: string;
}

// Additional frontend-specific types
export interface ApiResponse<T = unknown> {
  data: T;
  success: boolean;
  message?: string;
  error?: string;
}

export interface User {
  id: string;
  email: string;
  name?: string;
}

export interface AuthResponse {
  token: string;
  user: User;
  success: boolean;
}

export interface LoginRequest {
  email: string;
  password: string;
}

// Research list and pagination types
export interface ResearchListResponse {
  researches: ResearchRecord[];
  data: ResearchRecord[];
  total: number;
  page: number;
  limit: number;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface FilterParams {
  status?: SharedResearchStatus;
  type?: SharedResearchType;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface UpdateResearchRequest {
  id: string;
  updates: Partial<CreateResearchModelRequest>;
}

// SmartVOC types
export interface SmartVOCFormData {
  questions: Array<{
    id: string;
    text: string;
    type: string;
    required?: boolean;
    options?: string[];
  }>;
  enabled: boolean;
}

export interface SmartVOCResponse {
  questionKey: string;
  response: string | number | string[];
  participantId: string;
  participantName: string;
  timestamp: string;
}

export interface VOCResponse {
  text: string;
  participantId: string;
  participantName: string;
  timestamp?: string;
}

export interface QuestionWithResponses {
  questionKey: string;
  questionText: string;
  questionType: string;
  responses: QuestionResponse[];
}

export interface QuestionResponse {
  participantId: string;
  response: string | number | boolean | string[] | Record<string, unknown>;
  value: string | number | string[] | Record<string, unknown>;
  timestamp?: string;
  metadata?: Record<string, unknown>;
}

export interface GroupedResponsesResponse {
  researchId: string;
  questions: QuestionWithResponses[];
  data: QuestionWithResponses[];
  total: number;
  participantCount: number;
}

// Emotion and sentiment types
export type EmotionType = 'positive' | 'negative' | 'neutral';

export type PositiveEmotion = 
  | 'Feliz' 
  | 'Satisfecho' 
  | 'Confiado' 
  | 'Valorado' 
  | 'Cuidado' 
  | 'Seguro'
  | 'Enfocado' 
  | 'Indulgente' 
  | 'Estimulado' 
  | 'Exploratorio' 
  | 'Interesado' 
  | 'Enérgico';

export type NegativeEmotion = 
  | 'Descontento' 
  | 'Frustrado' 
  | 'Irritado' 
  | 'Decepción' 
  | 'Estresado' 
  | 'Infeliz' 
  | 'Desatendido' 
  | 'Apresurado';

export type ImpactLevel = 'Alto' | 'Medio' | 'Bajo';
export type TrendDirection = 'Positiva' | 'Neutral' | 'Negativa';

// Data processing result types
export interface SmartVOCResults {
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

export interface CPVData {
  cpvValue: number;
  satisfaction: number;
  retention: number;
  impact: ImpactLevel;
  trend: TrendDirection;
  csatPercentage: number;
  cesPercentage: number;
  cvValue: number;
  nevValue: number;
  npsValue: number;
  peakValue: number;
}

export interface TrustFlowData {
  stage: string;
  nps: number;
  nev: number;
  timestamp: string;
}