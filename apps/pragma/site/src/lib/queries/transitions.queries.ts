/** @Feature transitions */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { InferResponseType } from 'hono/client';
import { ApiError, api } from '../api.client';
import { isLastPendingMutation } from './optimistic.utils';

export const transitionKeys = {
  all: ['transition-comments'] as const,
  list: () => [...transitionKeys.all, 'list'] as const,
  byPair: (songAId: string, songBId: string) =>
    [...transitionKeys.all, 'byPair', songAId, songBId] as const,
};

type TransitionPairOk = Extract<
  InferResponseType<(typeof api.api)['transition-comments'][':a'][':b']['$get']>,
  { comment: unknown }
>;
type TransitionPairCache = TransitionPairOk | null;

export function useTransitionCommentsList() {
  return useQuery({
    queryKey: transitionKeys.list(),
    queryFn: async () => {
      const response = await api.api['transition-comments'].$get();
      if (!response.ok) throw new ApiError(response.status, `transitions ${response.status}`, null);
      return response.json();
    },
  });
}

export function useTransitionComment(songAId: string, songBId: string, isEnabled = true) {
  return useQuery({
    queryKey: transitionKeys.byPair(songAId, songBId),
    queryFn: async () => {
      const response = await api.api['transition-comments'][':a'][':b'].$get({
        param: { a: songAId, b: songBId },
      });
      if (response.status === 404) return null;
      if (!response.ok) throw new ApiError(response.status, `transition ${response.status}`, null);
      return response.json();
    },
    enabled: isEnabled,
  });
}

// @FollowsBlueprint query-optimistic-mutation
export function useSaveTransitionComment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: transitionKeys.all,
    mutationFn: async (variables: { a: string; b: string; comment: string }) => {
      const response = await api.api['transition-comments'][':a'][':b'].$put({
        param: { a: variables.a, b: variables.b },
        json: { comment: variables.comment },
      });
      if (!response.ok) throw new ApiError(response.status, `save ${response.status}`, null);
      return response.json();
    },
    onMutate: async (variables) => {
      const pairKey = transitionKeys.byPair(variables.a, variables.b);
      await queryClient.cancelQueries({ queryKey: pairKey });
      const previousPair = queryClient.getQueryData<TransitionPairCache>(pairKey);
      const optimistic: TransitionPairOk = {
        comment: {
          songAId: variables.a,
          songBId: variables.b,
          comment: variables.comment,
          updatedAt: new Date().toISOString(),
        },
      };
      queryClient.setQueryData<TransitionPairCache>(pairKey, optimistic);
      return { previousPair };
    },
    onError: (_err, variables, context) => {
      if (context !== undefined) {
        queryClient.setQueryData(
          transitionKeys.byPair(variables.a, variables.b),
          context.previousPair,
        );
      }
    },
    onSettled: (_data, _err, variables) => {
      if (!isLastPendingMutation(queryClient.isMutating({ mutationKey: transitionKeys.all }))) {
        return;
      }
      void queryClient.invalidateQueries({
        queryKey: transitionKeys.byPair(variables.a, variables.b),
      });
      void queryClient.invalidateQueries({ queryKey: transitionKeys.list() });
    },
  });
}
