/**
 * Client Types - Frontend-specific client/company types
 */

// Re-export company types from shared interfaces
// export * from '../interfaces/company.interface'; // Comentado - archivo no existe

// Frontend-specific client types
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

export type ClientStatus = 'active' | 'inactive' | 'pending' | 'archived';

export interface UseClientsReturn {
  // Data
  clients: Client[];
  total?: number;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  refetch?: () => Promise<void>;
  refreshClients?: () => Promise<void>;
  updateClientStatus?: (clientId: string, status: ClientStatus) => Promise<void>;
  archiveClient?: (clientId: string) => Promise<void>;
  
  // Filtering
  filteredClients?: Client[];
  applyFilters?: (filters: ClientFilters) => void;
  clearFilters?: () => void;
}

export interface UseClientByIdReturn {
  client: Client | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export interface ClientFilters {
  status?: ClientStatus;
  company?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
}

// Research-related client data
export interface ClientResearchData {
  clientId: string;
  researchId: string;
  researchName: string;
  researchType: string;
  status: string;
  createdAt: string;
  completedAt?: string;
}

// Client creation and update requests
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

// API response types
export interface ClientResponse {
  success: boolean;
  data: Client;
  message?: string;
}

export interface ClientsListResponse {
  success: boolean;
  data: Client[];
  total: number;
  page?: number;
  limit?: number;
}
