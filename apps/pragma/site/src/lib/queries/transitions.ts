/**
 * Transition-comment queries / mutations. Comments are keyed on
 * ordered pairs `(songA, songB)`.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError, api } from '../api';

export const transitionKeys = {
  all: ['transition-comments'] as const,
  list: () => [...transitionKeys.all, 'list'] as const,
  byPair: (a: string, b: string) => [...transitionKeys.all, 'byPair', a, b] as const,
};

export function useTransitionComment(a: string, b: string, enabled = true) {
  return useQuery({
    queryKey: transitionKeys.byPair(a, b),
    queryFn: async () => {
      const response = await api.api['transition-comments'][':a'][':b'].$get({
        param: { a, b },
      });
      if (response.status === 404) return null;
      if (!response.ok) throw new ApiError(response.status, `transition ${response.status}`, null);
      return response.json();
    },
    enabled,
  });
}

export function useSaveTransitionComment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (variables: { a: string; b: string; comment: string }) => {
      const response = await api.api['transition-comments'][':a'][':b'].$put({
        param: { a: variables.a, b: variables.b },
        json: { comment: variables.comment },
      });
      if (!response.ok) throw new ApiError(response.status, `save ${response.status}`, null);
      return response.json();
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: transitionKeys.byPair(variables.a, variables.b),
      });
      void queryClient.invalidateQueries({ queryKey: transitionKeys.list() });
    },
  });
}

