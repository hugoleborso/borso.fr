/** @Feature notifications */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { InferResponseType } from 'hono/client';
import { ApiError, api } from '../api.client';
import {
  readExistingPushSubscription,
  type SavedPushSubscription,
  subscribeToPush,
} from '../push-subscription.adapter';
import { setCategoryToggle } from './notifications.utils';

export const notificationKeys = {
  all: ['notifications'] as const,
  subscription: () => [...notificationKeys.all, 'subscription'] as const,
  preferences: () => [...notificationKeys.all, 'preferences'] as const,
};

type PreferencesResponse = InferResponseType<typeof api.api.notifications.preferences.$get, 200>;
export type NotificationCategory = PreferencesResponse['preferences'][number]['category'];
type PreferenceUpdateVariables = Parameters<
  typeof api.api.notifications.preferences.$put
>[0]['json'];

// @FollowsBlueprint query-module
export function usePushSubscription(isSupported: boolean) {
  return useQuery({
    queryKey: notificationKeys.subscription(),
    queryFn: () => readExistingPushSubscription(),
    enabled: isSupported,
    staleTime: Number.POSITIVE_INFINITY,
  });
}

export function useNotificationPreferences() {
  return useQuery({
    queryKey: notificationKeys.preferences(),
    queryFn: async () => {
      const response = await api.api.notifications.preferences.$get();
      if (!response.ok) {
        throw new ApiError(response.status, `preferences ${response.status}`, null);
      }
      return response.json();
    },
  });
}

async function enablePushOnThisDevice(): Promise<SavedPushSubscription> {
  const keyResponse = await api.api.notifications['vapid-public-key'].$get();
  if (!keyResponse.ok) {
    throw new ApiError(keyResponse.status, `vapid key ${keyResponse.status}`, null);
  }
  const { key } = await keyResponse.json();
  const subscription = await subscribeToPush(key);
  const response = await api.api.notifications.subscriptions.$post({ json: subscription });
  if (!response.ok) {
    throw new ApiError(response.status, `subscription ${response.status}`, null);
  }
  return subscription;
}

// @FollowsBlueprint query-pessimistic-mutation
export function useEnablePush() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: enablePushOnThisDevice,
    onSuccess: (subscription) => {
      queryClient.setQueryData(notificationKeys.subscription(), subscription);
    },
  });
}

// @FollowsBlueprint query-optimistic-mutation
export function useUpdateNotificationPreference() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (variables: PreferenceUpdateVariables) => {
      const response = await api.api.notifications.preferences.$put({ json: variables });
      if (!response.ok) {
        throw new ApiError(response.status, `preference ${response.status}`, null);
      }
      return response.json();
    },
    onMutate: async (variables) => {
      const preferencesKey = notificationKeys.preferences();
      await queryClient.cancelQueries({ queryKey: preferencesKey });
      const previousPreferences = queryClient.getQueryData<PreferencesResponse>(preferencesKey);
      queryClient.setQueryData<PreferencesResponse>(preferencesKey, (old) => {
        if (old === undefined) return old;
        return {
          preferences: setCategoryToggle(old.preferences, variables.category, variables.enabled),
        };
      });
      return { previousPreferences };
    },
    onSuccess: (data) => {
      queryClient.setQueryData<PreferencesResponse>(notificationKeys.preferences(), data);
    },
    onError: (_failure, _variables, context) => {
      if (context?.previousPreferences !== undefined) {
        queryClient.setQueryData(notificationKeys.preferences(), context.previousPreferences);
      }
    },
  });
}
