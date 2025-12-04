/**
 * Interfaces específicas para WebSocket hooks
 */

export type QuotaType = 
  | 'age'
  | 'country'
  | 'gender'
  | 'educationLevel'
  | 'householdIncome'
  | 'employmentStatus'
  | 'dailyHoursOnline'
  | 'technicalProficiency';

export interface QuotaExceededData {
  researchId: string;
  participantId: string;
  quotaType: QuotaType;
  quotaValue: string;
  currentCount: number;
  maxQuota: number;
  demographicData: Record<string, unknown>;
  timestamp: string;
}

export interface WebSocketEvent {
  type: string;
  data: QuotaExceededData | Record<string, unknown>;
}
