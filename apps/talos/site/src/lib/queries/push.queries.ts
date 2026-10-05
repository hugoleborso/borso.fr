import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError, api, readFailureBody } from '../api.client';
import {
  readExistingPushSubscription,
  type SavedPushSubscription,
  subscribeToPush,
  unsubscribeBrowserFromPush,
} from '../push-subscription.adapter';
import { useMutationToasts } from '../toast.hook';
import {
  PUSH_DISABLED_TOAST,
  PUSH_ENABLED_TOAST,
  selectPushTestToast,
} from './mutation-toasts.core';

export const pushKeys = {
  all: ['push'] as const,
  subscription: () => [...pushKeys.all, 'subscription'] as const,
};

// @FollowsBlueprint query-module
export function usePushSubscription(isSupported: boolean) {
  return useQuery({
    queryKey: pushKeys.subscription(),
    queryFn: () => readExistingPushSubscription(),
    enabled: isSupported,
    staleTime: Number.POSITIVE_INFINITY,
  });
}

async function enablePush(): Promise<SavedPushSubscription> {
  const keyResponse = await api.api.push['public-key'].$get();
  if (!keyResponse.ok) throw new ApiError(keyResponse.status, 'push-key', null);
  const { key } = await keyResponse.json();
  const subscription = await subscribeToPush(key);
  const response = await api.api.push.subscriptions.$post({ json: subscription });
  if (!response.ok) throw new ApiError(response.status, 'push-subscription', null);
  return subscription;
}

async function disablePush(): Promise<null> {
  const subscription = await readExistingPushSubscription();
  const endpoint = subscription?.endpoint;
  if (endpoint !== undefined) {
    const response = await api.api.push.subscriptions.$delete({ json: { endpoint } });
    if (!response.ok) {
      throw new ApiError(response.status, 'push-unsubscription', await readFailureBody(response));
    }
  }
  await unsubscribeBrowserFromPush();
  return null;
}

// @FollowsBlueprint query-pessimistic-mutation
export function useEnablePush() {
  const queryClient = useQueryClient();
  const toasts = useMutationToasts();
  return useMutation({
    mutationFn: enablePush,
    onSuccess: (subscription) => {
      queryClient.setQueryData(pushKeys.subscription(), subscription);
      toasts.confirm(PUSH_ENABLED_TOAST);
    },
    onError: (failure) => {
      toasts.fail(failure, 'today.notifications.failed');
    },
  });
}

// @FollowsBlueprint query-pessimistic-mutation
export function useDisablePush() {
  const queryClient = useQueryClient();
  const toasts = useMutationToasts();
  return useMutation({
    mutationFn: disablePush,
    onSuccess: (subscription) => {
      queryClient.setQueryData(pushKeys.subscription(), subscription);
      toasts.confirm(PUSH_DISABLED_TOAST);
    },
    onError: (failure) => {
      toasts.fail(failure, 'settings.notifications.disable-failed');
    },
  });
}

// @FollowsBlueprint query-uncached-mutation
export function useSendTestPush() {
  const toasts = useMutationToasts();
  return useMutation({
    mutationFn: async () => {
      const response = await api.api.push.test.$post();
      if (!response.ok) {
        throw new ApiError(response.status, 'push-test', await readFailureBody(response));
      }
      return await response.json();
    },
    onSuccess: (report) => {
      toasts.confirm(selectPushTestToast(report.delivered));
    },
    onError: (failure) => {
      toasts.fail(failure, 'settings.notifications.test-failed');
    },
  });
}
