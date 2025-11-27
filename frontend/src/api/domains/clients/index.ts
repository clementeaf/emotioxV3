/**
 * Clients Domain Barrel Export
 * Central export point for clients domain
 */

// Export API methods
export { clientsApi } from './clients.api';

// Export hooks
export {
  clientsKeys,
  useClientsList,
  useClientsFromResearch,
  useClientById,
  useCreateClient,
  useUpdateClient,
  useDeleteClient,
  useClients,
  useActiveClients,
  useClientStats
} from './clients.hooks';

// Export types
export type {
  ApiResponse,
  Client,
  CreateClientRequest,
  UpdateClientRequest,
  ClientsListParams,
  ClientResearchData
} from './clients.types';