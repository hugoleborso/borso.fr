/** @Feature setlists */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError, api, isResponseSuccessful } from '../api.client';
import {
  appendSetlistToCache,
  applySessionLinkInCache,
  type MinimalSetlistSummary,
  removeSetlistFromCache,
  renameSetlistInCache,
  type SetlistsCache,
} from './setlists.utils';

export const setlistKeys = {
  all: ['setlists'] as const,
  list: () => [...setlistKeys.all, 'list'] as const,
  bySession: () => [...setlistKeys.all, 'bySession'] as const,
  bySessionId: (sessionId: string) => [...setlistKeys.bySession(), sessionId] as const,
  detail: (setlistId: string) => [...setlistKeys.all, 'detail', setlistId] as const,
  entriesOf: (setlistId: string) => [...setlistKeys.all, 'entries', setlistId] as const,
  creation: () => [...setlistKeys.all, 'creation'] as const,
};

export type SetlistSummary = MinimalSetlistSummary;

const MISSING_STATUS = 404;

async function fetchSetlists() {
  const response = await api.api.setlists.$get();
  if (!response.ok) throw new ApiError(response.status, `setlists ${response.status}`, null);
  return response.json();
}

async function fetchSetlistsOfSession(sessionId: string) {
  const response = await api.api.setlists['by-session'][':sessionId'].$get({
    param: { sessionId },
  });
  if (!response.ok) throw new ApiError(response.status, `setlists ${response.status}`, null);
  return response.json();
}

export function useSetlistsList() {
  return useQuery({ queryKey: setlistKeys.list(), queryFn: fetchSetlists });
}

export function useSetlistsBySession(sessionId: string, isEnabled = true) {
  return useQuery({
    queryKey: setlistKeys.bySessionId(sessionId),
    queryFn: () => fetchSetlistsOfSession(sessionId),
    enabled: isEnabled,
  });
}

export function useSetlist(setlistId: string, isEnabled = true) {
  return useQuery({
    queryKey: setlistKeys.detail(setlistId),
    queryFn: async () => {
      const response = await api.api.setlists[':id'].$get({ param: { id: setlistId } });
      if (!response.ok) throw new ApiError(response.status, `setlist ${response.status}`, null);
      return response.json();
    },
    enabled: isEnabled,
  });
}

type QueryClient = ReturnType<typeof useQueryClient>;
type SummaryTransform = (cache: SetlistsCache) => SetlistsCache;

function updateListCache(queryClient: QueryClient, transform: SummaryTransform): void {
  queryClient.setQueryData<SetlistsCache>(setlistKeys.list(), (cache) =>
    cache === undefined ? cache : transform(cache),
  );
}

function updateEverySessionCache(queryClient: QueryClient, transform: SummaryTransform): void {
  queryClient.setQueriesData<SetlistsCache>({ queryKey: setlistKeys.bySession() }, (cache) =>
    cache === undefined ? cache : transform(cache),
  );
}

function updateSessionCache(
  queryClient: QueryClient,
  sessionId: string,
  transform: SummaryTransform,
): void {
  queryClient.setQueryData<SetlistsCache>(setlistKeys.bySessionId(sessionId), (cache) =>
    cache === undefined ? cache : transform(cache),
  );
}

interface SummaryCaches {
  readonly list: SetlistsCache | undefined;
  readonly bySession: readonly (readonly [readonly unknown[], SetlistsCache | undefined])[];
}

async function snapshotSummaryCaches(queryClient: QueryClient): Promise<SummaryCaches> {
  await queryClient.cancelQueries({ queryKey: setlistKeys.list() });
  await queryClient.cancelQueries({ queryKey: setlistKeys.bySession() });
  return {
    list: queryClient.getQueryData<SetlistsCache>(setlistKeys.list()),
    bySession: queryClient.getQueriesData<SetlistsCache>({ queryKey: setlistKeys.bySession() }),
  };
}

function restoreSummaryCaches(queryClient: QueryClient, snapshot: SummaryCaches): void {
  queryClient.setQueryData(setlistKeys.list(), snapshot.list);
  for (const [key, cache] of snapshot.bySession) queryClient.setQueryData(key, cache);
}

/**
 * @Blueprint query-pessimistic-mutation
 * @BlueprintName Pessimistic Mutation
 * @BlueprintUsage Use for a write whose result the client cannot predict, such as an insert the caller reads an identifier back from.
 * @BlueprintDescription Holds no `onMutate` and no rollback, and writes the row the response carries into the affected keys in `onSuccess`, so the caller sees the record it just created without a second read the write's own answer already contains. The header states why the optimistic path is refused here, which is the part a reader needs, because the absence of a snapshot otherwise looks like an omission rather than a decision.
 */
