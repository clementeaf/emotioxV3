/**
 * Clients Domain Types
 * Type definitions for clients/companies functionality
 */

// Re-export shared types
export * from '../../../../../shared/interfaces/company.interface';

// Import necessary types
import type { ClientStatus } from '@/shared/types/clients.types';

// API Response wrapper
export interface ApiResponse<T> {
  success?: boolean;
  data: T;
  message?: string;
  total?: number;
  page?: number;
  limit?: number;
}

// Client entity type
export interface Client {
  id: string;
  name: string;
  company: string;
  email?: string;
  status: ClientStatus;
  researchCount: number;
  lastActivity: string;
  createdAt: string;
  updatedAt: string;
}

// Request types
export interface CreateClientRequest {
  name: string;
  company: string;
  email?: string;
  status?: ClientStatus;
}

export interface UpdateClientRequest {
  name?: string;
  company?: string;
  email?: string;
  status?: ClientStatus;
}

// Query parameters
export interface ClientsListParams {
  page?: number;
  limit?: number;
  status?: ClientStatus;
  company?: string;
  search?: string;
  sortBy?: 'name' | 'company' | 'researchCount' | 'lastActivity';
  sortOrder?: 'asc' | 'desc';
}

// Research-related data for clients
export interface ClientResearchData {
  clientId: string;
  researchId: string;
  researchName: string;
  researchType: string;
  status: string;
  createdAt: string;
  completedAt?: string;
}