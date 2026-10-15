/** @Feature sessions */

import { useQuery } from '@tanstack/react-query';
import type { InferResponseType } from 'hono/client';
import { ApiError, api } from '../api.client';

export const freeSlotsKeys = {
  all: ['free-slots'] as const,
};

export type FreeSlotsResponse = InferResponseType<(typeof api.api)['free-slots']['$get'], 200>;

// @FollowsBlueprint query-module
export function useFreeSlots() {
  return useQuery({
    queryKey: freeSlotsKeys.all,
    queryFn: async (): Promise<FreeSlotsResponse> => {
      const response = await api.api['free-slots'].$get();
      if (!response.ok) throw new ApiError(response.status, `free-slots ${response.status}`, null);
      return await response.json();
    },
  });
}
