/**
 * Companies Domain Types
 */

// Re-export from shared interfaces
export type {
  Company
} from '../../../../../shared/interfaces/company.interface';

// Import for local use
import type { Company } from '../../../../../shared/interfaces/company.interface';

// API Response wrapper
export interface ApiResponse<T> {
  success?: boolean;
  data: T;
  message?: string;
}

// Request types for API
export interface CreateCompanyRequest {
  name: string;
  status?: 'active' | 'inactive';
}

export interface UpdateCompanyRequest {
  name?: string;
  status?: 'active' | 'inactive';
}