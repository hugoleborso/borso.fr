/** @Feature studies */

import { useQuery } from '@tanstack/react-query';
import { ApiError, api } from '../api.client';

export const studyKeys = {
  all: ['studies'] as const,
  overview: () => [...studyKeys.all, 'overview'] as const,
  historyOf: (songId: string) => [...studyKeys.all, 'history', songId] as const,
  overridesOf: (songId: string) => [...studyKeys.all, 'overrides', songId] as const,
};

// @FollowsBlueprint query-module
export function useStudiesOverview() {
  return useQuery({
    queryKey: studyKeys.overview(),
    queryFn: async () => {
      const response = await api.api.studies.overview.$get();
      if (!response.ok) throw new ApiError(response.status, `studies ${response.status}`, null);
      return response.json();
    },
  });
}

export function useScoreHistoryOfSong(songId: string) {
  return useQuery({
    queryKey: studyKeys.historyOf(songId),
    queryFn: async () => {
      const response = await api.api.mastery.history[':songId'].$get({ param: { songId } });
      if (!response.ok) throw new ApiError(response.status, `history ${response.status}`, null);
      return response.json();
    },
  });
}

export function useMasteryOverridesOfSong(songId: string, isEnabled = true) {
  return useQuery({
    queryKey: studyKeys.overridesOf(songId),
    queryFn: async () => {
      const response = await api.api.mastery.overrides[':songId'].$get({ param: { songId } });
      if (!response.ok) throw new ApiError(response.status, `overrides ${response.status}`, null);
      return response.json();
    },
    enabled: isEnabled,
  });
}
