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
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { InferResponseType } from 'hono/client';
import { ApiError, api, isResponseSuccessful } from '../api';
import { isLastPendingMutation, replaceEntityById } from './optimistic.utils';

export const songKeys = {
  all: ['songs'] as const,
  list: () => [...songKeys.all, 'list'] as const,
  byId: (id: string) => [...songKeys.all, 'byId', id] as const,
  search: (query: string) => [...songKeys.all, 'search', query] as const,
};

type SongsListResponse = InferResponseType<typeof api.api.songs.$get>;
type SongByIdResponse = InferResponseType<(typeof api.api.songs)[':id']['$get']>;
type SongRow = SongsListResponse['songs'][number];
type SongCreateVariables = Parameters<typeof api.api.songs.$post>[0]['json'];
type SongUpdateVariables = { id: string } & Parameters<
  (typeof api.api.songs)[':id']['$put']
>[0]['json'];

const NEW_SONG_DEFAULTS: Pick<
  SongRow,
  | 'artist'
  | 'links'
  | 'chart'
  | 'tonalityStart'
  | 'tonalityEnd'
  | 'defaultLineup'
  | 'baseEnergy'
  | 'mbid'
  | 'album'
  | 'durationSeconds'
  | 'isrcs'
  | 'tags'
> = {
  artist: '',
  links: [],
  chart: null,
  tonalityStart: null,
  tonalityEnd: null,
  defaultLineup: {},
  baseEnergy: null,
  mbid: null,
  album: null,
  durationSeconds: null,
  isrcs: [],
  tags: [],
};

function normaliseLinks(links: SongCreateVariables['links']): SongRow['links'] {
  if (links === undefined) return [];
  return links.map((link) => ({
    url: link.url,
    provider: link.provider,
    comment: link.comment ?? '',
  }));
}

function buildOptimisticSong(id: string, input: SongCreateVariables): SongRow {
  const createdAt = new Date().toISOString();
  const { links: inputLinks, ...rest } = input;
  return {
    ...NEW_SONG_DEFAULTS,
    ...rest,
    links: normaliseLinks(inputLinks),
    id,
    createdAt,
  };
}

function mergeSongUpdate(existing: SongRow, patch: Omit<SongUpdateVariables, 'id'>): SongRow {
  const { links: patchLinks, ...rest } = patch;
  const merged: SongRow = { ...existing, ...rest };
  if (patchLinks !== undefined) merged.links = normaliseLinks(patchLinks);
  return merged;
}

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
        return { songs: [buildOptimisticSong(temporaryId, variables), ...old.songs] };
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
