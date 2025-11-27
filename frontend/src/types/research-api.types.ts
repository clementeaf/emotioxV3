/**
 * Types for research data from API responses
 * These interfaces define the structure of data coming from the backend API
 */

/**
 * Research item as it comes from the API
 */
export interface ResearchAPIItem {
  id: string;
  name?: string;
  basic?: {
    name?: string;
    enterprise?: string;
    [key: string]: unknown;
  };
  status: string;
  progress?: number;
  createdAt: string;
  updatedAt?: string;
  enterprise?: string;
  company?: string;
  participants?: ParticipantAPIItem[];
  [key: string]: unknown;
}

/**
 * Participant item as it comes from the API
 */
export interface ParticipantAPIItem {
  id: string;
  name?: string;
  email?: string;
  company?: string;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
}

/**
 * Research data for sorting and filtering operations
 */
export interface ResearchSortableItem {
  id: string;
  name?: string;
  basic?: {
    name?: string;
    enterprise?: string;
    [key: string]: unknown;
  };
  status: string;
  progress?: number;
  createdAt: string;
  updatedAt?: string;
  enterprise?: string;
  company?: string;
}

