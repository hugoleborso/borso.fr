import webPush from 'web-push';
import { vi } from 'vitest';
import { z } from 'zod';
import { type AuthenticatedApp, jsonRequest } from './auth-utils';

const DELIVERED_ANSWER = { statusCode: 201, body: '', headers: {} };

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
