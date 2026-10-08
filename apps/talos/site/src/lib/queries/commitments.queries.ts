import { useQuery } from '@tanstack/react-query';
import { ApiError, api } from '../api.client';

export const commitmentKeys = {
  all: ['commitments'] as const,
  open: () => [...commitmentKeys.all, 'open'] as const,
};

// @FollowsBlueprint query-module
export function useOpenCommitments() {
  return useQuery({
    queryKey: commitmentKeys.open(),
    queryFn: async () => {
      const response = await api.api.commitments.$get();
      if (!response.ok) {
        throw new ApiError(response.status, `commitments ${response.status}`, null);
      }
      return await response.json();
    },
  });
}
