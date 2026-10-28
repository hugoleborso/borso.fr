/** @Feature setlists */

import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError, api, isResponseSuccessful } from '../api.client';
import { setlistKeys } from './setlists.queries';
import {
  appendOptimisticSongs,
  applyEntryPatch,
  type EntriesCache,
  type OptimisticSongAppend,
  removeEntryById,
  reorderEntriesByIds,
  settleAppendedEntries,
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

async function fetchSetlistEntries(setlistId: string) {
  const response = await api.api.setlists[':id'].entries.$get({
    param: { id: setlistId },
  });
  if (!response.ok) throw new ApiError(response.status, `entries ${response.status}`, null);
  return response.json();
}

export function useSetlistEntries(setlistId: string, isEnabled = true) {
  return useQuery({
    queryKey: setlistKeys.entriesOf(setlistId),
    queryFn: () => fetchSetlistEntries(setlistId),
    enabled: isEnabled,
  });
}

export function useEntriesOfSetlists(setlistIds: readonly string[]) {
  return useQueries({
    queries: setlistIds.map((setlistId) => ({
      queryKey: setlistKeys.entriesOf(setlistId),
      queryFn: () => fetchSetlistEntries(setlistId),
    })),
    combine: (results) => ({
      entriesBySetlistId: Object.fromEntries(
        setlistIds.map((setlistId, index) => [setlistId, results[index]?.data?.entries ?? []]),
      ),
      isLoading: results.some((result) => result.isLoading),
    }),
  });
}

export interface AddSetlistEntriesVariables {
  readonly setlistId: string;
  readonly appends: readonly OptimisticSongAppend[];
}

// @FollowsBlueprint query-optimistic-insert
export function useAddSetlistEntries() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ENTRY_MUTATION_KEY,
    mutationFn: async (variables: AddSetlistEntriesVariables) => {
      const response = await api.api.setlists[':id'].entries.batch.$post({
        param: { id: variables.setlistId },
        json: { songIds: variables.appends.map((append) => append.songId) },
      });
      if (!isResponseSuccessful(response))
        throw new ApiError(response.status, `add ${response.status}`, null);
      return response.json();
    },
    onMutate: async (variables): Promise<OptimisticContext> => {
      const key = setlistKeys.entriesOf(variables.setlistId);
      await queryClient.cancelQueries({ queryKey: key });
      const previous = snapshotEntries(queryClient, variables.setlistId);
      if (previous !== undefined) {
        queryClient.setQueryData<EntriesCache>(
          key,
          appendOptimisticSongs(previous, variables.appends),
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
    onSuccess: (data, variables) => {
      queryClient.setQueryData<EntriesCache>(setlistKeys.entriesOf(variables.setlistId), (cache) =>
        cache === undefined
          ? cache
          : settleAppendedEntries(
              cache,
              variables.appends.map((append) => append.temporaryId),
              data.entries,
            ),
      );
    },
  });
}

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
  });
}
