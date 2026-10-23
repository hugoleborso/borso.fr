/**
 * @vitest-environment node
 */

import webPush from 'web-push';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { deliverWebPush, type PushSender, readVapidKeys } from './web-push.adapter';

const TARGET = { endpoint: 'https://push.example/abc', p256dh: 'device-key', auth: 'device-auth' };
const VAPID_KEYS = { publicKey: 'public', privateKey: 'private' };
const PUBLIC_PARAMETER = '/pragma/preview/vapid-public';
const PRIVATE_PARAMETER = '/pragma/preview/vapid-private';

function succeeding(): PushSender {
  return vi.fn(async () => await Promise.resolve({ statusCode: 201, body: '', headers: {} }));
}

function rejectingWith(failure: Error): PushSender {
  return vi.fn(async () => await Promise.reject(failure));
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
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

describe('readVapidKeys', () => {
  beforeEach(() => {
    vi.stubEnv('VAPID_PUBLIC_PARAMETER', PUBLIC_PARAMETER);
    vi.stubEnv('VAPID_PRIVATE_PARAMETER', PRIVATE_PARAMETER);
  });

  it('reads both keys from the parameters the stage names', async () => {
    const readParameter = vi.fn(async (name: string) => await Promise.resolve(`value of ${name}`));
    expect(await readVapidKeys(readParameter)).toEqual({
      publicKey: `value of ${PUBLIC_PARAMETER}`,
      privateKey: `value of ${PRIVATE_PARAMETER}`,
    });
    expect(readParameter).toHaveBeenCalledTimes(2);
  });

  it('answers no keys while either parameter is missing or empty', async () => {
    expect(
      await readVapidKeys(
        async (name) => await Promise.resolve(name === PUBLIC_PARAMETER ? 'public' : undefined),
      ),
    ).toBeNull();
    expect(
      await readVapidKeys(
        async (name) => await Promise.resolve(name === PRIVATE_PARAMETER ? 'private' : ''),
      ),
    ).toBeNull();
  });

  it('reads nothing while the stage names no parameter', async () => {
    vi.stubEnv('VAPID_PUBLIC_PARAMETER', '');
    vi.stubEnv('VAPID_PRIVATE_PARAMETER', undefined);
    const readParameter = vi.fn(async () => await Promise.resolve('value'));
    expect(await readVapidKeys(readParameter)).toBeNull();
    expect(readParameter).not.toHaveBeenCalled();
  });

  it('reads through the parameter store by default', async () => {
    vi.stubEnv('VAPID_PUBLIC_PARAMETER', undefined);
    vi.stubEnv('VAPID_PRIVATE_PARAMETER', undefined);
    expect(await readVapidKeys()).toBeNull();
  });
});
