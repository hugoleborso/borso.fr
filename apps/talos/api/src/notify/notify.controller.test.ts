import webPush from 'web-push';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  buildTestContext,
  requestJson,
  TEST_SECRETS,
  useTestSecrets,
} from '../../../test/app-utils';
import { truncateAllTables } from '../../../test/database-utils';
import { getDatabase } from '../database/client';
import { pushSubscriptionTable } from '../push/push.schema';

const BEARER = { authorization: `Bearer ${TEST_SECRETS['notify-secret'] ?? ''}` };
const NOTIFICATION = { title: 'Brief', message: 'Ton brief est prêt', url: '/' };

async function subscribe(endpoint: string): Promise<void> {
  await getDatabase().insert(pushSubscriptionTable).values({
    endpoint,
    publicKey: 'clé',
    authenticationSecret: 'secret',
    createdAt: new Date(),
  });
}

beforeEach(async () => {
  await truncateAllTables();
});

afterEach(() => {
  vi.restoreAllMocks();
});

// @FollowsBlueprint test-back-e2e
describe('POST /api/notify', () => {
  it('pushes to every subscription and removes the ones that expired', async () => {
    const { app } = buildTestContext({});
    await subscribe('https://push.example/vivant');
    await subscribe('https://push.example/expire');
    const sendNotification = vi
      .spyOn(webPush, 'sendNotification')
      .mockImplementation(async (subscription) =>
        subscription.endpoint.endsWith('expire')
          ? await Promise.reject(Object.assign(new Error('gone'), { statusCode: 410 }))
          : await Promise.resolve({ statusCode: 201, body: '', headers: {} }),
      );
    const response = await requestJson(app, '/api/notify', {
      method: 'POST',
      body: { ...NOTIFICATION, urgent: true },
      headers: BEARER,
    });
    expect(await response.json()).toEqual({ ok: true, delivered: 1, removed: 1 });
    expect(sendNotification).toHaveBeenCalledWith(
      expect.objectContaining({ endpoint: 'https://push.example/vivant' }),
      JSON.stringify({ title: 'Brief', message: 'Ton brief est prêt', url: '/', urgent: true }),
      expect.objectContaining({ urgency: 'high' }),
    );
    const remaining = await getDatabase().select().from(pushSubscriptionTable);
    expect(remaining.map((row) => row.endpoint)).toEqual(['https://push.example/vivant']);
  });

  it('refuses a caller without the notify secret, before reading the body', async () => {
    const { app } = buildTestContext({});
    const response = await requestJson(app, '/api/notify', {
      method: 'POST',
      body: {},
      headers: { authorization: 'Bearer faux' },
    });
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: 'Jeton invalide.' });
  });

  it('refuses a caller without any authorization header', async () => {
    const { app } = buildTestContext({});
    const response = await requestJson(app, '/api/notify', { method: 'POST', body: NOTIFICATION });
    expect(response.status).toBe(401);
  });

  it('answers 503 while no notify secret is configured', async () => {
    const { app } = buildTestContext({});
    useTestSecrets({ 'notify-secret': undefined });
    const response = await requestJson(app, '/api/notify', {
      method: 'POST',
      body: NOTIFICATION,
      headers: BEARER,
    });
    expect(response.status).toBe(503);
  });

  it('refuses an invalid notification', async () => {
    const { app } = buildTestContext({});
    const response = await requestJson(app, '/api/notify', {
      method: 'POST',
      body: { title: '', message: 'x' },
      headers: BEARER,
    });
    expect(response.status).toBe(400);
  });
});
