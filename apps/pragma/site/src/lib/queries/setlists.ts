/**
 * Setlist feature queries / mutations. The setlist is loaded by
 * `sessionId`; entries hang off the setlist's `id`.
 *
 * Every entry-level mutation is optimistic: `onMutate` snapshots the
 * `{ entries }` cache, applies a pure transform from
 * `setlists.utils.ts`, returns the snapshot as `context.previous`;
 * `onError` rolls back. `onSettled` reconciles with the server, but
 * only once the entry-mutation family has drained (see
 * `optimistic.utils.ts`) — otherwise a refetch from an early tick
 * (energy-slider drag, rapid reorder) lands after a later optimistic
 * write and snaps it back.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError, api } from '../api';
import { isLastPendingMutation } from './optimistic.utils';
import {
  appendOptimisticEntry,
  applyEntryPatch,
  type EntriesCache,
  removeEntryById,
  reorderEntriesByIds,
} from './setlists.utils';

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

const ENTRY_MUTATION_KEY = [...setlistKeys.all, 'entry-mutation'] as const;

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

/**
 * `onMutate` intentionally absent: the caller awaits `mutateAsync(...)`
 * to read the server-issued `setlist.id` before navigating to the
 * editor, so a temp-id optimistic record would block on the entries
 * fetch (404) until the real id arrives. The latency is bounded by the
 * single round-trip; optimistic doesn't improve perceived UX here.
 */
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
    mutationKey: ENTRY_MUTATION_KEY,
    mutationFn: async (
      variables: { setlistId: string; optimisticId: string } & Parameters<
        (typeof api.api.setlists)[':id']['entries']['$post']
      >[0]['json'],
    ) => {
      const { setlistId, optimisticId: _optimisticId, ...rest } = variables;
      const response = await api.api.setlists[':id'].entries.$post({
        param: { id: setlistId },
        json: rest,
      });
      if (!response.ok) throw new ApiError(response.status, `append ${response.status}`, null);
      return response.json();
    },
    onMutate: async (variables): Promise<OptimisticContext> => {
      const key = setlistKeys.entriesOf(variables.setlistId);
      await queryClient.cancelQueries({ queryKey: key });
      const previous = snapshotEntries(queryClient, variables.setlistId);
      if (previous !== undefined) {
        queryClient.setQueryData<EntriesCache>(
          key,
          appendOptimisticEntry(previous, {
            id: variables.optimisticId,
            songId: variables.songId,
            energy: variables.energy,
            keyOverride: variables.keyOverride,
            capo: variables.capo,
            notes: variables.notes,
            lineupOverride: variables.lineupOverride,
          }),
        );
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
      if (!isLastPendingMutation(queryClient.isMutating({ mutationKey: ENTRY_MUTATION_KEY }))) {
        return;
      }
      void queryClient.invalidateQueries({ queryKey: setlistKeys.entriesOf(variables.setlistId) });
    },
  });
}

export function useUpdateSetlistEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ENTRY_MUTATION_KEY,
    mutationFn: async (
      variables: { setlistId: string; entryId: string } & Parameters<
        (typeof api.api.setlists)[':id']['entries'][':entryId']['$put']
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
      if (!isLastPendingMutation(queryClient.isMutating({ mutationKey: ENTRY_MUTATION_KEY }))) {
        return;
      }
      void queryClient.invalidateQueries({ queryKey: setlistKeys.entriesOf(variables.setlistId) });
    },
  });
}

export function useDeleteSetlistEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ENTRY_MUTATION_KEY,
    mutationFn: async (variables: { setlistId: string; entryId: string }) => {
      const response = await api.api.setlists[':id'].entries[':entryId'].$delete({
        param: { id: variables.setlistId, entryId: variables.entryId },
      });
      if (!response.ok) throw new ApiError(response.status, `delete ${response.status}`, null);
      return response.json();
    },
    onMutate: async (variables): Promise<OptimisticContext> => {
      const key = setlistKeys.entriesOf(variables.setlistId);
      await queryClient.cancelQueries({ queryKey: key });
      const previous = snapshotEntries(queryClient, variables.setlistId);
      if (previous !== undefined) {
        queryClient.setQueryData<EntriesCache>(key, removeEntryById(previous, variables.entryId));
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
      if (!isLastPendingMutation(queryClient.isMutating({ mutationKey: ENTRY_MUTATION_KEY }))) {
        return;
      }
      void queryClient.invalidateQueries({ queryKey: setlistKeys.entriesOf(variables.setlistId) });
    },
  });
}

export function useReorderSetlist() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ENTRY_MUTATION_KEY,
    mutationFn: async (variables: { setlistId: string; entryIds: string[] }) => {
      const response = await api.api.setlists[':id'].reorder.$put({
        param: { id: variables.setlistId },
        json: { entryIds: variables.entryIds },
      });
      if (!response.ok) throw new ApiError(response.status, `reorder ${response.status}`, null);
      return response.json();
    },
    onMutate: async (variables): Promise<OptimisticContext> => {
      const key = setlistKeys.entriesOf(variables.setlistId);
      await queryClient.cancelQueries({ queryKey: key });
      const previous = snapshotEntries(queryClient, variables.setlistId);
      if (previous !== undefined) {
        queryClient.setQueryData<EntriesCache>(
          key,
          reorderEntriesByIds(previous, variables.entryIds),
        );
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
    // Deliberately no `onSettled` refetch. A reorder's optimistic cache
    // already holds the complete, correct order (every entry id + its new
    // position) and the PUT returns 200, so a refetch adds no data — it
    // only risks reverting the UI: an immediate GET after the PUT can land
    // on a different Lambda/DSQL connection and read a pre-commit snapshot
    // (Aurora DSQL read-after-write visibility lags across connections),
    // overwriting the correct optimistic order with the stale one. Any
    // later entries refetch reconciles once the write has propagated;
    // genuine failures roll back via `onError`.
  });
}
