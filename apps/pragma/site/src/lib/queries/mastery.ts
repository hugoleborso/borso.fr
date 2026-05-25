/**
 * Mastery feature queries / mutations. Defaults are the band-wide
 * baseline; overrides are per-song deltas the catalog page edits.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError, api } from '../api';

export const masteryKeys = {
  all: ['mastery'] as const,
  defaults: () => [...masteryKeys.all, 'defaults'] as const,
  overridesOf: (songId: string) => [...masteryKeys.all, 'overrides', songId] as const,
};

export function useMasteryDefaults() {
  return useQuery({
    queryKey: masteryKeys.defaults(),
    queryFn: async () => {
      const response = await api.api.mastery.defaults.$get();
      if (!response.ok) throw new ApiError(response.status, `mastery ${response.status}`, null);
      return response.json();
    },
  });
}

export function useSaveMasteryDefault() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (variables: { memberId: string; instrumentId: string; score: number }) => {
      const response = await api.api.mastery.defaults.$put({ json: variables });
      if (!response.ok) throw new ApiError(response.status, `save ${response.status}`, null);
      return response.json();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: masteryKeys.defaults() });
    },
  });
}

export function useDeleteMasteryDefault() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (variables: { memberId: string; instrumentId: string }) => {
      const response = await api.api.mastery.defaults[':memberId'][':instrumentId'].$delete({
        param: variables,
      });
      if (!response.ok) throw new ApiError(response.status, `delete ${response.status}`, null);
      return response.json();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: masteryKeys.defaults() });
    },
  });
}

