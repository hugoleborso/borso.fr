/**
 * Bars (CRM) feature queries / mutations.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError, api } from '../api';

export const barKeys = {
  all: ['bars'] as const,
  list: () => [...barKeys.all, 'list'] as const,
  byId: (id: string) => [...barKeys.all, 'byId', id] as const,
};

export function useBarsList() {
  return useQuery({
    queryKey: barKeys.list(),
    queryFn: async () => {
      const response = await api.api.bars.$get();
      if (!response.ok) throw new ApiError(response.status, `bars ${response.status}`, null);
      return response.json();
    },
  });
}

export function useBar(id: string, enabled = true) {
  return useQuery({
    queryKey: barKeys.byId(id),
    queryFn: async () => {
      const response = await api.api.bars[':id'].$get({ param: { id } });
      if (!response.ok) throw new ApiError(response.status, `bar ${response.status}`, null);
      return response.json();
    },
    enabled,
  });
}

export function useCreateBar() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (variables: Parameters<typeof api.api.bars.$post>[0]['json']) => {
      const response = await api.api.bars.$post({ json: variables });
      if (!response.ok) throw new ApiError(response.status, `create ${response.status}`, null);
      return response.json();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: barKeys.all });
    },
  });
}

export function useUpdateBar() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      variables: { id: string } & Parameters<typeof api.api.bars[':id']['$put']>[0]['json'],
    ) => {
      const { id, ...rest } = variables;
      const response = await api.api.bars[':id'].$put({
        param: { id },
        json: rest,
      });
      if (!response.ok) throw new ApiError(response.status, `update ${response.status}`, null);
      return response.json();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: barKeys.all });
    },
  });
}

export function useDeleteBar() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (variables: { id: string }) => {
      const response = await api.api.bars[':id'].$delete({ param: { id: variables.id } });
      if (!response.ok) throw new ApiError(response.status, `delete ${response.status}`, null);
      return response.json();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: barKeys.all });
    },
  });
}
