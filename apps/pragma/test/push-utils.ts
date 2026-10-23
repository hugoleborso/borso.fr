import { SSMClient } from '@aws-sdk/client-ssm';
import webPush from 'web-push';
import { vi } from 'vitest';
import { z } from 'zod';
import { type AuthenticatedApp, jsonRequest } from './auth-utils';

export const VAPID_PUBLIC_PARAMETER = '/pragma/dev/vapid-public';
export const VAPID_PRIVATE_PARAMETER = '/pragma/dev/vapid-private';
export const VAPID_PUBLIC_KEY = 'vapid-public-key-of-the-test-stage';

const VAPID_VALUES: Readonly<Record<string, string>> = {
  [VAPID_PUBLIC_PARAMETER]: VAPID_PUBLIC_KEY,
  [VAPID_PRIVATE_PARAMETER]: 'vapid-private-key-of-the-test-stage',
};

const DELIVERED_ANSWER = { statusCode: 201, body: '', headers: {} };

const parameterCommandSchema = z.object({ input: z.object({ Name: z.string() }) });
const pushTargetSchema = z.object({ endpoint: z.string() });
const notificationPayloadSchema = z.object({
  messageKey: z.string(),
  parameters: z.record(z.string(), z.string()),
  url: z.string(),
  tag: z.string(),
});

export type SentNotification = z.infer<typeof notificationPayloadSchema> & {
  readonly endpoint: string;
};

export function configureVapidKeys(): void {
  vi.stubEnv('VAPID_PUBLIC_PARAMETER', VAPID_PUBLIC_PARAMETER);
  vi.stubEnv('VAPID_PRIVATE_PARAMETER', VAPID_PRIVATE_PARAMETER);
  // eslint-disable-next-line @typescript-eslint/no-misused-promises -- SSMClient.send is overloaded and its last signature, the callback form, returns void; the parameter store client calls the promise form, which is what this stub answers
  vi.spyOn(SSMClient.prototype, 'send').mockImplementation(async (command: unknown) => {
    const name = parameterCommandSchema.parse(command).input.Name;
    return await Promise.resolve({ Parameter: { Value: VAPID_VALUES[name] } });
  });
}

export function stubPushService(
  answer: () => Promise<typeof DELIVERED_ANSWER> = async () =>
    await Promise.resolve(DELIVERED_ANSWER),
) {
  return vi.spyOn(webPush, 'sendNotification').mockImplementation(answer);
}

export function readSentNotifications(
  send: ReturnType<typeof stubPushService>,
): SentNotification[] {
  return send.mock.calls.map(([target, payload]) => ({
    endpoint: pushTargetSchema.parse(target).endpoint,
    ...notificationPayloadSchema.parse(JSON.parse(z.string().parse(payload))),
  }));
}

export function deviceEndpoint(device: string): string {
  return `https://web.push.apple.com/${device}`;
}

export async function subscribeDevice(band: AuthenticatedApp, device: string): Promise<Response> {
  return await jsonRequest(band.app, '/api/notifications/subscriptions', {
    method: 'POST',
    body: {
      endpoint: deviceEndpoint(device),
      expirationTime: null,
      keys: { p256dh: `${device}-key`, auth: `${device}-auth` },
    },
    cookieHeader: band.cookieHeader,
  });
}

export async function turnCategory(
  band: AuthenticatedApp,
  category: string,
  isEnabled: boolean,
): Promise<Response> {
  return await jsonRequest(band.app, '/api/notifications/preferences', {
    method: 'PUT',
    body: { category, enabled: isEnabled },
    cookieHeader: band.cookieHeader,
  });
}
