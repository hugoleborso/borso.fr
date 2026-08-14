/**
 * Administrator sign in. The session lives in an HTTP only cookie the API
 * sets, so there is nothing to cache here and the mutation only reports
 * whether the PIN was accepted.
 */

import { useMutation } from '@tanstack/react-query';
import { ApiError, api } from '../api';

// @FollowsBlueprint query-uncached-mutation
export function useAdminLogin() {
  return useMutation({
    mutationFn: async (variables: { pin: string }) => {
      const response = await api.api.admin.auth.login.$post({ json: { pin: variables.pin } });
      if (!response.ok)
        throw new ApiError(response.status, await response.json().catch(() => null));
      return response.json();
    },
  });
}
