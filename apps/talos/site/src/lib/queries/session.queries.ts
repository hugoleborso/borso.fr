import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError, api, readFailureBody } from '../api.client';
import { clearOfflineData } from '../offline-cache.adapter';
import { useMutationToasts } from '../toast.hook';
import { isKeptAfterSignOut } from './cache-updates.core';

export const sessionKeys = {
  all: ['session'] as const,
  current: () => [...sessionKeys.all, 'current'] as const,
};

export const SIGNED_IN = { signedIn: true, registered: true } as const;
const SIGNED_OUT = { signedIn: false, registered: true } as const;

// @FollowsBlueprint query-module
export function useSession() {
  return useQuery({
    queryKey: sessionKeys.current(),
    queryFn: async () => {
      const response = await api.api.session.$get();
      if (!response.ok) throw new ApiError(response.status, `session ${response.status}`, null);
      return await response.json();
    },
    staleTime: Number.POSITIVE_INFINITY,
    retry: false,
  });
}

// @FollowsBlueprint query-uncached-mutation
export function useSignOut() {
  const queryClient = useQueryClient();
  const toasts = useMutationToasts();
  return useMutation({
    mutationFn: async () => {
      const response = await api.api.auth.logout.$post();
      if (!response.ok) {
        throw new ApiError(response.status, 'logout', await readFailureBody(response));
      }
      await clearOfflineData();
      return await response.json();
    },
    onSuccess: () => {
      queryClient.setQueryData(sessionKeys.current(), SIGNED_OUT);
      queryClient.removeQueries({
        predicate: (query) => !isKeptAfterSignOut(query.queryKey, sessionKeys.all[0]),
      });
    },
    onError: (failure) => {
      toasts.fail(failure, 'settings.sign-out-failed');
    },
  });
}
