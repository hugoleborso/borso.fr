import { useQuery } from '@tanstack/react-query';
import { ApiError, api } from '../api.client';

export const freshnessKeys = {
  all: ['freshness'] as const,
  state: () => [...freshnessKeys.all, 'state'] as const,
};

// @FollowsBlueprint query-module
export function useFreshness() {
  return useQuery({
    queryKey: freshnessKeys.state(),
    queryFn: async () => {
      const response = await api.api.freshness.$get();
      if (!response.ok) {
        throw new ApiError(response.status, `freshness ${response.status}`, null);
      }
      return await response.json();
    },
  });
}
