import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { InferResponseType } from 'hono/client';
import { ApiError, api, isResponseSuccessful, readFailureBody } from '../api.client';
import { placeNewestRunFirst } from '../routine-run.core';
import { useMutationToasts } from '../toast.hook';
import { ROUTINE_LAUNCHED_TOAST, selectLaunchFailureToast } from './mutation-toasts.core';

export const routineKeys = {
  all: ['routine'] as const,
  runs: () => [...routineKeys.all, 'runs'] as const,
};

type RoutineRunsResponse = InferResponseType<typeof api.api.routine.runs.$get, 200>;

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

// @FollowsBlueprint query-settled-from-the-write-response
export function useLaunchMessageRun() {
  const queryClient = useQueryClient();
  const toasts = useMutationToasts();
  return useMutation({
    mutationFn: async (variables: { text: string }) => {
      const response = await api.api.routine.runs.$post({ json: variables });
      const { status } = response;
      if (!isResponseSuccessful(response)) {
        throw new ApiError(status, `routine run ${status}`, await readFailureBody(response));
      }
      return await response.json();
    },
    onSuccess: (run) => {
      queryClient.setQueryData<RoutineRunsResponse>(routineKeys.runs(), (old) => ({
        items: placeNewestRunFirst(old?.items ?? [], run),
      }));
      toasts.confirm(ROUTINE_LAUNCHED_TOAST);
    },
    onError: (failure) => {
      toasts.confirm(selectLaunchFailureToast(failure));
    },
  });
}
