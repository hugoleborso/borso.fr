/**
 * @vitest-environment node
 */

import webPush from 'web-push';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { deliverWebPush, generateVapidKeyPair, type PushSender } from './web-push.adapter';

const TARGET = { endpoint: 'https://push.example/abc', p256dh: 'device-key', auth: 'device-auth' };
const VAPID_KEYS = { publicKey: 'public', privateKey: 'private' };
const BASE64URL = /^[\w-]+$/;
const UNCOMPRESSED_P256_POINT_BYTES = 65;
const P256_PRIVATE_KEY_BYTES = 32;

function succeeding(): PushSender {
  return vi.fn(async () => await Promise.resolve({ statusCode: 201, body: '', headers: {} }));
}

function rejectingWith(failure: Error): PushSender {
  return vi.fn(async () => await Promise.reject(failure));
}

afterEach(() => {
  vi.restoreAllMocks();
});

// @FollowsBlueprint test-node-adapter
describe('deliverWebPush', () => {
  it('signs the push as pragma, keeps it a day and bounds the socket', async () => {
    const sender = succeeding();
    expect(
      await deliverWebPush(TARGET, '{"messageKey":"x"}', { vapidKeys: VAPID_KEYS, sender }),
    ).toEqual({
      delivery: 'delivered',
      statusCode: null,
    });
    expect(sender).toHaveBeenCalledWith(
      { endpoint: TARGET.endpoint, keys: { p256dh: 'device-key', auth: 'device-auth' } },
      '{"messageKey":"x"}',
      {
        vapidDetails: {
          subject: 'https://pragma.borso.fr',
          publicKey: 'public',
          privateKey: 'private',
        },
        urgency: 'normal',
        TTL: 86_400,
        timeout: 3_000,
      },
    );
  });

  it('reports an expired subscription instead of throwing', async () => {
    const gone = Object.assign(new Error('gone'), { statusCode: 410 });
    expect(
      await deliverWebPush(TARGET, '{}', { vapidKeys: VAPID_KEYS, sender: rejectingWith(gone) }),
    ).toEqual({ delivery: 'expired', statusCode: 410 });
  });

  it('reports any other failure with its status, or none', async () => {
    const throttled = Object.assign(new Error('slow down'), { statusCode: 429 });
    expect(
      await deliverWebPush(TARGET, '{}', {
        vapidKeys: VAPID_KEYS,
        sender: rejectingWith(throttled),
      }),
    ).toEqual({ delivery: 'failed', statusCode: 429 });
    expect(
      await deliverWebPush(TARGET, '{}', {
        vapidKeys: VAPID_KEYS,
        sender: rejectingWith(new Error('socket hang up')),
      }),
    ).toEqual({ delivery: 'failed', statusCode: null });
  });

  it('sends through the web-push library by default', async () => {
    const sendNotification = vi
      .spyOn(webPush, 'sendNotification')
      .mockResolvedValue({ statusCode: 201, body: '', headers: {} });
    expect(await deliverWebPush(TARGET, '{}', { vapidKeys: VAPID_KEYS })).toEqual({
      delivery: 'delivered',
      statusCode: null,
    });
    expect(sendNotification).toHaveBeenCalledOnce();
  });
});

describe('generateVapidKeyPair', () => {
  it('generates a P-256 pair in the base64url form web-push signs with', () => {
    const pair = generateVapidKeyPair();
    expect(Object.keys(pair).sort()).toEqual(['privateKey', 'publicKey']);
    expect(pair.publicKey).toMatch(BASE64URL);
    expect(pair.privateKey).toMatch(BASE64URL);
    expect(Buffer.from(pair.publicKey, 'base64url')).toHaveLength(UNCOMPRESSED_P256_POINT_BYTES);
    expect(Buffer.from(pair.privateKey, 'base64url')).toHaveLength(P256_PRIVATE_KEY_BYTES);
  });

  it('generates a different pair each time', () => {
    expect(generateVapidKeyPair().privateKey).not.toBe(generateVapidKeyPair().privateKey);
  });
});
