import { useQuery } from '@tanstack/react-query';
import { ApiError, api } from '../api.client';

export const relationKeys = {
  all: ['relations'] as const,
  digest: () => [...relationKeys.all, 'digest'] as const,
};

// @FollowsBlueprint query-module
export function useRelations() {
  return useQuery({
    queryKey: relationKeys.digest(),
    queryFn: async () => {
      const response = await api.api.relations.$get();
      if (!response.ok) throw new ApiError(response.status, `relations ${response.status}`, null);
      return await response.json();
    },
  });
}
