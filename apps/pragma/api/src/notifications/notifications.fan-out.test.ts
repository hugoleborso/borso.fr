import { randomUUID } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import {
  type AuthenticatedApp,
  buildAuthenticatedApp,
  type JsonRequestOptions,
  jsonRequest,
  readJson,
} from '../../../test/auth-utils';
import { testDatabase, truncateAllTables } from '../../../test/database-utils';
import {
  configureVapidKeys,
  deviceEndpoint,
  readSentNotifications,
  type SentNotification,
  stubPushService,
  subscribeDevice,
  turnCategory,
} from '../../../test/push-utils';
import { buildTakeObjectKey } from '../takes/takes.core';

const ELEVEN_MINUTES_MILLISECONDS = 11 * 60 * 1000;
const SESSION_DATE = '2026-10-30T18:00:00.000Z';

const idEnvelope = (key: string) => z.object({ [key]: z.object({ id: z.string().uuid() }) });

interface FanOutContext {
  readonly hugo: AuthenticatedApp;
  readonly lea: AuthenticatedApp;
  readonly send: ReturnType<typeof stubPushService>;
}

async function writeAs(
  member: AuthenticatedApp,
  path: string,
  options: JsonRequestOptions,
): Promise<Response> {
  return await jsonRequest(member.app, path, { ...options, cookieHeader: member.cookieHeader });
}

async function createId(
  member: AuthenticatedApp,
  path: string,
  key: string,
  body: unknown,
): Promise<string> {
  const response = await writeAs(member, path, { method: 'POST', body });
  const created = (await readJson(response, idEnvelope(key)))[key];
  if (created === undefined) throw new Error(`no ${key} in the response`);
  return created.id;
}

async function createSong(band: FanOutContext, title: string): Promise<string> {
  return await createId(band.lea, '/api/songs', 'song', { title, status: 'idea' });
}

function startNextGroupWindow(): void {
  vi.setSystemTime(Date.now() + ELEVEN_MINUTES_MILLISECONDS);
}

function lastSentToLea(band: FanOutContext): SentNotification | undefined {
  return readSentNotifications(band.send).findLast(
    (notification) => notification.endpoint === deviceEndpoint('lea-phone'),
  );
}

function sentCount(band: FanOutContext): number {
  return band.send.mock.calls.length;
}

async function prepareBand(): Promise<FanOutContext> {
  configureVapidKeys();
  const send = stubPushService();
  const hugo = await buildAuthenticatedApp('Hugo');
  const lea = await buildAuthenticatedApp('Léa');
  await subscribeDevice(hugo, 'hugo-phone');
  await subscribeDevice(lea, 'lea-phone');
  return { hugo, lea, send };
}

