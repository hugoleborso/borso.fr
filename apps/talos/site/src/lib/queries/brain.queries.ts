import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { ApiError, api } from '../api.client';

const GRAPH_STALE_TIME_MS = 300_000;

export const brainKeys = {
  all: ['brain'] as const,
  search: (query: string) => [...brainKeys.all, 'search', query] as const,
  page: (path: string) => [...brainKeys.all, 'page', path] as const,
  graph: (date: string) => [...brainKeys.all, 'graph', date] as const,
};

// @FollowsBlueprint query-module
export function useBrainSearch(query: string, isEnabled: boolean) {
  return useQuery({
    queryKey: brainKeys.search(query),
    queryFn: async () => {
      const response = await api.api.search.$get({ query: { q: query } });
      if (!response.ok) throw new ApiError(response.status, `search ${response.status}`, null);
      return await response.json();
    },
    enabled: isEnabled,
    placeholderData: keepPreviousData,
  });
}

export function usePage(path: string) {
  return useQuery({
    queryKey: brainKeys.page(path),
    queryFn: async () => {
      const response = await api.api.pages[':path{.+}'].$get({ param: { path } });
      if (!response.ok) throw new ApiError(response.status, `page ${response.status}`, null);
      return await response.json();
    },
    retry: false,
  });
}

export function useGraph(date: string) {
  return useQuery({
    queryKey: brainKeys.graph(date),
    queryFn: async () => {
      const response = await api.api.graph.$get({ query: { date } });
      if (!response.ok) throw new ApiError(response.status, `graph ${response.status}`, null);
      return await response.json();
    },
    placeholderData: keepPreviousData,
    staleTime: GRAPH_STALE_TIME_MS,
  });
}
