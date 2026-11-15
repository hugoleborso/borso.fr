/** @Feature studies */

import { useQuery } from '@tanstack/react-query';
import { ApiError, api } from '../api.client';

export const studyKeys = {
  all: ['studies'] as const,
  overview: () => [...studyKeys.all, 'overview'] as const,
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