beforeEach(async () => {
  await truncateAllTables(testDatabase());
  vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
  vi.useFakeTimers({ toFake: ['Date'] });
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

// @FollowsBlueprint test-back-e2e
describe('the writes that notify the band (back-e2e)', () => {
  it('a comment on a take, under its own toggle', async () => {
    const band = await prepareBand();
    const songId = await createSong(band, 'Valerie');
    const takeId = randomUUID();
    await writeAs(band.lea, '/api/takes', {
      method: 'POST',
      body: {
        id: takeId,
        objectKey: buildTakeObjectKey({ songId, takeId, contentType: 'audio/mp4' }),
        songId,
        recordedAt: SESSION_DATE,
        durationSeconds: 180,
        contentType: 'audio/mp4',
        source: 'upload',
        queued: false,
      },
    });
    await writeAs(band.hugo, `/api/takes/${takeId}/comments`, {
      method: 'POST',
      body: { body: 'the bass comes in late', atSeconds: 102 },
    });
    expect(lastSentToLea(band)).toMatchObject({
      messageKey: 'take-comment-created',
      parameters: { actorName: 'Hugo', songTitle: 'Valerie' },
      url: `/catalog/${songId}?take=${takeId}`,
    });

    startNextGroupWindow();
    await turnCategory(band.lea, 'take_comments', false);
    const before = sentCount(band);
    await writeAs(band.hugo, `/api/takes/${takeId}/comments`, {
      method: 'POST',
      body: { body: 'and the chorus is rushed', atSeconds: null },
    });
    expect(sentCount(band)).toBe(before);
  });

  it('a session created, then changed, grouped on that session', async () => {
    const band = await prepareBand();
    const sessionId = await createId(band.hugo, '/api/sessions', 'session', {
      kind: 'practice',
      date: SESSION_DATE,
    });
    expect(lastSentToLea(band)).toMatchObject({
      messageKey: 'session-created',
      parameters: { actorName: 'Hugo', sessionDate: SESSION_DATE },
      url: `/sessions/${sessionId}`,
    });
    const afterCreate = sentCount(band);
    await writeAs(band.hugo, `/api/sessions/${sessionId}`, {
      method: 'PUT',
      body: { date: '2026-10-31T18:00:00.000Z' },
    });
    expect(sentCount(band)).toBe(afterCreate);

    startNextGroupWindow();
    await writeAs(band.hugo, `/api/sessions/${sessionId}`, {
      method: 'PUT',
      body: { date: '2026-11-01T18:00:00.000Z' },
    });
    expect(lastSentToLea(band)).toMatchObject({
      messageKey: 'session-changed',
      parameters: { sessionDate: '2026-11-01T18:00:00.000Z' },
    });
  });

  it('every kind of setlist edit, each once its window has passed', async () => {
    const band = await prepareBand();
    const songA = await createSong(band, 'Valerie');
    const songB = await createSong(band, 'Rehab');
    const sessionId = await createId(band.lea, '/api/sessions', 'session', {
      kind: 'practice',
      date: SESSION_DATE,
    });
    const setlistId = await createId(band.hugo, '/api/setlists', 'setlist', { name: 'Fête' });
    const entryA = await createId(band.lea, `/api/setlists/${setlistId}/entries`, 'entry', {
      songId: songA,
    });
    const entryB = await createId(band.lea, `/api/setlists/${setlistId}/entries`, 'entry', {
      songId: songB,
    });
    const edits: readonly [string, JsonRequestOptions][] = [
      [`/api/setlists/${setlistId}/entries`, { method: 'POST', body: { songId: songA } }],
      [
        `/api/setlists/${setlistId}/entries/${entryA}`,
        { method: 'PUT', body: { lineupOverride: { [band.lea.memberId]: [randomUUID()] } } },
      ],
      [`/api/setlists/${setlistId}/reorder`, { method: 'PUT', body: { entryIds: [] } }],
      [`/api/setlists/${setlistId}/sessions`, { method: 'POST', body: { sessionId } }],
      [`/api/setlists/${setlistId}/sessions/${sessionId}`, { method: 'DELETE' }],
      [`/api/setlists/${setlistId}/entries/${entryB}`, { method: 'DELETE' }],
    ];
    for (const [path, options] of edits) {
      startNextGroupWindow();
      const before = sentCount(band);
      const resolved = path.endsWith('/reorder')
        ? { ...options, body: { entryIds: await readEntryIds(band, setlistId) } }
        : options;
      expect((await writeAs(band.hugo, path, resolved)).ok).toBe(true);
      expect(sentCount(band)).toBe(before + 1);
      expect(lastSentToLea(band)).toMatchObject({
        messageKey: 'setlist-changed',
        parameters: { actorName: 'Hugo', setlistName: 'Fête' },
        url: `/setlists/${setlistId}`,
      });
    }
  });

  it('a transition comment, grouped on its pair of songs', async () => {
    const band = await prepareBand();
    const songA = await createSong(band, 'Valerie');
    const songB = await createSong(band, 'Rehab');
    await writeAs(band.hugo, `/api/transition-comments/${songA}/${songB}`, {
      method: 'PUT',
      body: { comment: 'segue on the snare' },
    });
    expect(lastSentToLea(band)).toMatchObject({
      messageKey: 'transition-changed',
      parameters: { actorName: 'Hugo', songATitle: 'Valerie', songBTitle: 'Rehab' },
      url: `/catalog/${songA}`,
      tag: `transition:${songA}:${songB}`,
    });
  });

  it('a song whose default lineup changed, and only then', async () => {
    const band = await prepareBand();
    const songId = await createSong(band, 'Valerie');
    const before = sentCount(band);
    await writeAs(band.hugo, `/api/songs/${songId}`, {
      method: 'PUT',
      body: { notes: 'capo 2' },
    });
    await writeAs(band.hugo, `/api/songs/${songId}`, {
      method: 'PUT',
      body: { defaultLineup: {} },
    });
    expect(sentCount(band)).toBe(before);

    await writeAs(band.hugo, `/api/songs/${songId}`, {
      method: 'PUT',
      body: { defaultLineup: { [band.lea.memberId]: [randomUUID()] } },
    });
    expect(lastSentToLea(band)).toMatchObject({
      messageKey: 'song-lineup-changed',
      parameters: { actorName: 'Hugo', songTitle: 'Valerie' },
      url: `/catalog/${songId}`,
    });
  });
});

const entriesEnvelope = z.object({ entries: z.array(z.object({ id: z.string() })) });

async function readEntryIds(band: FanOutContext, setlistId: string): Promise<string[]> {
  const response = await writeAs(band.hugo, `/api/setlists/${setlistId}/entries`, {});
  return (await readJson(response, entriesEnvelope)).entries.map((entry) => entry.id).reverse();
}
