/**
 * Songs (catalog) feature queries / mutations. The external search
 * query (`useSongSearch`) is the MusicBrainz proxy; the caller passes
 * a debounced query and the `enabled` flag flips on once the user
 * has typed at least one non-blank character.
 *
 * Every cache-touching mutation is optimistic (round 17c): the
 * `onMutate` snapshot is rolled back in `onError`, and `onSettled`
 * invalidates to reconcile with the server-issued row (replacing the
 * temporary id on create, syncing server-defaulted fields on update).
 * @Feature songs
 */

import { useMutation, useMutationState, useQuery, useQueryClient } from '@tanstack/react-query';
import type { InferResponseType } from 'hono/client';
import { ApiError, api, isResponseSuccessful } from '../api.client';
import { isLastPendingMutation, replaceEntityById } from './optimistic.utils';
import { buildOptimisticSong, mergeSongUpdate } from './song-cache.core';
import { didLastSongWriteFail, selectSongThatLostItsLastWrite } from './song-write-failure.core';

export const songKeys = {
  all: ['songs'] as const,
  list: () => [...songKeys.all, 'list'] as const,
  byId: (id: string) => [...songKeys.all, 'byId', id] as const,
  search: (query: string) => [...songKeys.all, 'search', query] as const,
};

type SongsListResponse = InferResponseType<typeof api.api.songs.$get>;
type SongByIdResponse = InferResponseType<(typeof api.api.songs)[':id']['$get']>;
type SongCreateVariables = Parameters<typeof api.api.songs.$post>[0]['json'];
type SongUpdateVariables = { id: string } & Parameters<
  (typeof api.api.songs)[':id']['$put']
>[0]['json'];

/**
 * @Blueprint query-module
 * @BlueprintName Query Module
 * @BlueprintUsage Use for every call from a front end to its own API. One module per domain, holding the key factory and the hooks.
 * @BlueprintDescription Declares the song query keys in one typed factory so no caller invents a key, and wraps each call in useQuery or useMutation over the Hono client, so the request and response types come from the API router type rather than a hand-written fetcher. Mutations reconcile from the mutation response and roll back in onError.
 */
export function useSongsList() {
  return useQuery({
    queryKey: songKeys.list(),
    queryFn: async () => {
      const response = await api.api.songs.$get();
      if (!response.ok) throw new ApiError(response.status, `songs ${response.status}`, null);
      return response.json();
    },
  });
}

export function useSong(id: string, isEnabled = true) {
  return useQuery({
    queryKey: songKeys.byId(id),
    queryFn: async () => {
      const response = await api.api.songs[':id'].$get({ param: { id } });
      if (!response.ok) throw new ApiError(response.status, `song ${response.status}`, null);
      return response.json();
    },
    enabled: isEnabled,
  });
}

export function useSongSearch(query: string) {
  return useQuery({
    queryKey: songKeys.search(query),
    queryFn: async () => {
      const response = await api.api.songs.search.$get({ query: { q: query } });
      if (!response.ok) throw new ApiError(response.status, `search ${response.status}`, null);
      return response.json();
    },
    enabled: query.trim().length > 0,
  });
}

/**
 * @Blueprint query-optimistic-mutation
 * @BlueprintName Optimistic Mutation
 * @BlueprintUsage Use for a write whose new state the client can predict, so the change shows before the server answers.
 * @BlueprintDescription Cancels the in flight reads for the key, snapshots the list cache, writes the predicted row, and returns the snapshot as the mutation context so `onError` can put it back verbatim. `onSettled` invalidates only once `isLastPendingMutation` reports the family has drained, which stops a refetch from an early write landing after a later optimistic one and snapping the user interface back.
 */
export function useCreateSong() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: songKeys.all,
    mutationFn: async (variables: SongCreateVariables) => {
      const response = await api.api.songs.$post({ json: variables });
      if (!isResponseSuccessful(response))
        throw new ApiError(response.status, `create ${response.status}`, null);
      return response.json();
    },
    onMutate: async (variables) => {
      const listKey = songKeys.list();
      await queryClient.cancelQueries({ queryKey: listKey });
      const previousList = queryClient.getQueryData<SongsListResponse>(listKey);
      const temporaryId = crypto.randomUUID();
      queryClient.setQueryData<SongsListResponse>(listKey, (old) => {
        if (old === undefined) return old;
        return {
          songs: [
            buildOptimisticSong(temporaryId, new Date().toISOString(), variables),
            ...old.songs,
          ],
        };
      });
      return { previousList };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousList !== undefined) {
        queryClient.setQueryData(songKeys.list(), context.previousList);
      }
    },
    onSettled: () => {
      if (!isLastPendingMutation(queryClient.isMutating({ mutationKey: songKeys.all }))) return;
      void queryClient.invalidateQueries({ queryKey: songKeys.all });
    },
  });
}

