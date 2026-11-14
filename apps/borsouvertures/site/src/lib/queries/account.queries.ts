import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  type AccountSession,
  isSignedOutAnswer,
  readAccountSession,
  readSignInFailure,
  SignInRefusedError,
} from '../account-session.core';
import { api } from '../api.client';

const SIGNED_OUT: AccountSession = { signedIn: false };

export const accountKeys = {
  all: ['account'] as const,
  session: () => [...accountKeys.all, 'session'] as const,
};

async function fetchAccountSession(): Promise<AccountSession> {
  const response = await api.api.auth.session.$get();
  const session = readAccountSession(await response.json());
  if (session === null) throw new Error('The session route answered something else than a session');
  return session;
}

// @FollowsBlueprint query-module
export const accountSessionQuery = queryOptions({
  queryKey: accountKeys.session(),
  queryFn: fetchAccountSession,
  staleTime: Number.POSITIVE_INFINITY,
});

export function useAccountSession() {
  return useQuery(accountSessionQuery);
}

async function postSignIn(password: string): Promise<AccountSession> {
  const response = await api.api.auth['sign-in'].$post({ json: { password } });
  const body: unknown = await response.json().catch(() => null);
  const session = readAccountSession(body);
  if (session === null) throw new SignInRefusedError(readSignInFailure(body));
  return session;
}

// @FollowsBlueprint query-pessimistic-mutation
export function useSignIn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: postSignIn,
    onSuccess: (session) => {
      queryClient.setQueryData(accountKeys.session(), session);
    },
  });
}

async function postSignOut(): Promise<AccountSession> {
  const response = await api.api.auth['sign-out'].$post();
  const isSignedOut = isSignedOutAnswer(response.status);
  if (!isSignedOut) throw new Error(`The sign-out answered ${String(response.status)}`);
  return SIGNED_OUT;
}

// @FollowsBlueprint query-pessimistic-mutation
export function useSignOut() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: postSignOut,
    onSuccess: (session) => {
      queryClient.setQueryData(accountKeys.session(), session);
    },
  });
}
