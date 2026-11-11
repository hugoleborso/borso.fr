import { useQuery } from '@tanstack/react-query';
import { ApiError, api } from '../api.client';

export const recurringTaskKeys = {
  all: ['recurring-tasks'] as const,
  list: () => [...recurringTaskKeys.all, 'list'] as const,
};

// @FollowsBlueprint query-module
export function useRecurringTasks() {
  return useQuery({
    queryKey: recurringTaskKeys.list(),
    queryFn: async () => {
      const response = await api.api['recurring-tasks'].$get();
      if (!response.ok) {
        throw new ApiError(response.status, `recurring tasks ${response.status}`, null);
      }
      return await response.json();
    },
  });
}
