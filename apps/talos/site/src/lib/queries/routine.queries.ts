import { useQuery } from '@tanstack/react-query';
import { ApiError, api } from '../api.client';

export const routineKeys = {
  all: ['routine'] as const,
  runs: () => [...routineKeys.all, 'runs'] as const,
};

// @FollowsBlueprint query-module
export function useRoutineRuns() {
  return useQuery({
    queryKey: routineKeys.runs(),
    queryFn: async () => {
      const response = await api.api.routine.runs.$get();
      if (!response.ok) {
        throw new ApiError(response.status, `routine runs ${response.status}`, null);
      }
      return await response.json();
    },
  });
}
