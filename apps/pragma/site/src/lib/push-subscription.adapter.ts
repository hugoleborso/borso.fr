/**
 * @DependsOnExternal browser-push-manager
 * @DependsOnExternal browser-media-query
 */

import { z } from 'zod';
import {
  isIosDevice,
  type NotificationPermissionState,
} from '../components/organisms/notifications-offer.core';
import { decodeBase64Url } from './vapid-key.utils';

interface BrowserPushSubscription {
  readonly toJSON: () => PushSubscriptionJSON;
}

export interface PushEnvironment {
  readonly notification: {
    readonly permission: NotificationPermissionState;
    readonly requestPermission: () => Promise<NotificationPermissionState>;
  };
  readonly serviceWorkerReady: () => Promise<{
    readonly pushManager: {
      readonly getSubscription: () => Promise<BrowserPushSubscription | null>;
      readonly subscribe: (
        options: PushSubscriptionOptionsInit,
      ) => Promise<BrowserPushSubscription>;
    };
  }>;
}

export interface DisplayEnvironment {
  readonly userAgent: string;
  readonly maxTouchPoints: number;
  readonly isHomeScreenApp: boolean;
  readonly matchesStandaloneDisplay: boolean;
}

export interface InstallContext {
  readonly isIos: boolean;
  readonly isStandalone: boolean;
}

const STANDALONE_DISPLAY_QUERY = '(display-mode: standalone)';

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

function readBrowserDisplayEnvironment(): DisplayEnvironment {
  return {
    userAgent: navigator.userAgent,
    maxTouchPoints: navigator.maxTouchPoints,
    isHomeScreenApp: 'standalone' in navigator && navigator.standalone === true,
    matchesStandaloneDisplay: window.matchMedia(STANDALONE_DISPLAY_QUERY).matches,
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

export function readInstallContext(
  environment: DisplayEnvironment = readBrowserDisplayEnvironment(),
): InstallContext {
  return {
    isIos: isIosDevice(environment.userAgent, environment.maxTouchPoints),
    isStandalone: environment.isHomeScreenApp || environment.matchesStandaloneDisplay,
  };
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
