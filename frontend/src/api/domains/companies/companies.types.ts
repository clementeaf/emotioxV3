/**
 * Companies Domain Types
 */

// Local definition since @shared/interfaces/company.interface is missing
export interface Company {
  id: string;
  name: string;
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
}

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