/**
 * Sessions feature queries / mutations. Practices + concerts share the
 * `/api/sessions` endpoint via single-table inheritance on `kind`.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError, api } from '../api';

export const sessionKeys = {
  all: ['sessions'] as const,
  list: () => [...sessionKeys.all, 'list'] as const,
  byId: (id: string) => [...sessionKeys.all, 'byId', id] as const,
};

export function useSessionsList() {
  return useQuery({
    queryKey: sessionKeys.list(),
    queryFn: async () => {
      const response = await api.api.sessions.$get();
      if (!response.ok) throw new ApiError(response.status, `sessions ${response.status}`, null);
      return response.json();
    },
  });
}

export function useSession(id: string, enabled = true) {
  return useQuery({
    queryKey: sessionKeys.byId(id),
    queryFn: async () => {
      const response = await api.api.sessions[':id'].$get({ param: { id } });
      if (!response.ok) throw new ApiError(response.status, `session ${response.status}`, null);
      return response.json();
    },
    enabled,
  });
}

export function useCreateSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (variables: Parameters<typeof api.api.sessions.$post>[0]['json']) => {
      const response = await api.api.sessions.$post({ json: variables });
      if (!response.ok) throw new ApiError(response.status, `create ${response.status}`, null);
      return response.json();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: sessionKeys.all });
    },
  });
}

export function useUpdateSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      variables: { id: string } & Parameters<typeof api.api.sessions[':id']['$put']>[0]['json'],
    ) => {
      const { id, ...rest } = variables;
      const response = await api.api.sessions[':id'].$put({
        param: { id },
        json: rest,
      });
      if (!response.ok) throw new ApiError(response.status, `update ${response.status}`, null);
      return response.json();
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: sessionKeys.byId(variables.id) });
      void queryClient.invalidateQueries({ queryKey: sessionKeys.list() });
    },
  });
}

