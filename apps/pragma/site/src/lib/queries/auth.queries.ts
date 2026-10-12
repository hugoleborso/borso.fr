/** @Feature auth */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError, api } from '../api.client';
import { startPasskeyLogin } from '../passkey.adapter';
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

async function throwOnFailure(response: Response, label: string) {
  if (response.ok) return;
  const failureBody: unknown = await response.json().catch(() => null);
  throw new ApiError(response.status, `${label} ${String(response.status)}`, failureBody);
}

async function postLogin(username: string, password: string) {
  const response = await api.api.auth.login.$post({ json: { username, password } });
  await throwOnFailure(response, 'login');
  return await response.json();
}

// @FollowsBlueprint query-pessimistic-mutation
export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (variables: { username: string; password: string }) =>
      postLogin(variables.username, variables.password),
    onSuccess: () => {
      rememberSessionMarker();
      queryClient.setQueryData<SessionProbeResult>(authKeys.session(), { authenticated: true });
    },
  });
}

export interface RecoverPasswordVariables {
  readonly username: string;
  readonly sharedPassword: string;
  readonly newPassword: string;
}

async function postRecoverPassword(variables: RecoverPasswordVariables) {
  const response = await api.api.auth['recover-password'].$post({ json: variables });
  await throwOnFailure(response, 'recover-password');
  return await response.json();
}

// @FollowsBlueprint query-pessimistic-mutation
export function useRecoverPassword() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: postRecoverPassword,
    onSuccess: () => {
      rememberSessionMarker();
      queryClient.setQueryData<SessionProbeResult>(authKeys.session(), { authenticated: true });
    },
  });
}

async function loginWithPasskey() {
  const optionsResponse = await api.api.auth.passkey.authentication.options.$post();
  await throwOnFailure(optionsResponse, 'passkey-options');
  const assertion = await startPasskeyLogin(await optionsResponse.json());
  const response = await api.api.auth.passkey.authentication.verify.$post({
    json: { response: assertion },
  });
  await throwOnFailure(response, 'passkey-verify');
  return await response.json();
}

export function usePasskeyLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: loginWithPasskey,
    onSuccess: () => {
      rememberSessionMarker();
      queryClient.setQueryData<SessionProbeResult>(authKeys.session(), { authenticated: true });
    },
  });
}