// @FollowsBlueprint query-optimistic-mutation
export function useUpdateSong() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: songKeys.all,
    mutationFn: async (variables: SongUpdateVariables) => {
      const { id, ...rest } = variables;
      const response = await api.api.songs[':id'].$put({
        param: { id },
        json: rest,
      });
      if (!response.ok) throw new ApiError(response.status, `update ${response.status}`, null);
      return response.json();
    },
    onMutate: async (variables) => {
      const listKey = songKeys.list();
      const byIdKey = songKeys.byId(variables.id);
      await queryClient.cancelQueries({ queryKey: listKey });
      await queryClient.cancelQueries({ queryKey: byIdKey });
      const previousList = queryClient.getQueryData<SongsListResponse>(listKey);
      const previousById = queryClient.getQueryData<SongByIdResponse>(byIdKey);
      const { id, ...patch } = variables;
      queryClient.setQueryData<SongsListResponse>(listKey, (old) => {
        if (old === undefined) return old;
        return {
          songs: replaceEntityById(old.songs, id, (song) => mergeSongUpdate(song, patch)),
        };
      });
      queryClient.setQueryData<SongByIdResponse>(byIdKey, (old) => {
        if (old === undefined) return old;
        if (!('song' in old)) return old;
        return { song: mergeSongUpdate(old.song, patch) };
      });
      return { previousList, previousById };
    },
    onError: (_err, variables, context) => {
      if (context?.previousList !== undefined) {
        queryClient.setQueryData(songKeys.list(), context.previousList);
      }
      if (context?.previousById !== undefined) {
        queryClient.setQueryData(songKeys.byId(variables.id), context.previousById);
      }
    },
    onSettled: (_data, _err, variables) => {
      if (!isLastPendingMutation(queryClient.isMutating({ mutationKey: songKeys.all }))) return;
      void queryClient.invalidateQueries({ queryKey: songKeys.byId(variables.id) });
      void queryClient.invalidateQueries({ queryKey: songKeys.list() });
    },
  });
}

/**
 * Whether the last write aimed at this song failed, so a page showing the song
 * can say the values it renders are the ones `onError` put back.
 */
export function useDidLastSongWriteFail(songId: string): boolean {
  return didLastSongWriteFail(useSongWrites(), songId);
}

/**
 * The song that lost its last write, for a page listing many of them. A delete
 * is fired and the operator leaves immediately, so the catalog is where a
 * failed one has to be reported: the row comes back on rollback, which is
 * visible but says nothing about why.
 */
export function useSongThatLostItsLastWrite(): string | null {
  return selectSongThatLostItsLastWrite(useSongWrites());
}

function useSongWrites() {
  return useMutationState({
    filters: { mutationKey: songKeys.all },
    select: (mutation) => ({
      variables: mutation.state.variables,
      status: mutation.state.status,
    }),
  });
}

// @FollowsBlueprint query-optimistic-mutation
export function useDeleteSong() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: songKeys.all,
    mutationFn: async (variables: { id: string }) => {
      const response = await api.api.songs[':id'].$delete({ param: { id: variables.id } });
      if (!response.ok) throw new ApiError(response.status, `delete ${response.status}`, null);
      return response.json();
    },
    onMutate: async (variables) => {
      const listKey = songKeys.list();
      await queryClient.cancelQueries({ queryKey: listKey });
      const previousList = queryClient.getQueryData<SongsListResponse>(listKey);
      queryClient.setQueryData<SongsListResponse>(listKey, (old) => {
        if (old === undefined) return old;
        return { songs: old.songs.filter((song) => song.id !== variables.id) };
      });
      return { previousList };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousList !== undefined) {
        queryClient.setQueryData(songKeys.list(), context.previousList);
      }
    },
    onSettled: () => {
      if (!isLastPendingMutation(queryClient.isMutating({ mutationKey: songKeys.all }))) return;
      void queryClient.invalidateQueries({ queryKey: songKeys.all });
    },
  });
}
