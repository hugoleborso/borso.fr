/**
 * Songs (catalog) feature queries / mutations. The external search
 * query (`useSongSearch`) is the MusicBrainz proxy; the caller passes
 * a debounced query and the `enabled` flag flips on once the user
 * has typed at least one non-blank character.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError, api } from '../api';

export const songKeys = {
  all: ['songs'] as const,
  list: () => [...songKeys.all, 'list'] as const,
  byId: (id: string) => [...songKeys.all, 'byId', id] as const,
  search: (query: string) => [...songKeys.all, 'search', query] as const,
};

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

export function useSong(id: string, enabled = true) {
  return useQuery({
    queryKey: songKeys.byId(id),
    queryFn: async () => {
      const response = await api.api.songs[':id'].$get({ param: { id } });
      if (!response.ok) throw new ApiError(response.status, `song ${response.status}`, null);
      return response.json();
    },
    enabled,
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
    mutationFn: async (variables: Parameters<typeof api.api.songs.$post>[0]['json']) => {
      const response = await api.api.songs.$post({ json: variables });
      if (!response.ok) throw new ApiError(response.status, `create ${response.status}`, null);
      return response.json();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: songKeys.all });
    },
  });
}

export function useUpdateSong() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      variables: { id: string } & Parameters<typeof api.api.songs[':id']['$put']>[0]['json'],
    ) => {
      const { id, ...rest } = variables;
      const response = await api.api.songs[':id'].$put({
        param: { id },
        json: rest,
      });
      if (!response.ok) throw new ApiError(response.status, `update ${response.status}`, null);
      return response.json();
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: songKeys.byId(variables.id) });
      void queryClient.invalidateQueries({ queryKey: songKeys.list() });
    },
  });
}

export function useDeleteSong() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (variables: { id: string }) => {
      const response = await api.api.songs[':id'].$delete({ param: { id: variables.id } });
      if (!response.ok) throw new ApiError(response.status, `delete ${response.status}`, null);
      return response.json();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: songKeys.all });
    },
  });
}
