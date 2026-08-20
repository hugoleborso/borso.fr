/**
 * The entries of one setlist: the songs, their order, and everything
 * written on each of them. The setlist itself is read and written next
 * door in `setlists.queries.ts`.
 *
 * Every mutation here is optimistic: `onMutate` snapshots the
 * `{ entries }` cache, applies a pure transform from
 * `setlists.utils.ts`, returns the snapshot as `context.previous`;
 * `onError` rolls back.
 *
 * **Only the append refetches.** It is the one write here whose result the
 * client does not already hold — the server names the new entry's id. A patch,
 * a delete and a reorder are each fully determined by the request, so the
 * optimistic cache is already the answer and a `GET` can only be worse than
 * it: an immediate read after the write can land on a different Lambda and
 * DSQL connection and see a pre-commit snapshot, overwriting correct state
 * with stale state (Aurora DSQL read-after-write visibility is per
 * connection). Any later entries fetch reconciles once the write has
 * propagated, and a genuine failure rolls back through `onError`. See
 * docs/dantotsus/optimistic-reorder-reverted-by-stale-dsql-read.md.
 *
 * The append's own refetch waits for the entry-mutation family to drain (see
 * `optimistic.utils.ts`), because a refetch from an early tick otherwise lands
 * after a later optimistic write and snaps it back.
 * @Feature setlists
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError, api, isResponseSuccessful } from '../api.client';
import { isLastPendingMutation } from './optimistic.utils';
import { setlistKeys } from './setlists.queries';
import {
  appendOptimisticEntry,
  applyEntryPatch,
  type EntriesCache,
  removeEntryById,
  reorderEntriesByIds,
  toEntryPatch,
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

const ENTRY_MUTATION_KEY = [...setlistKeys.all, 'entry-mutation'] as const;

export function useSetlistEntries(setlistId: string, isEnabled = true) {
  return useQuery({
    queryKey: setlistKeys.entriesOf(setlistId),
    queryFn: async () => {
      const response = await api.api.setlists[':id'].entries.$get({
        param: { id: setlistId },
      });
      if (!response.ok) throw new ApiError(response.status, `entries ${response.status}`, null);
      return response.json();
    },
    enabled: isEnabled,
  });
}

// @FollowsBlueprint query-optimistic-mutation
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
      if (!isResponseSuccessful(response))
        throw new ApiError(response.status, `append ${response.status}`, null);
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

/**
 * What one setlist row may change about itself, derived from the endpoint that
 * stores it. The components that carry a patch from a field up to the mutation
 * pass this rather than a bag of unknowns, so a key the API does not accept is
 * a type error where the field is written rather than a 400 in the browser.
 */
export type SetlistEntryPatch = Parameters<
  (typeof api.api.setlists)[':id']['entries'][':entryId']['$put']
>[0]['json'];

// @FollowsBlueprint query-optimistic-mutation
export function useUpdateSetlistEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ENTRY_MUTATION_KEY,
    mutationFn: async (variables: { setlistId: string; entryId: string } & SetlistEntryPatch) => {
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
        queryClient.setQueryData<EntriesCache>(
          key,
          applyEntryPatch(previous, entryId, toEntryPatch(patch)),
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
  });
}

// @FollowsBlueprint query-optimistic-mutation
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
  });
}

// @FollowsBlueprint query-optimistic-mutation
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
