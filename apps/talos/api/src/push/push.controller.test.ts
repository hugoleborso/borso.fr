import webPush from 'web-push';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  buildTestContext,
  requestJson,
  signIn,
  TEST_SECRETS,
  useTestSecrets,
} from '../../../test/app-utils';
import { truncateAllTables } from '../../../test/database-utils';
import { getDatabase } from '../database/client';
import { pushSubscriptionTable } from './push.schema';

const SUBSCRIPTION = {
  endpoint: 'https://web.push.apple.com/abc',
  expirationTime: null,
  keys: { p256dh: 'clé', auth: 'secret' },
};

beforeEach(async () => {
  await truncateAllTables();
});

afterEach(() => {
  vi.restoreAllMocks();
});

// @FollowsBlueprint test-back-e2e
describe('the push routes', () => {
  it('gives the public VAPID key', async () => {
    const { app } = buildTestContext({});
    const response = await requestJson(app, '/api/push/public-key', { cookie: await signIn() });
    expect(await response.json()).toEqual({ key: TEST_SECRETS['vapid-public'] });
  });

  it('answers 503 while the VAPID keys are missing', async () => {
    const { app } = buildTestContext({});
    useTestSecrets({ 'vapid-private': undefined });
    const response = await requestJson(app, '/api/push/public-key', { cookie: await signIn() });
    expect(response.status).toBe(503);
  });

  it('subscribes a browser once, even when it subscribes again', async () => {
    const { app } = buildTestContext({});
    const cookie = await signIn();
    await requestJson(app, '/api/push/subscriptions', {
      method: 'POST',
      body: SUBSCRIPTION,
      cookie,
    });
    const response = await requestJson(app, '/api/push/subscriptions', {
      method: 'POST',
      body: { ...SUBSCRIPTION, keys: { p256dh: 'nouvelle', auth: 'secret' } },
      cookie,
    });
    expect(await response.json()).toEqual({ ok: true });
    const rows = await getDatabase().select().from(pushSubscriptionTable);
    expect(rows).toMatchObject([{ endpoint: SUBSCRIPTION.endpoint, publicKey: 'nouvelle' }]);
  });

  it('unsubscribes a browser', async () => {
    const { app } = buildTestContext({});
    const cookie = await signIn();
    await requestJson(app, '/api/push/subscriptions', {
      method: 'POST',
      body: SUBSCRIPTION,
      cookie,
    });
    const response = await requestJson(app, '/api/push/subscriptions', {
      method: 'DELETE',
      body: { endpoint: SUBSCRIPTION.endpoint },
      cookie,
    });
    expect(await response.json()).toEqual({ ok: true });
    expect(await getDatabase().select().from(pushSubscriptionTable)).toHaveLength(0);
  });
});

describe('POST /api/push/test', () => {
  it('sends a test notification to every subscribed device and reports it', async () => {
    const { app } = buildTestContext({});
    const cookie = await signIn();
    await requestJson(app, '/api/push/subscriptions', {
      method: 'POST',
      body: SUBSCRIPTION,
      cookie,
    });
    const sendNotification = vi
      .spyOn(webPush, 'sendNotification')
      .mockResolvedValue({ statusCode: 201, body: '', headers: {} });
    const response = await requestJson(app, '/api/push/test', { method: 'POST', cookie });
    expect(await response.json()).toEqual({ ok: true, delivered: 1, removed: 0 });
    expect(sendNotification).toHaveBeenCalledWith(
      expect.objectContaining({ endpoint: SUBSCRIPTION.endpoint }),
      JSON.stringify({
        title: 'Talos',
        message: 'Notification de test : les notifications arrivent bien.',
        url: '/settings',
        urgent: false,
      }),
      expect.objectContaining({ urgency: 'normal' }),
    );
  });

  it('reports nothing delivered while no device is subscribed', async () => {
    const { app } = buildTestContext({});
    const response = await requestJson(app, '/api/push/test', {
      method: 'POST',
      cookie: await signIn(),
    });
    expect(await response.json()).toEqual({ ok: true, delivered: 0, removed: 0 });
  });

  it('refuses a visitor without a session', async () => {
    const { app } = buildTestContext({});
    const response = await requestJson(app, '/api/push/test', { method: 'POST' });
    expect(response.status).toBe(401);
  });
});
