import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildTestContext, requestJson, signIn, useTestSecrets } from '../../../test/app-utils';
import { truncateAllTables } from '../../../test/database-utils';
import { getDatabase } from '../database/client';
import { routineRunTable } from './routine.schema';

const FIRE_URL = 'https://api.anthropic.com/v1/routines/r1/fire';
const SESSION_URL = 'https://claude.ai/code/session_01ExempleInvente';
const UUID_PATTERN = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/;

function configureRoutine(): void {
  useTestSecrets({ 'fire-url': FIRE_URL, 'fire-token': 'jeton', 'secret-phrase': 'phrase' });
}

function answerFireWith(answer: () => Response) {
  const fetcher = vi.fn(async () => await Promise.resolve(answer()));
  vi.stubGlobal('fetch', fetcher);
  return fetcher;
}

function answerFireWithSession(sessionUrl: string) {
  return answerFireWith(() =>
    Response.json({
      type: 'routine_fire',
      claude_code_session_id: 'session_01ExempleInvente',
      claude_code_session_url: sessionUrl,
    }),
  );
}

beforeEach(async () => {
  await truncateAllTables();
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-11-11T09:00:00Z'));
  return () => {
    vi.useRealTimers();
  };
});

afterEach(() => {
  vi.unstubAllGlobals();
});

// @FollowsBlueprint test-back-e2e
describe('POST /api/routine/runs', () => {
  it('fires the routine with the whole message, stores the run and answers it', async () => {
    const fetcher = answerFireWithSession(SESSION_URL);
    const { app } = buildTestContext();
    configureRoutine();
    const message = `Rappelle Julie ${'a'.repeat(300)}`;
    const response = await requestJson(app, '/api/routine/runs', {
      method: 'POST',
      body: { text: `  ${message}\n` },
      cookie: await signIn(),
    });
    expect(response.status).toBe(201);
    const run: { id: string } = await response.json();
    expect(run).toEqual({
      id: expect.stringMatching(UUID_PATTERN),
      firedAt: '2026-11-11T09:00:00.000Z',
      trigger: 'message',
      subject: message.slice(0, 200),
      sessionUrl: SESSION_URL,
    });
    expect(fetcher).toHaveBeenCalledWith(
      FIRE_URL,
      expect.objectContaining({ body: JSON.stringify({ text: `phrase\nmessage: ${message}` }) }),
    );
    expect(await getDatabase().select().from(routineRunTable)).toEqual([
      {
        id: run.id,
        firedAt: new Date('2026-11-11T09:00:00Z'),
        trigger: 'message',
        subject: message.slice(0, 200),
        sessionUrl: SESSION_URL,
      },
    ]);
  });

  it('stores no address when the answer names another site', async () => {
    answerFireWithSession('https://exemple.fr/code/session_01ExempleInvente');
    const { app } = buildTestContext();
    configureRoutine();
    const response = await requestJson(app, '/api/routine/runs', {
      method: 'POST',
      body: { text: 'Bonjour' },
      cookie: await signIn(),
    });
    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({ subject: 'Bonjour', sessionUrl: null });
  });

  it('answers 503 and stores nothing while no fire url is configured', async () => {
    const fetcher = answerFireWithSession(SESSION_URL);
    const { app } = buildTestContext();
    const response = await requestJson(app, '/api/routine/runs', {
      method: 'POST',
      body: { text: 'Bonjour' },
      cookie: await signIn(),
    });
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: "Talos n'est pas encore configuré." });
    expect(fetcher).not.toHaveBeenCalled();
    expect(await getDatabase().select().from(routineRunTable)).toEqual([]);
  });

  it('answers 502 and stores nothing when the routine refuses the fire', async () => {
    answerFireWith(() => new Response('{}', { status: 500 }));
    const { app } = buildTestContext();
    configureRoutine();
    const response = await requestJson(app, '/api/routine/runs', {
      method: 'POST',
      body: { text: 'Bonjour' },
      cookie: await signIn(),
    });
    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ error: "Talos n'a pas pu être lancé." });
    expect(await getDatabase().select().from(routineRunTable)).toEqual([]);
  });

  it('answers 502 and stores nothing when the network fails', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => await Promise.reject(new Error('réseau coupé'))),
    );
    const { app } = buildTestContext();
    configureRoutine();
    const response = await requestJson(app, '/api/routine/runs', {
      method: 'POST',
      body: { text: 'Bonjour' },
      cookie: await signIn(),
    });
    expect(response.status).toBe(502);
    expect(await getDatabase().select().from(routineRunTable)).toEqual([]);
    vi.restoreAllMocks();
  });

  it.each([
    ['an empty message', { text: '  ' }],
    ['a message of more than 4000 characters', { text: 'a'.repeat(4001) }],
    ['a message holding a NUL character', { text: 'a\u0000b' }],
  ])('refuses %s without firing', async (_label, body) => {
    const fetcher = answerFireWithSession(SESSION_URL);
    const { app } = buildTestContext();
    configureRoutine();
    const response = await requestJson(app, '/api/routine/runs', {
      method: 'POST',
      body,
      cookie: await signIn(),
    });
    expect(response.status).toBe(400);
    expect(fetcher).not.toHaveBeenCalled();
    expect(await getDatabase().select().from(routineRunTable)).toEqual([]);
  });

  it('refuses a caller without a session', async () => {
    const fetcher = answerFireWithSession(SESSION_URL);
    const { app } = buildTestContext();
    configureRoutine();
    const response = await requestJson(app, '/api/routine/runs', {
      method: 'POST',
      body: { text: 'Bonjour' },
    });
    expect(response.status).toBe(401);
    expect(fetcher).not.toHaveBeenCalled();
  });
});

describe('GET /api/routine/runs', () => {
  it('answers the 20 most recent runs, newest first', async () => {
    answerFireWithSession(SESSION_URL);
    const { app } = buildTestContext();
    configureRoutine();
    const cookie = await signIn();
    for (let minute = 0; minute < 22; minute += 1) {
      vi.setSystemTime(new Date(Date.UTC(2026, 10, 11, 9, minute)));
      await requestJson(app, '/api/routine/runs', {
        method: 'POST',
        body: { text: `message ${String(minute)}` },
        cookie,
      });
    }
    const response = await requestJson(app, '/api/routine/runs', { cookie });
    expect(response.status).toBe(200);
    const listed: { items: { subject: string; firedAt: string }[] } = await response.json();
    expect(listed.items).toHaveLength(20);
    expect(listed.items.map((run) => run.subject)).toEqual(
      Array.from({ length: 20 }, (_unused, rank) => `message ${String(21 - rank)}`),
    );
    expect(listed.items[0]).toMatchObject({
      firedAt: '2026-11-11T09:21:00.000Z',
      trigger: 'message',
      sessionUrl: SESSION_URL,
    });
  });

  it('answers an empty list while nothing was fired', async () => {
    const { app } = buildTestContext();
    const response = await requestJson(app, '/api/routine/runs', { cookie: await signIn() });
    expect(await response.json()).toEqual({ items: [] });
  });

  it('refuses a caller without a session', async () => {
    const { app } = buildTestContext();
    const response = await requestJson(app, '/api/routine/runs');
    expect(response.status).toBe(401);
  });
});