export function useCreateSetlist() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: setlistKeys.creation(),
    mutationFn: async (variables: { name: string; sessionId: string | null }) => {
      const response = await api.api.setlists.$post({ json: variables });
      if (response.status === MISSING_STATUS || !isResponseSuccessful(response))
        throw new ApiError(response.status, `create ${response.status}`, null);
      return await response.json();
    },
    onSuccess: (data, variables) => {
      queryClient.setQueryData(setlistKeys.detail(data.setlist.id), data);
      const created: SetlistSummary = {
        id: data.setlist.id,
        name: data.setlist.name,
        songCount: 0,
        sessionIds: variables.sessionId === null ? [] : [variables.sessionId],
      };
      updateListCache(queryClient, (cache) => appendSetlistToCache(cache, created));
      if (variables.sessionId !== null) {
        updateSessionCache(queryClient, variables.sessionId, (cache) =>
          appendSetlistToCache(cache, created),
        );
      }
    },
  });
}

// @FollowsBlueprint query-optimistic-mutation
export function useRenameSetlist() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (variables: { setlistId: string; name: string }) => {
      const response = await api.api.setlists[':id'].$put({
        param: { id: variables.setlistId },
        json: { name: variables.name },
      });
      if (response.status === MISSING_STATUS || !response.ok)
        throw new ApiError(response.status, `rename ${response.status}`, null);
      return response.json();
    },
    onMutate: async (variables) => {
      const previous = await snapshotSummaryCaches(queryClient);
      const rename: SummaryTransform = (cache) =>
        renameSetlistInCache(cache, variables.setlistId, variables.name);
      updateListCache(queryClient, rename);
      updateEverySessionCache(queryClient, rename);
      return { previous };
    },
    onSuccess: (data, variables) => {
      queryClient.setQueryData(setlistKeys.detail(variables.setlistId), data);
    },
    onError: (_error, _variables, context) => {
      if (context !== undefined) restoreSummaryCaches(queryClient, context.previous);
    },
  });
}

// @FollowsBlueprint query-optimistic-mutation
export function useDeleteSetlist() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (variables: { setlistId: string }) => {
      const response = await api.api.setlists[':id'].$delete({
        param: { id: variables.setlistId },
      });
      if (!response.ok) throw new ApiError(response.status, `delete ${response.status}`, null);
      return response.json();
    },
    onMutate: async (variables) => {
      const previous = await snapshotSummaryCaches(queryClient);
      const remove: SummaryTransform = (cache) =>
        removeSetlistFromCache(cache, variables.setlistId);
      updateListCache(queryClient, remove);
      updateEverySessionCache(queryClient, remove);
      queryClient.removeQueries({ queryKey: setlistKeys.detail(variables.setlistId) });
      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context !== undefined) restoreSummaryCaches(queryClient, context.previous);
    },
  });
}

// @FollowsBlueprint query-optimistic-mutation
export function useLinkSetlistToSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (variables: { setlist: SetlistSummary; sessionId: string }) => {
      const response = await api.api.setlists[':id'].sessions.$post({
        param: { id: variables.setlist.id },
        json: { sessionId: variables.sessionId },
      });
      if (!isResponseSuccessful(response))
        throw new ApiError(response.status, `link ${response.status}`, null);
      return response.json();
    },
    onMutate: async (variables) => {
      const previous = await snapshotSummaryCaches(queryClient);
      updateSessionCache(queryClient, variables.sessionId, (cache) =>
        appendSetlistToCache(cache, variables.setlist),
      );
      updateListCache(queryClient, (cache) =>
        applySessionLinkInCache(cache, variables.setlist.id, variables.sessionId, true),
      );
      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context !== undefined) restoreSummaryCaches(queryClient, context.previous);
    },
  });
}

// @FollowsBlueprint query-optimistic-mutation
export function useUnlinkSetlistFromSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (variables: { setlistId: string; sessionId: string }) => {
      const response = await api.api.setlists[':id'].sessions[':sessionId'].$delete({
        param: { id: variables.setlistId, sessionId: variables.sessionId },
      });
      if (!response.ok) throw new ApiError(response.status, `unlink ${response.status}`, null);
      return response.json();
    },
    onMutate: async (variables) => {
      const previous = await snapshotSummaryCaches(queryClient);
      updateSessionCache(queryClient, variables.sessionId, (cache) =>
        removeSetlistFromCache(cache, variables.setlistId),
      );
      updateListCache(queryClient, (cache) =>
        applySessionLinkInCache(cache, variables.setlistId, variables.sessionId, false),
      );
      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context !== undefined) restoreSummaryCaches(queryClient, context.previous);
    },
  });
}
