/**
 * Setlist feature queries / mutations. The setlist is loaded by
 * `sessionId`; entries hang off the setlist's `id`.
 *
 * Every entry-level mutation is optimistic: `onMutate` snapshots the
 * `{ entries }` cache, applies a pure transform from
 * `setlists.utils.ts`, returns the snapshot as `context.previous`;
 * `onError` rolls back; `onSettled` invalidates so the server-issued
 * shape replaces the optimistic projection.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError, api } from '../api';
import { type EntriesCache, applyEntryPatch } from './setlists.utils';

interface OptimisticContext {
  readonly previous: EntriesCache | undefined;
}

function snapshotEntries(
  queryClient: ReturnType<typeof useQueryClient>,
  setlistId: string,
): EntriesCache | undefined {
  return queryClient.getQueryData<EntriesCache>(setlistKeys.entriesOf(setlistId));
}

export const setlistKeys = {
  all: ['setlists'] as const,
  bySessionId: (sessionId: string) => [...setlistKeys.all, 'bySession', sessionId] as const,
  entriesOf: (setlistId: string) => [...setlistKeys.all, 'entries', setlistId] as const,
};

export function useSetlistBySession(sessionId: string, enabled = true) {
  return useQuery({
    queryKey: setlistKeys.bySessionId(sessionId),
    queryFn: async () => {
      const response = await api.api.setlists['by-session'][':sessionId'].$get({
        param: { sessionId },
      });
      if (response.status === 404) return null;
      if (!response.ok) throw new ApiError(response.status, `setlist ${response.status}`, null);
      return response.json();
    },
    enabled,
  });
}

export function useSetlistEntries(setlistId: string, enabled = true) {
  return useQuery({
    queryKey: setlistKeys.entriesOf(setlistId),
    queryFn: async () => {
      const response = await api.api.setlists[':id'].entries.$get({
        param: { id: setlistId },
      });
      if (!response.ok) throw new ApiError(response.status, `entries ${response.status}`, null);
      return response.json();
    },
    enabled,
  });
}

export function useCreateSetlist() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (variables: { sessionId: string }) => {
      const response = await api.api.setlists.$post({ json: variables });
      if (!response.ok) throw new ApiError(response.status, `create ${response.status}`, null);
      return response.json();
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: setlistKeys.bySessionId(variables.sessionId),
      });
    },
  });
}

export function useAppendSetlistEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      variables: { setlistId: string } & Parameters<
        typeof api.api.setlists[':id']['entries']['$post']
      >[0]['json'],
    ) => {
      const { setlistId, ...rest } = variables;
      const response = await api.api.setlists[':id'].entries.$post({
        param: { id: setlistId },
        json: rest,
      });
      if (!response.ok) throw new ApiError(response.status, `append ${response.status}`, null);
      return response.json();
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: setlistKeys.entriesOf(variables.setlistId) });
    },
  });
}

export function useUpdateSetlistEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      variables: { setlistId: string; entryId: string } & Parameters<
        typeof api.api.setlists[':id']['entries'][':entryId']['$put']
      >[0]['json'],
    ) => {
      const { setlistId, entryId, ...rest } = variables;
      const response = await api.api.setlists[':id'].entries[':entryId'].$put({
        param: { id: setlistId, entryId },
        json: rest,
      });
      if (!response.ok) throw new ApiError(response.status, `update ${response.status}`, null);
      return response.json();
    },
    onMutate: async (variables): Promise<OptimisticContext> => {
      const key = setlistKeys.entriesOf(variables.setlistId);
      await queryClient.cancelQueries({ queryKey: key });
      const previous = snapshotEntries(queryClient, variables.setlistId);
      if (previous !== undefined) {
        const { setlistId: _setlistId, entryId, ...patch } = variables;
        queryClient.setQueryData<EntriesCache>(key, applyEntryPatch(previous, entryId, patch));
      }
      return { previous };
    },
    onError: (_error, variables, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData<EntriesCache>(
          setlistKeys.entriesOf(variables.setlistId),
          context.previous,
        );
      }
    },
    onSettled: (_data, _error, variables) => {
      void queryClient.invalidateQueries({ queryKey: setlistKeys.entriesOf(variables.setlistId) });
    },
  });
}

export function useDeleteSetlistEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (variables: { setlistId: string; entryId: string }) => {
      const response = await api.api.setlists[':id'].entries[':entryId'].$delete({
        param: { id: variables.setlistId, entryId: variables.entryId },
      });
      if (!response.ok) throw new ApiError(response.status, `delete ${response.status}`, null);
      return response.json();
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: setlistKeys.entriesOf(variables.setlistId) });
    },
  });
}

export function useReorderSetlist() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (variables: { setlistId: string; entryIds: string[] }) => {
      const response = await api.api.setlists[':id'].reorder.$put({
        param: { id: variables.setlistId },
        json: { entryIds: variables.entryIds },
      });
      if (!response.ok) throw new ApiError(response.status, `reorder ${response.status}`, null);
      return response.json();
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: setlistKeys.entriesOf(variables.setlistId) });
    },
  });
}
