import { randomUUID } from 'node:crypto';
import { sql } from 'drizzle-orm';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import {
  type AuthenticatedApp,
  buildAuthenticatedApp,
  jsonRequest,
  readJson,
} from '../../../test/auth-utils';
import { testDatabase, truncateAllTables } from '../../../test/database-utils';
import {
  configureVapidKeys,
  deviceEndpoint,
  readSentNotifications,
  stubPushService,
  subscribeDevice,
  turnCategory,
  VAPID_PUBLIC_KEY,
} from '../../../test/push-utils';
import { buildTakeObjectKey } from '../takes/takes.core';
import { takeTable } from '../takes/takes.schema';
import { hasClaimedDispatch } from './notifications.repository';
import { notificationPreferenceTable, pushSubscriptionTable } from './notifications.schema';

const PUSH_SEND_DEADLINE_MILLISECONDS = 5_000;
const ELEVEN_MINUTES_MILLISECONDS = 11 * 60 * 1000;

const preferencesEnvelope = z.object({
  preferences: z.array(z.object({ category: z.string(), enabled: z.boolean() })),
});
const idEnvelope = (key: string) => z.object({ [key]: z.object({ id: z.string().uuid() }) });

interface Band {
  readonly hugo: AuthenticatedApp;
  readonly lea: AuthenticatedApp;
  readonly sam: AuthenticatedApp;
}

async function createId(
  member: AuthenticatedApp,
  path: string,
  key: string,
  body: unknown,
): Promise<string> {
  const response = await jsonRequest(member.app, path, {
    method: 'POST',
    body,
    cookieHeader: member.cookieHeader,
  });
  const created = (await readJson(response, idEnvelope(key)))[key];
  if (created === undefined) throw new Error(`no ${key} in the response`);
  return created.id;
}

async function postTake(member: AuthenticatedApp, songId: string): Promise<Response> {
  const id = randomUUID();
  return await jsonRequest(member.app, '/api/takes', {
    method: 'POST',
    body: {
      id,
      objectKey: buildTakeObjectKey({ songId, takeId: id, contentType: 'audio/webm' }),
      songId,
      recordedAt: '2026-10-23T19:00:00.000Z',
      durationSeconds: 232,
      contentType: 'audio/webm',
      source: 'live',
      queued: false,
    },
    cookieHeader: member.cookieHeader,
  });
}

async function createSong(member: AuthenticatedApp): Promise<string> {
  return await createId(member, '/api/songs', 'song', {
    title: 'Seven Nation Army',
    status: 'idea',
  });
}

async function buildBand(): Promise<Band> {
  const hugo = await buildAuthenticatedApp('Hugo');
  const lea = await buildAuthenticatedApp('Léa');
  const sam = await buildAuthenticatedApp('Sam');
  await subscribeDevice(hugo, 'hugo-phone');
  await subscribeDevice(lea, 'lea-phone');
  await subscribeDevice(lea, 'lea-laptop');
  await subscribeDevice(sam, 'sam-phone');
  return { hugo, lea, sam };
}

async function listStoredEndpoints(): Promise<string[]> {
  const rows = await testDatabase()
    .select({ endpoint: pushSubscriptionTable.endpoint })
    .from(pushSubscriptionTable);
  return rows.map((row) => row.endpoint).sort();
}

