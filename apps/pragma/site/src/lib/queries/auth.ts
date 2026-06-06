/**
 * Auth feature queries / mutations.
 *
 * `useSessionProbe()` reuses the gated `/api/instruments` endpoint as
 * a session probe (the API does not yet expose `/api/auth/me`).
 * Caches forever (`staleTime: Infinity`) — the route guard only needs
 * to know "is the cookie valid right now?" at the moment of mount.
 *
 * Because that probe never refetches, `useLogin` MUST flip the cached
 * session to authenticated on success: the user reached /login by the
 * guard caching `{ authenticated: false }`, and without overwriting it
 * the post-login redirect lands on the guard, reads the stale `false`,
 * and bounces straight back to /login.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError, api } from '../api';

export const authKeys = {
  all: ['auth'] as const,
  session: () => [...authKeys.all, 'session'] as const,
};

export interface SessionProbeResult {
  readonly authenticated: boolean;
}

async function probeSession(): Promise<SessionProbeResult> {
  const response = await api.api.instruments.$get();
  if (response.ok) return { authenticated: true };
  if (response.status === 401) return { authenticated: false };
  return { authenticated: true };
}

export function useSessionProbe() {
  return useQuery({
    queryKey: authKeys.session(),
    queryFn: probeSession,
    staleTime: Number.POSITIVE_INFINITY,
    retry: false,
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

export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (variables: { password: string }) => postLogin(variables.password),
    onSuccess: () => {
      queryClient.setQueryData<SessionProbeResult>(authKeys.session(), { authenticated: true });
    },
  });
}
