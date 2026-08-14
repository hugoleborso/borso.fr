/**
 * Mastery feature queries / mutations. Defaults are the band-wide
 * baseline; overrides are per-song deltas the catalog page edits.
 *
 * Save/delete on a default cell are optimistic (round 17c) — the
 * scroll-wheel ±1 in the matrix must feel instant; the cached row is
 * upserted/removed before the server replies, and `onSettled`
 * invalidates to reconcile.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { InferResponseType } from 'hono/client';
import { ApiError, api } from '../api.client';
import { upsertMasteryDefault, withoutMasteryDefault } from './mastery.utils';
import { isLastPendingMutation } from './optimistic.utils';

export const masteryKeys = {
  all: ['mastery'] as const,
  defaults: () => [...masteryKeys.all, 'defaults'] as const,
  overridesOf: (songId: string) => [...masteryKeys.all, 'overrides', songId] as const,
};

type MasteryDefaultsResponse = InferResponseType<typeof api.api.mastery.defaults.$get>;

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

// @FollowsBlueprint query-optimistic-mutation
export function useSaveMasteryDefault() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: masteryKeys.all,
    mutationFn: async (variables: { memberId: string; instrumentId: string; score: number }) => {
      const response = await api.api.mastery.defaults.$put({ json: variables });
      if (!response.ok) throw new ApiError(response.status, `save ${response.status}`, null);
      return response.json();
    },
    onMutate: async (variables) => {
      const key = masteryKeys.defaults();
      await queryClient.cancelQueries({ queryKey: key });
      const previousDefaults = queryClient.getQueryData<MasteryDefaultsResponse>(key);
      queryClient.setQueryData<MasteryDefaultsResponse>(key, (old) => {
        if (old === undefined) return old;
        return { defaults: upsertMasteryDefault(old.defaults, variables) };
      });
      return { previousDefaults };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousDefaults !== undefined) {
        queryClient.setQueryData(masteryKeys.defaults(), context.previousDefaults);
      }
    },
    onSettled: () => {
      if (!isLastPendingMutation(queryClient.isMutating({ mutationKey: masteryKeys.all }))) return;
      void queryClient.invalidateQueries({ queryKey: masteryKeys.defaults() });
    },
  });
}

// @FollowsBlueprint query-optimistic-mutation
export function useDeleteMasteryDefault() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: masteryKeys.all,
    mutationFn: async (variables: { memberId: string; instrumentId: string }) => {
      const response = await api.api.mastery.defaults[':memberId'][':instrumentId'].$delete({
        param: variables,
      });
      if (!response.ok) throw new ApiError(response.status, `delete ${response.status}`, null);
      return response.json();
    },
    onMutate: async (variables) => {
      const key = masteryKeys.defaults();
      await queryClient.cancelQueries({ queryKey: key });
      const previousDefaults = queryClient.getQueryData<MasteryDefaultsResponse>(key);
      queryClient.setQueryData<MasteryDefaultsResponse>(key, (old) => {
        if (old === undefined) return old;
        return {
          defaults: withoutMasteryDefault(old.defaults, variables.memberId, variables.instrumentId),
        };
      });
      return { previousDefaults };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousDefaults !== undefined) {
        queryClient.setQueryData(masteryKeys.defaults(), context.previousDefaults);
      }
    },
    onSettled: () => {
      if (!isLastPendingMutation(queryClient.isMutating({ mutationKey: masteryKeys.all }))) return;
      void queryClient.invalidateQueries({ queryKey: masteryKeys.defaults() });
    },
  });
}
