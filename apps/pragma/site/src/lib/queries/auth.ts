/**
 * Auth feature queries / mutations.
 *
 * `useSessionProbe()` reuses the gated `/api/instruments` endpoint as
 * a session probe (the API does not yet expose `/api/auth/me`).
 * Caches forever (`staleTime: Infinity`) — the route guard only needs
 * to know "is the cookie valid right now?" at the moment of mount.
 *
 * The probe only runs for a browser that has signed in before, which
 * the `enabled` flag reads from the session marker. A first-time
 * visitor therefore reaches the sign-in screen without a gated request
 * answering 401.
 *
 * Because the probe never refetches, `useLogin` MUST flip the cached
 * session to authenticated on success: the user reached /login by the
 * guard caching `{ authenticated: false }`, and without overwriting it
 * the post-login redirect lands on the guard, reads the stale `false`,
 * and bounces straight back to /login.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError, api } from '../api';
import { forgetSessionMarker, rememberSessionMarker } from '../session-marker';

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
