/** @DependsOnExternal browser-push-manager */

import { z } from 'zod';
import type { NotificationPermissionState } from '../components/organisms/notifications-offer.core';
import { decodeBase64Url } from './vapid-key.utils';

export interface PushEnvironment {
  readonly notification: {
    readonly permission: NotificationPermissionState;
    readonly requestPermission: () => Promise<NotificationPermissionState>;
  };
  readonly serviceWorkerReady: () => Promise<{
    readonly pushManager: {
      readonly getSubscription: () => Promise<{
        toJSON: () => PushSubscriptionJSON;
        unsubscribe: () => Promise<boolean>;
      } | null>;
      readonly subscribe: (options: PushSubscriptionOptionsInit) => Promise<{
        toJSON: () => PushSubscriptionJSON;
      }>;
    };
  }>;
}

const savedSubscriptionSchema = z.object({
  endpoint: z.string().min(1),
  expirationTime: z.number().nullable().optional(),
  keys: z.object({ p256dh: z.string().min(1), auth: z.string().min(1) }),
});

export type SavedPushSubscription = z.infer<typeof savedSubscriptionSchema>;

export class NotificationPermissionRefusedError extends Error {
  override readonly name = 'NotificationPermissionRefusedError';
}

function readBrowserPushEnvironment(): PushEnvironment | null {
  const isSupported =
    typeof Notification !== 'undefined' &&
    typeof navigator !== 'undefined' &&
    'serviceWorker' in navigator &&
    typeof PushManager !== 'undefined';
  if (!isSupported) return null;
  return {
    notification: Notification,
    serviceWorkerReady: () => navigator.serviceWorker.ready,
  };
}

// @FollowsBlueprint injected-browser-api
export function isPushSupported(
  environment: PushEnvironment | null = readBrowserPushEnvironment(),
): boolean {
  return environment !== null;
}

export function readNotificationPermission(
  environment: PushEnvironment | null = readBrowserPushEnvironment(),
): NotificationPermissionState {
  return environment?.notification.permission ?? 'default';
}

export async function readExistingPushSubscription(
  environment: PushEnvironment | null = readBrowserPushEnvironment(),
): Promise<PushSubscriptionJSON | null> {
  if (environment === null) return null;
  const registration = await environment.serviceWorkerReady();
  const subscription = await registration.pushManager.getSubscription();
  return subscription?.toJSON() ?? null;
}

export async function subscribeToPush(
  publicKey: string,
  environment: PushEnvironment | null = readBrowserPushEnvironment(),
): Promise<SavedPushSubscription> {
  if (environment === null) throw new NotificationPermissionRefusedError('push unsupported');
  const permission = await environment.notification.requestPermission();
  if (permission !== 'granted') throw new NotificationPermissionRefusedError(permission);
  const registration = await environment.serviceWorkerReady();
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: decodeBase64Url(publicKey),
  });
  return savedSubscriptionSchema.parse(subscription.toJSON());
}

export async function unsubscribeBrowserFromPush(
  environment: PushEnvironment | null = readBrowserPushEnvironment(),
): Promise<void> {
  if (environment === null) return;
  const registration = await environment.serviceWorkerReady();
  const subscription = await registration.pushManager.getSubscription();
  await subscription?.unsubscribe();
}