beforeEach(async () => {
  await truncateAllTables(testDatabase());
  vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

// @FollowsBlueprint test-back-e2e
describe('notifications controller (back-e2e)', () => {
  describe('the VAPID public key', () => {
    it('is given to a member once the stage holds its key pair', async () => {
      configureVapidKeys();
      const hugo = await buildAuthenticatedApp('Hugo');
      const response = await jsonRequest(hugo.app, '/api/notifications/vapid-public-key', {
        cookieHeader: hugo.cookieHeader,
      });
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ key: VAPID_PUBLIC_KEY });
    });

    it('answers 503 push-not-configured while the stage holds no key pair', async () => {
      const hugo = await buildAuthenticatedApp('Hugo');
      const response = await jsonRequest(hugo.app, '/api/notifications/vapid-public-key', {
        cookieHeader: hugo.cookieHeader,
      });
      expect(response.status).toBe(503);
      expect(await response.json()).toEqual({ error: 'push-not-configured' });
    });

    it('refuses a visitor without a member session', async () => {
      const hugo = await buildAuthenticatedApp('Hugo');
      const response = await jsonRequest(hugo.app, '/api/notifications/vapid-public-key');
      expect(response.status).toBe(401);
    });
  });

  describe('subscriptions', () => {
    it('keeps one subscription per device, owned by the member who last subscribed it', async () => {
      const hugo = await buildAuthenticatedApp('Hugo');
      const lea = await buildAuthenticatedApp('Léa');
      expect((await subscribeDevice(hugo, 'shared-tablet')).status).toBe(201);
      expect((await subscribeDevice(lea, 'shared-tablet')).status).toBe(201);
      const rows = await testDatabase().select().from(pushSubscriptionTable);
      expect(rows).toMatchObject([
        {
          memberId: lea.memberId,
          endpoint: deviceEndpoint('shared-tablet'),
          p256dh: 'shared-tablet-key',
          auth: 'shared-tablet-auth',
        },
      ]);
    });

    it('keeps one subscription when a device subscribes twice at the same moment', async () => {
      const hugo = await buildAuthenticatedApp('Hugo');
      const answers = await Promise.all([
        subscribeDevice(hugo, 'hugo-phone'),
        subscribeDevice(hugo, 'hugo-phone'),
      ]);
      expect(answers.map((answer) => answer.status)).toEqual([201, 201]);
      expect(await listStoredEndpoints()).toEqual([deviceEndpoint('hugo-phone')]);
    });

    it('refuses an endpoint that is not https', async () => {
      const hugo = await buildAuthenticatedApp('Hugo');
      const response = await jsonRequest(hugo.app, '/api/notifications/subscriptions', {
        method: 'POST',
        body: { endpoint: 'http://push.example/a', keys: { p256dh: 'k', auth: 'a' } },
        cookieHeader: hugo.cookieHeader,
      });
      expect(response.status).toBe(400);
    });

    it('forgets a device that unsubscribes', async () => {
      const hugo = await buildAuthenticatedApp('Hugo');
      await subscribeDevice(hugo, 'hugo-phone');
      const response = await jsonRequest(hugo.app, '/api/notifications/subscriptions', {
        method: 'DELETE',
        body: { endpoint: deviceEndpoint('hugo-phone') },
        cookieHeader: hugo.cookieHeader,
      });
      expect(await response.json()).toEqual({ ok: true });
      expect(await listStoredEndpoints()).toEqual([]);
    });
  });

  describe('preferences', () => {
    it('reads every category as on before the member touches one', async () => {
      const hugo = await buildAuthenticatedApp('Hugo');
      const response = await jsonRequest(hugo.app, '/api/notifications/preferences', {
        cookieHeader: hugo.cookieHeader,
      });
      expect(await readJson(response, preferencesEnvelope)).toEqual({
        preferences: [
          { category: 'takes', enabled: true },
          { category: 'take_comments', enabled: true },
          { category: 'sessions', enabled: true },
          { category: 'setlists', enabled: true },
        ],
      });
    });

    it('saves one toggle for that member only and answers the whole list', async () => {
      const hugo = await buildAuthenticatedApp('Hugo');
      const lea = await buildAuthenticatedApp('Léa');
      await turnCategory(hugo, 'sessions', true);
      const response = await turnCategory(hugo, 'sessions', false);
      expect((await readJson(response, preferencesEnvelope)).preferences).toContainEqual({
        category: 'sessions',
        enabled: false,
      });
      const ofLea = await jsonRequest(lea.app, '/api/notifications/preferences', {
        cookieHeader: lea.cookieHeader,
      });
      expect((await readJson(ofLea, preferencesEnvelope)).preferences).toContainEqual({
        category: 'sessions',
        enabled: true,
      });
    });

    it('refuses an unknown category', async () => {
      const hugo = await buildAuthenticatedApp('Hugo');
      expect((await turnCategory(hugo, 'emails', false)).status).toBe(400);
    });
  });

  describe('sending after a write', () => {
    it('sends once per device of every other member with the category on, never to the author', async () => {
      configureVapidKeys();
      const send = stubPushService();
      const { hugo, sam } = await buildBand();
      await turnCategory(sam, 'takes', false);
      const songId = await createSong(hugo);

      expect((await postTake(hugo, songId)).status).toBe(201);

      const sent = readSentNotifications(send);
      expect(sent.map((notification) => notification.endpoint).sort()).toEqual([
        deviceEndpoint('lea-laptop'),
        deviceEndpoint('lea-phone'),
      ]);
      expect(sent[0]).toMatchObject({
        messageKey: 'take-created',
        parameters: { actorName: 'Hugo', songTitle: 'Seven Nation Army' },
        url: expect.stringMatching(new RegExp(`^/catalog/${songId}\\?take=`)),
      });
    });

    it('sends nothing for a take the device sends a second time', async () => {
      configureVapidKeys();
      const send = stubPushService();
      const { hugo } = await buildBand();
      const songId = await createSong(hugo);
      const id = randomUUID();
      const body = {
        id,
        objectKey: buildTakeObjectKey({ songId, takeId: id, contentType: 'audio/webm' }),
        songId,
        recordedAt: '2026-10-23T19:00:00.000Z',
        durationSeconds: 232,
        contentType: 'audio/webm',
        source: 'live',
        queued: true,
      };
      const sendTake = async () =>
        await jsonRequest(hugo.app, '/api/takes', {
          method: 'POST',
          body,
          cookieHeader: hugo.cookieHeader,
        });
      await sendTake();
      vi.useFakeTimers({ toFake: ['Date'] });
      vi.setSystemTime(Date.now() + ELEVEN_MINUTES_MILLISECONDS);
      expect((await sendTake()).status).toBe(201);
      expect(send).toHaveBeenCalledTimes(3);
    });

    it('sends one round for a take two tabs send at the same moment', async () => {
      configureVapidKeys();
      const send = stubPushService();
      const { hugo } = await buildBand();
      const songId = await createSong(hugo);
      const id = randomUUID();
      const body = {
        id,
        objectKey: buildTakeObjectKey({ songId, takeId: id, contentType: 'audio/webm' }),
        songId,
        recordedAt: '2026-10-23T19:00:00.000Z',
        durationSeconds: 232,
        contentType: 'audio/webm',
        source: 'live',
        queued: true,
      };
      const sendTake = async () =>
        await jsonRequest(hugo.app, '/api/takes', {
          method: 'POST',
          body,
          cookieHeader: hugo.cookieHeader,
        });

      const answers = await Promise.all([sendTake(), sendTake()]);

      expect(answers.map((answer) => answer.status)).toEqual([201, 201]);
      expect(await testDatabase().select().from(takeTable)).toHaveLength(1);
      expect(send).toHaveBeenCalledTimes(3);
    });

    it('deletes a subscription its push service says is gone, and the write still succeeds', async () => {
      configureVapidKeys();
      const send = stubPushService(
        async () => await Promise.reject(Object.assign(new Error('gone'), { statusCode: 410 })),
      );
      const { hugo } = await buildBand();
      const songId = await createSong(hugo);

      expect((await postTake(hugo, songId)).status).toBe(201);

      expect(send).toHaveBeenCalledTimes(3);
      expect(await listStoredEndpoints()).toEqual([deviceEndpoint('hugo-phone')]);
    });

    it('keeps a subscription whose push service failed, and reports the failure', async () => {
      configureVapidKeys();
      stubPushService(
        async () =>
          await Promise.reject(Object.assign(new Error('unavailable'), { statusCode: 503 })),
      );
      const { hugo } = await buildBand();
      const songId = await createSong(hugo);

      expect((await postTake(hugo, songId)).status).toBe(201);

      expect(await listStoredEndpoints()).toHaveLength(4);
      expect(console.warn).toHaveBeenCalledWith(
        JSON.stringify({ event: 'PushSendFailed', host: 'web.push.apple.com', status: '503' }),
      );
    });

    it('answers the write even when sending fails outright', async () => {
      configureVapidKeys();
      const send = stubPushService();
      const { hugo } = await buildBand();
      const songId = await createSong(hugo);
      await testDatabase().execute(
        sql.raw('ALTER TABLE "notification_dispatch" RENAME TO "notification_dispatch_away"'),
      );
      try {
        expect((await postTake(hugo, songId)).status).toBe(201);
      } finally {
        await testDatabase().execute(
          sql.raw('ALTER TABLE "notification_dispatch_away" RENAME TO "notification_dispatch"'),
        );
      }
      expect(send).not.toHaveBeenCalled();
      expect(console.warn).toHaveBeenCalledWith(
        JSON.stringify({ event: 'NotifyBandFailed', kind: 'take-created' }),
        expect.anything(),
      );
    });

    it('answers the write once the deadline passes, even if a push service never answers', async () => {
      configureVapidKeys();
      stubPushService(async () => await new Promise(() => undefined));
      const { hugo } = await buildBand();
      const songId = await createSong(hugo);
      const startedAt = Date.now();

      expect((await postTake(hugo, songId)).status).toBe(201);

      expect(Date.now() - startedAt).toBeGreaterThanOrEqual(PUSH_SEND_DEADLINE_MILLISECONDS);
      expect(console.warn).toHaveBeenCalledWith(
        JSON.stringify({ event: 'PushSendTimedOut', recipients: 3 }),
      );
    });

    it('sends nothing, and still saves, while the stage holds no key pair', async () => {
      const send = stubPushService();
      const { hugo } = await buildBand();
      const songId = await createSong(hugo);

      expect((await postTake(hugo, songId)).status).toBe(201);

      expect(send).not.toHaveBeenCalled();
    });

    it('sends one notification for a burst of writes to one setlist, and again after ten minutes', async () => {
      configureVapidKeys();
      const send = stubPushService();
      const { hugo, lea } = await buildBand();
      const setlistId = await createId(hugo, '/api/setlists', 'setlist', { name: 'Summer' });
      await jsonRequest(lea.app, `/api/setlists/${setlistId}`, {
        method: 'PUT',
        body: { name: 'Summer tour' },
        cookieHeader: lea.cookieHeader,
      });
      expect(send).toHaveBeenCalledTimes(3);

      vi.useFakeTimers({ toFake: ['Date'] });
      vi.setSystemTime(Date.now() + ELEVEN_MINUTES_MILLISECONDS);
      await jsonRequest(hugo.app, `/api/setlists/${setlistId}`, {
        method: 'PUT',
        body: { name: 'Summer tour 2027' },
        cookieHeader: hugo.cookieHeader,
      });

      expect(send).toHaveBeenCalledTimes(6);
      expect(readSentNotifications(send).at(-1)).toMatchObject({
        messageKey: 'setlist-changed',
        parameters: { actorName: 'Hugo', setlistName: 'Summer tour 2027' },
        url: `/setlists/${setlistId}`,
        tag: `setlist:${setlistId}`,
      });
    });
  });

  describe('a deleted member', () => {
    it('takes their devices and toggles with them', async () => {
      const { hugo, lea } = await buildBand();
      await turnCategory(lea, 'takes', false);

      const response = await jsonRequest(hugo.app, `/api/members/${lea.memberId}`, {
        method: 'DELETE',
        cookieHeader: hugo.cookieHeader,
      });

      expect(response.status).toBe(200);
      expect(await listStoredEndpoints()).toEqual([
        deviceEndpoint('hugo-phone'),
        deviceEndpoint('sam-phone'),
      ]);
      expect(await testDatabase().select().from(notificationPreferenceTable)).toEqual([]);
    });
  });

  describe('claiming a group', () => {
    it('lets exactly one of two concurrent claims win, first send or later', async () => {
      const firstAt = new Date('2026-10-23T20:00:00.000Z');
      const firstClaims = await Promise.all([
        hasClaimedDispatch('setlist:race', null, firstAt),
        hasClaimedDispatch('setlist:race', null, firstAt),
      ]);
      expect(firstClaims.filter(Boolean)).toHaveLength(1);

      const laterAt = new Date('2026-10-23T20:11:00.000Z');
      const laterClaims = await Promise.all([
        hasClaimedDispatch('setlist:race', firstAt, laterAt),
        hasClaimedDispatch('setlist:race', firstAt, laterAt),
      ]);
      expect(laterClaims.filter(Boolean)).toHaveLength(1);
    });
  });
});
