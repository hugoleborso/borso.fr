/**
 * Auth feature queries / mutations. The login mutation does not
 * invalidate any caches on success — the caller redirects to the
 * originating page, so a stale cache isn't observable.
 *
 * `useSessionProbe()` reuses the gated `/api/instruments` endpoint as
 * a session probe (the API does not yet expose `/api/auth/me`).
 * Caches forever (`staleTime: Infinity`) — the route guard only needs
 * to know "is the cookie valid right now?" at the moment of mount.
 */

import { useMutation, useQuery } from '@tanstack/react-query';
import { ApiError, api } from '../api';

export const authKeys = {
  all: ['auth'] as const,
  session: () => [...authKeys.all, 'session'] as const,
};

async function probeSession(): Promise<{ authenticated: boolean }> {
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
  return useMutation({
    mutationFn: (variables: { password: string }) => postLogin(variables.password),
  });
}
