/**
 * Instruments feature queries / mutations. Pure CRUD over the
 * `/api/instruments` route. All write mutations invalidate the list
 * cache on success — no optimistic update path because the
 * instruments page is admin-only and infrequent.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError, api } from '../api';

export const instrumentKeys = {
  all: ['instruments'] as const,
  list: () => [...instrumentKeys.all, 'list'] as const,
};

async function listInstruments() {
  const response = await api.api.instruments.$get();
  if (!response.ok) throw new ApiError(response.status, `instruments ${response.status}`, null);
  return response.json();
}

export function useInstrumentsList() {
  return useQuery({
    queryKey: instrumentKeys.list(),
    queryFn: listInstruments,
  });
}

export function useCreateInstrument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (variables: { name: string; isHarmonic: boolean }) => {
      const response = await api.api.instruments.$post({ json: variables });
      if (!response.ok) throw new ApiError(response.status, `create ${response.status}`, null);
      return response.json();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: instrumentKeys.all });
    },
  });
}

export function useUpdateInstrument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (variables: { id: string; name?: string; isHarmonic?: boolean }) => {
      const { id, ...rest } = variables;
      const response = await api.api.instruments[':id'].$put({
        param: { id },
        json: rest,
      });
      if (!response.ok) throw new ApiError(response.status, `update ${response.status}`, null);
      return response.json();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: instrumentKeys.all });
    },
  });
}

export function useDeleteInstrument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (variables: { id: string }) => {
      const response = await api.api.instruments[':id'].$delete({
        param: { id: variables.id },
      });
      if (!response.ok) throw new ApiError(response.status, `delete ${response.status}`, null);
      return response.json();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: instrumentKeys.all });
    },
  });
}
