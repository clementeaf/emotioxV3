/**
 * Companies Domain Hooks - React Query implementation with Optimistic Updates
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { companiesApi } from './companies.api';
import type {
  Company,
  CreateCompanyRequest,
  UpdateCompanyRequest,
  ApiResponse
} from './companies.types';

// Query keys
export const companiesKeys = {
  all: ['companies'] as const,
  lists: () => [...companiesKeys.all, 'list'] as const,
  details: () => [...companiesKeys.all, 'detail'] as const,
  detail: (id: string) => [...companiesKeys.details(), id] as const,
};

/**
 * Hook for getting all companies
 */
export function useCompanies() {
  return useQuery({
    queryKey: companiesKeys.lists(),
    queryFn: () => companiesApi.getAll(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Hook for getting company by ID
 */
export function useCompanyById(id: string) {
  return useQuery({
    queryKey: companiesKeys.detail(id),
    queryFn: () => companiesApi.getById(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook for creating company with optimistic updates
 */
export function useCreateCompany() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateCompanyRequest) => companiesApi.create(data),
    onMutate: async (newCompany) => {
      // Cancel outgoing queries
      await queryClient.cancelQueries({ queryKey: companiesKeys.lists() });

      // Snapshot previous value
      const previousCompanies = queryClient.getQueryData<ApiResponse<Company[]>>(companiesKeys.lists());

      // Optimistically update
      if (previousCompanies?.data) {
        const optimisticCompany: Company = {
          id: `temp-${Date.now()}`,
          name: newCompany.name,
          status: newCompany.status || 'active',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        const newData: ApiResponse<Company[]> = {
          ...previousCompanies,
          data: [...previousCompanies.data, optimisticCompany],
        };

        queryClient.setQueryData(companiesKeys.lists(), newData);
      }

      return { previousCompanies };
    },
    onSuccess: (data) => {
      // Invalidate and refetch companies queries
      queryClient.invalidateQueries({ queryKey: companiesKeys.all });

      // Show success message
      toast.success('Empresa creada exitosamente');
    },
    onError: (error: any, newCompany, context) => {
      // Rollback on error
      if (context?.previousCompanies) {
        queryClient.setQueryData(companiesKeys.lists(), context.previousCompanies);
      }

      const message = error?.response?.data?.message || 'Error al crear empresa';
      toast.error(message);
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: companiesKeys.lists() });
    },
  });
}

/**
 * Hook for updating company with optimistic updates
 */
export function useUpdateCompany() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateCompanyRequest }) =>
      companiesApi.update(id, data),
    onMutate: async ({ id, data }) => {
      // Cancel outgoing queries
      await queryClient.cancelQueries({ queryKey: companiesKeys.detail(id) });
      await queryClient.cancelQueries({ queryKey: companiesKeys.lists() });

      // Snapshot previous values
      const previousCompany = queryClient.getQueryData<ApiResponse<Company>>(companiesKeys.detail(id));
      const previousList = queryClient.getQueryData<ApiResponse<Company[]>>(companiesKeys.lists());

      // Optimistically update detail
      if (previousCompany?.data) {
        const optimisticCompany: Company = {
          ...previousCompany.data,
          name: data.name || previousCompany.data.name,
          status: data.status || previousCompany.data.status,
          updatedAt: new Date().toISOString(),
        };

        const newData: ApiResponse<Company> = {
          ...previousCompany,
          data: optimisticCompany,
        };

        queryClient.setQueryData(companiesKeys.detail(id), newData);

        // Optimistically update in lists too
        if (previousList?.data) {
          const newListData: ApiResponse<Company[]> = {
            ...previousList,
            data: previousList.data.map(company =>
              company.id === id ? optimisticCompany : company
            ),
          };

          queryClient.setQueryData(companiesKeys.lists(), newListData);
        }
      }

      return { previousCompany, previousList };
    },
    onSuccess: (data, variables) => {
      // Update specific company in cache with real data
      queryClient.setQueryData(companiesKeys.detail(variables.id), data);

      // Invalidate lists to ensure consistency
      queryClient.invalidateQueries({ queryKey: companiesKeys.lists() });

      toast.success('Empresa actualizada exitosamente');
    },
    onError: (error: any, variables, context) => {
      // Rollback on error
      if (context?.previousCompany) {
        queryClient.setQueryData(companiesKeys.detail(variables.id), context.previousCompany);
      }
      if (context?.previousList) {
        queryClient.setQueryData(companiesKeys.lists(), context.previousList);
      }

      const message = error?.response?.data?.message || 'Error al actualizar empresa';
      toast.error(message);
    },
    onSettled: (data, error, variables) => {
      // Always refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: companiesKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: companiesKeys.lists() });
    },
  });
}

/**
 * Hook for deleting company with optimistic updates
 */
export function useDeleteCompany() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => companiesApi.delete(id),
    onMutate: async (deletedId) => {
      // Cancel outgoing queries
      await queryClient.cancelQueries({ queryKey: companiesKeys.lists() });

      // Snapshot previous value
      const previousCompanies = queryClient.getQueryData<ApiResponse<Company[]>>(companiesKeys.lists());

      // Optimistically update
      if (previousCompanies?.data) {
        const newData: ApiResponse<Company[]> = {
          ...previousCompanies,
          data: previousCompanies.data.filter(company => company.id !== deletedId),
        };

        queryClient.setQueryData(companiesKeys.lists(), newData);
      }

      return { previousCompanies };
    },
    onSuccess: () => {
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: companiesKeys.all });

      toast.success('Empresa eliminada exitosamente');
    },
    onError: (error: any, deletedId, context) => {
      // Rollback on error
      if (context?.previousCompanies) {
        queryClient.setQueryData(companiesKeys.lists(), context.previousCompanies);
      }

      const message = error?.response?.data?.message || 'Error al eliminar empresa';
      toast.error(message);
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: companiesKeys.lists() });
    },
  });
}