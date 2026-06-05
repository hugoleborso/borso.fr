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
import { ApiError, api } from '../api';

export const masteryKeys = {
  all: ['mastery'] as const,
  defaults: () => [...masteryKeys.all, 'defaults'] as const,
  overridesOf: (songId: string) => [...masteryKeys.all, 'overrides', songId] as const,
};

type MasteryDefaultsResponse = InferResponseType<typeof api.api.mastery.defaults.$get>;
type MasteryDefaultRow = MasteryDefaultsResponse['defaults'][number];

function upsertDefault(rows: MasteryDefaultRow[], next: MasteryDefaultRow): MasteryDefaultRow[] {
  let hit = false;
  const merged = rows.map((row) => {
    if (row.memberId === next.memberId && row.instrumentId === next.instrumentId) {
      hit = true;
      return next;
    }
    return row;
  });
  return hit ? merged : [...merged, next];
}

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
    onMutate: async (variables) => {
      const key = masteryKeys.defaults();
      await queryClient.cancelQueries({ queryKey: key });
      const previousDefaults = queryClient.getQueryData<MasteryDefaultsResponse>(key);
      queryClient.setQueryData<MasteryDefaultsResponse>(key, (old) => {
        if (old === undefined) return old;
        return { defaults: upsertDefault(old.defaults, variables) };
      });
      return { previousDefaults };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousDefaults !== undefined) {
        queryClient.setQueryData(masteryKeys.defaults(), context.previousDefaults);
      }
    },
    onSettled: () => {
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
    onMutate: async (variables) => {
      const key = masteryKeys.defaults();
      await queryClient.cancelQueries({ queryKey: key });
      const previousDefaults = queryClient.getQueryData<MasteryDefaultsResponse>(key);
      queryClient.setQueryData<MasteryDefaultsResponse>(key, (old) => {
        if (old === undefined) return old;
        return {
          defaults: old.defaults.filter(
            (row) =>
              !(row.memberId === variables.memberId && row.instrumentId === variables.instrumentId),
          ),
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
      void queryClient.invalidateQueries({ queryKey: masteryKeys.defaults() });
    },
  });
}
