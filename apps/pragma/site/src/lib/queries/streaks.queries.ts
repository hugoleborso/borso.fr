/** @Feature streaks */

import { useQuery } from '@tanstack/react-query';
import type { InferResponseType } from 'hono/client';
import { reportStreaksReadFailed } from '../../observability/error-reporting.adapter';
import { ApiError, api } from '../api.client';

export const streakKeys = {
  all: ['streaks'] as const,
};

export type StreaksView = InferResponseType<typeof api.api.streaks.$get, 200>;

// @FollowsBlueprint query-module
export function useStreaks() {
  return useQuery({
    queryKey: streakKeys.all,
    queryFn: async (): Promise<StreaksView> => {
      const response = await api.api.streaks.$get();
      if (!response.ok) throw new ApiError(response.status, `streaks ${response.status}`, null);
      return await response.json();
    },
    meta: { reportFailure: reportStreaksReadFailed },
  });
}
