import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { InferResponseType } from 'hono/client';
import { ApiError, api, readFailureBody } from '../api.client';
import { startPasskeyLogin, startPasskeyRegistration } from '../passkey.adapter';
import { useMutationToasts } from '../toast.hook';
import { removeById } from './cache-updates.core';
import { PASSKEY_ADDED_TOAST, PASSKEY_REMOVED_TOAST } from './mutation-toasts.core';
import { SIGNED_IN, sessionKeys } from './session.queries';

export const passkeyKeys = {
  all: ['passkeys'] as const,
  list: () => [...passkeyKeys.all, 'list'] as const,
};

type PasskeysResponse = InferResponseType<typeof api.api.auth.passkeys.$get, 200>;
type RegistrationBody = Parameters<typeof api.api.auth.registration.options.$post>[0]['json'];

// @FollowsBlueprint query-module
export function usePasskeys() {
  return useQuery({
    queryKey: passkeyKeys.list(),
    queryFn: async () => {
      const response = await api.api.auth.passkeys.$get();
      if (!response.ok) throw new ApiError(response.status, `passkeys ${response.status}`, null);
      return await response.json();
    },
  });
}

async function registerPasskey(body: RegistrationBody) {
  const optionsResponse = await api.api.auth.registration.options.$post({ json: body });
  if (!optionsResponse.ok) {
    throw new ApiError(
      optionsResponse.status,
      'registration-options',
      await readFailureBody(optionsResponse),
    );
  }
  const attestation = await startPasskeyRegistration(await optionsResponse.json());
  const response = await api.api.auth.registration.verification.$post({
    json: { response: attestation },
  });
  if (!response.ok) {
    throw new ApiError(response.status, 'registration', await readFailureBody(response));
  }
  return await response.json();
}

async function signInWithPasskey() {
  const optionsResponse = await api.api.auth.login.options.$post();
  if (!optionsResponse.ok) {
    throw new ApiError(
      optionsResponse.status,
      'login-options',
      await readFailureBody(optionsResponse),
    );
  }
  const assertion = await startPasskeyLogin(await optionsResponse.json());
  const response = await api.api.auth.login.verification.$post({ json: { response: assertion } });
  if (!response.ok) throw new ApiError(response.status, 'login', await readFailureBody(response));
  return await response.json();
}

// @FollowsBlueprint query-pessimistic-mutation
export function useRegisterPasskey() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (code: string) => await registerPasskey({ code }),
    onSuccess: () => {
      queryClient.setQueryData(sessionKeys.current(), SIGNED_IN);
    },
  });
}

// @FollowsBlueprint query-pessimistic-mutation
export function usePasskeySignIn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: signInWithPasskey,
    onSuccess: () => {
      queryClient.setQueryData(sessionKeys.current(), SIGNED_IN);
    },
  });
}

// @FollowsBlueprint query-pessimistic-mutation
export function useAddPasskey() {
  const queryClient = useQueryClient();
  const toasts = useMutationToasts();
  return useMutation({
    mutationFn: async () => await registerPasskey({}),
    onSuccess: async () => {
      toasts.confirm(PASSKEY_ADDED_TOAST);
      await queryClient.invalidateQueries({ queryKey: passkeyKeys.list() });
    },
    onError: (failure) => {
      toasts.fail(failure, 'settings.passkeys.add-failed');
    },
  });
}

// @FollowsBlueprint query-optimistic-mutation
export function useRemovePasskey() {
  const queryClient = useQueryClient();
  const toasts = useMutationToasts();
  return useMutation({
    mutationFn: async (passkeyId: string) => {
      const response = await api.api.auth.passkeys[':id'].$delete({ param: { id: passkeyId } });
      if (!response.ok) {
        throw new ApiError(response.status, 'passkey-removal', await readFailureBody(response));
      }
      return await response.json();
    },
    onMutate: async (passkeyId) => {
      const listKey = passkeyKeys.list();
      await queryClient.cancelQueries({ queryKey: listKey });
      const previousList = queryClient.getQueryData<PasskeysResponse>(listKey);
      queryClient.setQueryData<PasskeysResponse>(listKey, (old) => {
        if (old === undefined) return old;
        return { items: removeById(old.items, passkeyId) };
      });
      return { previousList };
    },
    onSuccess: () => {
      toasts.confirm(PASSKEY_REMOVED_TOAST);
    },
    onError: (failure, _passkeyId, context) => {
      if (context?.previousList !== undefined) {
        queryClient.setQueryData(passkeyKeys.list(), context.previousList);
      }
      toasts.fail(failure, 'settings.passkeys.remove-failed');
    },
  });
}
