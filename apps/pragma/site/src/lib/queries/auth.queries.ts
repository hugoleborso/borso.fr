/** @Feature auth */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError, api } from '../api.client';
import { forgetSessionMarker, rememberSessionMarker } from '../session-marker.adapter';

export const authKeys = {
  all: ['auth'] as const,
  session: () => [...authKeys.all, 'session'] as const,
};

export interface SessionProbeResult {
  readonly authenticated: boolean;
}

const UNAUTHORISED_STATUS = 401;

async function probeSession(): Promise<SessionProbeResult> {
  const response = await api.api.instruments.$get();
  if (response.status !== UNAUTHORISED_STATUS) return { authenticated: true };
  forgetSessionMarker();
  return { authenticated: false };
}

export function useSessionProbe(isEnabled: boolean) {
  return useQuery({
    queryKey: authKeys.session(),
    queryFn: probeSession,
    staleTime: Number.POSITIVE_INFINITY,
    retry: false,
    enabled: isEnabled,
  });
}

async function postLogin(password: string) {
  const response = await api.api.auth.login.$post({ json: { password } });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new ApiError(response.status, `login ${response.status}`, body);
  }
  return response.json();
}

// @FollowsBlueprint query-pessimistic-mutation
export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (variables: { password: string }) => postLogin(variables.password),
    onSuccess: () => {
      rememberSessionMarker();
      queryClient.setQueryData<SessionProbeResult>(authKeys.session(), { authenticated: true });
    },
  });
}
