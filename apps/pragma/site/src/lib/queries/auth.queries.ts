/** @Feature auth */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError, api } from '../api.client';
import { startPasskeyLogin } from '../passkey.adapter';
import { forgetSessionMarker, rememberSessionMarker } from '../session-marker.adapter';

export const authKeys = {
  all: ['auth'] as const,
  session: () => [...authKeys.all, 'session'] as const,
  enrolment: () => [...authKeys.all, 'enrolment'] as const,
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

export interface EnrolmentOffer {
  readonly memberId: string;
  readonly firstName: string;
  readonly suggestedUsername: string;
}

async function readEnrolmentOffers(): Promise<EnrolmentOffer[]> {
  const response = await api.api.auth.enrolment.$get();
  if (!response.ok) return [];
  const body = await response.json();
  return 'offers' in body ? body.offers : [];
}

export function useEnrolmentOffers() {
  return useQuery({
    queryKey: authKeys.enrolment(),
    queryFn: readEnrolmentOffers,
    retry: false,
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

export interface EnrolVariables {
  readonly memberId: string;
  readonly username: string;
  readonly password: string;
  readonly sharedPassword: string;
}

async function postEnrol(variables: EnrolVariables) {
  const response = await api.api.auth.enrol.$post({ json: variables });
  await throwOnFailure(response, 'enrol');
  return await response.json();
}

export function useEnrol() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: postEnrol,
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
