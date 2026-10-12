/**
 * @vitest-environment node
 */

import webPush from 'web-push';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { deliverWebPush, type PushSender } from './web-push.adapter';

const TARGET = {
  endpoint: 'https://push.example/abc',
  publicKey: 'clé',
  authenticationSecret: 'secret',
};
const VAPID_KEYS = { publicKey: 'publique', privateKey: 'privée' };

function succeeding(): PushSender {
  return vi.fn(async () => await Promise.resolve({ statusCode: 201, body: '', headers: {} }));
}

afterEach(() => {
  vi.restoreAllMocks();
});

// @FollowsBlueprint test-node-adapter
describe('deliverWebPush', () => {
  it('signs the push with the VAPID keys and asks for the urgency and a day to live', async () => {
    const sender = succeeding();
    expect(
      await deliverWebPush(TARGET, '{"title":"T"}', {
        vapidKeys: VAPID_KEYS,
        urgency: 'high',
        sender,
      }),
    ).toBe('delivered');
    expect(sender).toHaveBeenCalledWith(
      { endpoint: TARGET.endpoint, keys: { p256dh: 'clé', auth: 'secret' } },
      '{"title":"T"}',
      {
        vapidDetails: {
          subject: 'https://talos.borso.fr',
          publicKey: 'publique',
          privateKey: 'privée',
        },
        urgency: 'high',
        TTL: 86_400,
      },
    );
  });

  it('reports an expired subscription instead of throwing', async () => {
    const sender: PushSender = vi.fn(
      async () => await Promise.reject(Object.assign(new Error('gone'), { statusCode: 410 })),
    );
    expect(
      await deliverWebPush(TARGET, '{}', { vapidKeys: VAPID_KEYS, urgency: 'normal', sender }),
    ).toBe('expired');
  });

  it('sends through the web-push library by default', async () => {
    const sendNotification = vi
      .spyOn(webPush, 'sendNotification')
      .mockResolvedValue({ statusCode: 201, body: '', headers: {} });
    expect(await deliverWebPush(TARGET, '{}', { vapidKeys: VAPID_KEYS, urgency: 'normal' })).toBe(
      'delivered',
    );
    expect(sendNotification).toHaveBeenCalledOnce();
  });
});
