/**
 * Clients Domain Hooks
 * TanStack Query hooks for clients functionality
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { clientsApi } from './clients.api';
import type {
  Client,
  CreateClientRequest,
  UpdateClientRequest,
  ClientsListParams
} from './clients.types';

/**
 * Query keys for clients
 */
export const clientsKeys = {
  all: ['clients'] as const,
  lists: () => [...clientsKeys.all, 'list'] as const,
  list: (filters?: ClientsListParams) => [...clientsKeys.lists(), filters] as const,
  details: () => [...clientsKeys.all, 'detail'] as const,
  detail: (id: string) => [...clientsKeys.details(), id] as const,
  fromResearch: () => [...clientsKeys.all, 'research'] as const,
};

/**
 * Hook to get all clients
 */
export function useClientsList(params?: ClientsListParams) {
  return useQuery({
    queryKey: clientsKeys.list(params),
    queryFn: () => clientsApi.getAll(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to get clients from research data
 * This is the primary way this app gets clients
 */
export function useClientsFromResearch() {
  return useQuery({
    queryKey: clientsKeys.fromResearch(),
    queryFn: () => clientsApi.getFromResearch(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to get a single client by ID
 */
export function useClientById(id: string) {
  return useQuery({
    queryKey: clientsKeys.detail(id),
    queryFn: () => clientsApi.getById(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to create a new client
 */
export function useCreateClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateClientRequest) => clientsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: clientsKeys.lists() });
      toast.success('Client created successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create client');
    },
  });
}

/**
 * Hook to update a client
 */
export function useUpdateClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateClientRequest }) =>
      clientsApi.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: clientsKeys.lists() });
      queryClient.invalidateQueries({ queryKey: clientsKeys.detail(variables.id) });
      toast.success('Client updated successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update client');
    },
  });
}

/**
 * Hook to delete a client
 */
export function useDeleteClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => clientsApi.delete(id),
    onMutate: async (deletedId) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: clientsKeys.lists() });

      // Snapshot the previous value
      const previousClients = queryClient.getQueryData<Client[]>(clientsKeys.lists());

      // Optimistically update by removing the client
      if (previousClients) {
        queryClient.setQueryData<Client[]>(
          clientsKeys.lists(),
          previousClients.filter(client => client.id !== deletedId)
        );
      }

      // Return a context object with the snapshotted value
      return { previousClients };
    },
    onError: (_, __, context) => {
      // If the mutation fails, use the context to roll back
      if (context?.previousClients) {
        queryClient.setQueryData<Client[]>(clientsKeys.lists(), context.previousClients);
      }
      toast.error('Failed to delete client');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: clientsKeys.lists() });
      toast.success('Client deleted successfully');
    },
  });
}

/**
 * Composite hook for clients with filtering and sorting
 */
interface UseClientsOptions {
  filters?: {
    status?: string;
    company?: string;
    search?: string;
  };
  sortBy?: 'name' | 'company' | 'researchCount' | 'lastActivity';
  sortOrder?: 'asc' | 'desc';
  useResearchData?: boolean;
}

export function useClients(options: UseClientsOptions = {}) {
  const { useResearchData = true } = options;

  // Always call both hooks to avoid conditional hook calls
  const researchQuery = useClientsFromResearch();
  const listQuery = useClientsList(options as ClientsListParams);

  // Use the appropriate query based on the option
  const query = useResearchData ? researchQuery : listQuery;

  // Apply client-side filtering and sorting
  const processedClients = useProcessClients(query.data || [], options);

  return {
    clients: processedClients,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}

/**
 * Helper function to process clients with filtering and sorting
 */
function useProcessClients(
  clients: Client[],
  options: UseClientsOptions
): Client[] {
  const { filters = {}, sortBy = 'name', sortOrder = 'asc' } = options;

  let processedClients = [...clients];

  // Apply filters
  if (filters.status) {
    processedClients = processedClients.filter(c => c.status === filters.status);
  }

  if (filters.company) {
    processedClients = processedClients.filter(c =>
      c.company.toLowerCase().includes(filters.company!.toLowerCase())
    );
  }

  if (filters.search) {
    const searchLower = filters.search.toLowerCase();
    processedClients = processedClients.filter(c =>
      c.name.toLowerCase().includes(searchLower) ||
      c.company.toLowerCase().includes(searchLower) ||
      c.email?.toLowerCase().includes(searchLower)
    );
  }

  // Apply sorting
  processedClients.sort((a, b) => {
    let compareValue = 0;

    switch (sortBy) {
      case 'name':
        compareValue = a.name.localeCompare(b.name);
        break;
      case 'company':
        compareValue = a.company.localeCompare(b.company);
        break;
      case 'researchCount':
        compareValue = a.researchCount - b.researchCount;
        break;
      case 'lastActivity':
        compareValue = new Date(a.lastActivity).getTime() - new Date(b.lastActivity).getTime();
        break;
      default:
        compareValue = 0;
    }

    return sortOrder === 'asc' ? compareValue : -compareValue;
  });

  return processedClients;
}

/**
 * Hook for active clients only
 */
export function useActiveClients() {
  return useClients({
    filters: { status: 'active' },
    useResearchData: true
  });
}

/**
 * Hook for client statistics
 */
export function useClientStats() {
  const { clients, isLoading, error } = useClients();

  const stats = {
    totalClients: clients.length,
    activeClients: clients.filter(c => c.status === 'active').length,
    totalResearch: clients.reduce((sum, client) => sum + client.researchCount, 0),
    avgCompletionRate: 0
  };

  if (stats.totalClients > 0) {
    stats.avgCompletionRate = Math.round((stats.activeClients / stats.totalClients) * 100);
  }

  return {
    stats,
    isLoading,
    error
  };
}