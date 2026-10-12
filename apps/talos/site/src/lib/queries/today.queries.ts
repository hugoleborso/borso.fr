import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { InferResponseType } from 'hono/client';
import { ApiError, api, readFailureBody } from '../api.client';
import { useMutationToasts } from '../toast.hook';
import { FOCUS_SAVED_TOAST } from './mutation-toasts.core';

export const todayKeys = {
  all: ['today'] as const,
  overview: () => [...todayKeys.all, 'overview'] as const,
};

type TodayResponse = InferResponseType<typeof api.api.today.$get, 200>;
type FocusUpdate = Parameters<typeof api.api.focus.$put>[0]['json'];

// @FollowsBlueprint query-module
export function useToday() {
  return useQuery({
    queryKey: todayKeys.overview(),
    queryFn: async () => {
      const response = await api.api.today.$get();
      if (!response.ok) throw new ApiError(response.status, `today ${response.status}`, null);
      return await response.json();
    },
  });
}

// @FollowsBlueprint query-optimistic-mutation
export function useUpdateFocus() {
  const queryClient = useQueryClient();
  const toasts = useMutationToasts();
  return useMutation({
    mutationFn: async (variables: FocusUpdate) => {
      const response = await api.api.focus.$put({ json: variables });
      if (!response.ok) {
        throw new ApiError(
          response.status,
          `focus ${response.status}`,
          await readFailureBody(response),
        );
      }
      return await response.json();
    },
    onMutate: async (variables) => {
      const overviewKey = todayKeys.overview();
      await queryClient.cancelQueries({ queryKey: overviewKey });
      const previousOverview = queryClient.getQueryData<TodayResponse>(overviewKey);
      queryClient.setQueryData<TodayResponse>(overviewKey, (old) => {
        if (old === undefined) return old;
        return { ...old, focus: { ...old.focus, items: variables.items } };
      });
      return { previousOverview };
    },
    onSuccess: (focus) => {
      toasts.confirm(FOCUS_SAVED_TOAST);
      queryClient.setQueryData<TodayResponse>(todayKeys.overview(), (old) => {
        if (old === undefined) return old;
        return { ...old, focus };
      });
    },
    onError: (failure, _variables, context) => {
      toasts.fail(failure, 'today.focus.error');
      if (context?.previousOverview !== undefined) {
        queryClient.setQueryData(todayKeys.overview(), context.previousOverview);
      }
    },
  });
}
