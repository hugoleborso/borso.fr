/** @Feature bars */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError, api } from '../api.client';

export const outreachKeys = {
  all: ['outreach'] as const,
  template: () => [...outreachKeys.all, 'template'] as const,
};

// @FollowsBlueprint query-module
export function useOutreachTemplate() {
  return useQuery({
    queryKey: outreachKeys.template(),
    queryFn: async () => {
      const response = await api.api.outreach.template.$get();
      if (!response.ok) throw new ApiError(response.status, `outreach ${response.status}`, null);
      return response.json();
    },
  });
}

// @FollowsBlueprint query-pessimistic-mutation
export function useSaveOutreachTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (variables: { body: string }) => {
      const response = await api.api.outreach.template.$put({ json: variables });
      if (!response.ok) throw new ApiError(response.status, `outreach ${response.status}`, null);
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.setQueryData(outreachKeys.template(), { body: data.body });
    },
  });
}
