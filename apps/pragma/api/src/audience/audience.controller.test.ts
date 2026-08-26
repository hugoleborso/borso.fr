import type { Hono } from 'hono';
import { beforeEach, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { buildAuthenticatedApp, jsonRequest, readJson } from '../../../test/auth-utils';
import { testDatabase, truncateAllTables } from '../../../test/database-utils';
import { externalSearchCacheTable } from '../songs/songs.schema';
import { AUDIENCE_SEARCH_BUDGET } from './audience-search-limit.middleware';

const UNKNOWN_ID = '00000000-0000-0000-0000-000000000000';
const A_BALLOT = 'a'.repeat(48);
const ANOTHER_BALLOT = 'b'.repeat(48);
const UNAUTHORISED = 401;
const ROUND_DURATION_MS = 30_000;
const SETTLEMENT_TEST_TIMEOUT_MS = 90_000;
const CACHE_LIFETIME_MS = 60_000;

const roundSchema = z.object({
  id: z.string().uuid(),
  openedAt: z.string(),
  closesAt: z.string(),
  remainingSeconds: z.number(),
  isOpen: z.boolean(),
  isSettled: z.boolean(),
  winningSongId: z.string().uuid().nullable(),
});
const roundEnvelope = z.object({ round: roundSchema });
const stateEnvelope = z.object({
  state: z.object({
    round: roundSchema.nullable(),
    pool: z.array(
      z.object({
        songId: z.string().uuid(),
        title: z.string(),
        status: z.string(),
        voteCount: z.number(),
        isSuggestion: z.boolean(),
      }),
    ),
    ownVotes: z.array(z.string().uuid()),
    ballotCount: z.number(),
    capacity: z.number().nullable(),
  }),
});
const setlistsEnvelope = z.object({
  setlists: z.array(z.object({ id: z.string().uuid(), kind: z.string(), songCount: z.number() })),
});

function ballotHeaders(ballotToken: string): Readonly<Record<string, string>> {
  return { 'x-ballot-token': ballotToken };
}

async function createConcert(app: Hono, cookieHeader: string): Promise<string> {
  const created = await jsonRequest(app, '/api/sessions', {
    method: 'POST',
    cookieHeader,
    body: {
      kind: 'concert',
      date: new Date().toISOString(),
      venue: 'La Cave',
      capacity: 120,
      gear: '',
    },
  });
  const body = await readJson(created, z.object({ session: z.object({ id: z.string().uuid() }) }));
  return body.session.id;
}

async function seedSearchCache(query: string): Promise<void> {
  await testDatabase()
    .insert(externalSearchCacheTable)
    .values({
      normalizedQuery: query,
      hits: JSON.stringify([]),
      expiresAt: new Date(Date.now() + CACHE_LIFETIME_MS),
    });
}

async function createConcertReadySong(app: Hono, cookieHeader: string, title: string) {
  const created = await jsonRequest(app, '/api/songs', {
    method: 'POST',
    cookieHeader,
    body: { title, artist: 'The Band', status: 'concert_ready' },
  });
  const body = await readJson(created, z.object({ song: z.object({ id: z.string().uuid() }) }));
  return body.song.id;
}

// @FollowsBlueprint test-back-e2e
describe('audience controller (back-e2e)', () => {
  beforeEach(async () => {
    await truncateAllTables(testDatabase());
  });

  it('answers every public route without a session cookie and gates the two band routes', async () => {
    const { app, cookieHeader } = await buildAuthenticatedApp();
    const sessionId = await createConcert(app, cookieHeader);

    const publicResponses = await Promise.all([
      jsonRequest(app, '/api/audience/live'),
      jsonRequest(app, `/api/audience/concerts/${sessionId}/ballot`, { method: 'POST' }),
      jsonRequest(app, `/api/audience/concerts/${sessionId}/state`),
      jsonRequest(app, `/api/audience/rounds/${UNKNOWN_ID}/votes`, {
        method: 'POST',
        body: { songId: UNKNOWN_ID },
        extraHeaders: ballotHeaders(A_BALLOT),
      }),
      jsonRequest(app, `/api/audience/rounds/${UNKNOWN_ID}/votes/${UNKNOWN_ID}`, {
        method: 'DELETE',
        extraHeaders: ballotHeaders(A_BALLOT),
      }),
      jsonRequest(app, `/api/audience/concerts/${sessionId}/suggestions`, {
        method: 'POST',
        body: { mbid: 'mb-unknown' },
        extraHeaders: ballotHeaders(A_BALLOT),
      }),
    ]);
    for (const response of publicResponses) {
      expect(response.status).not.toBe(UNAUTHORISED);
    }

    const gatedResponses = await Promise.all([
      jsonRequest(app, `/api/audience/concerts/${sessionId}/rounds`, { method: 'POST' }),
      jsonRequest(app, `/api/audience/concerts/${sessionId}/rounds`),
    ]);
    for (const response of gatedResponses) {
      expect(response.status).toBe(UNAUTHORISED);
    }
  });

  it('refuses a vote and a suggestion from a browser carrying no ballot', async () => {
    const { app, cookieHeader } = await buildAuthenticatedApp();
    const sessionId = await createConcert(app, cookieHeader);
    const vote = await jsonRequest(app, `/api/audience/rounds/${UNKNOWN_ID}/votes`, {
      method: 'POST',
      body: { songId: UNKNOWN_ID },
    });
    const suggestion = await jsonRequest(app, `/api/audience/concerts/${sessionId}/suggestions`, {
      method: 'POST',
      body: { mbid: 'mb-1' },
    });
    expect(vote.status).toBe(UNAUTHORISED);
    expect(suggestion.status).toBe(UNAUTHORISED);
  });

  it('refuses a round on a practice, because rounds belong to concerts', async () => {
    const { app, cookieHeader } = await buildAuthenticatedApp();
    const practice = await jsonRequest(app, '/api/sessions', {
      method: 'POST',
      cookieHeader,
      body: { kind: 'practice', date: new Date().toISOString() },
    });
    const body = await readJson(
      practice,
      z.object({ session: z.object({ id: z.string().uuid() }) }),
    );
    const opened = await jsonRequest(app, `/api/audience/concerts/${body.session.id}/rounds`, {
      method: 'POST',
      cookieHeader,
    });
    expect(opened.status).toBe(422);
  });

  it('refuses a second round while one is running on that concert', async () => {
    const { app, cookieHeader } = await buildAuthenticatedApp();
    const sessionId = await createConcert(app, cookieHeader);
    const first = await jsonRequest(app, `/api/audience/concerts/${sessionId}/rounds`, {
      method: 'POST',
      cookieHeader,
    });
    const second = await jsonRequest(app, `/api/audience/concerts/${sessionId}/rounds`, {
      method: 'POST',
      cookieHeader,
    });
    expect(first.status).toBe(201);
    expect(second.status).toBe(409);
  });

  it('creates the audience-choice setlist at the first round and refuses to rename it', async () => {
    const { app, cookieHeader } = await buildAuthenticatedApp();
    const sessionId = await createConcert(app, cookieHeader);
    const before = await readJson(
      await jsonRequest(app, `/api/setlists/by-session/${sessionId}`, { cookieHeader }),
      setlistsEnvelope,
    );
    expect(before.setlists).toEqual([]);

    await jsonRequest(app, `/api/audience/concerts/${sessionId}/rounds`, {
      method: 'POST',
      cookieHeader,
    });
    const after = await readJson(
      await jsonRequest(app, `/api/setlists/by-session/${sessionId}`, { cookieHeader }),
      setlistsEnvelope,
    );
    expect(after.setlists.map((setlist) => setlist.kind)).toEqual(['audience_choice']);

    const rename = await jsonRequest(app, `/api/setlists/${after.setlists[0]?.id ?? ''}`, {
      method: 'PUT',
      cookieHeader,
      body: { name: 'Encore' },
    });
    expect(rename.status).toBe(409);
  });

  it('answers the public search without a session cookie and bars an address that hammers it', async () => {
    const { app } = await buildAuthenticatedApp();
    await seedSearchCache('lucky');
    const fromOneAddress = () =>
      jsonRequest(app, '/api/audience/search?q=lucky', {
        extraHeaders: { 'x-forwarded-for': '203.0.113.7' },
      });
    const first = await fromOneAddress();
    expect(first.status).toBe(200);

    let lastStatus = first.status;
    for (let attempt = 0; attempt < AUDIENCE_SEARCH_BUDGET.maxAttempts; attempt += 1) {
      lastStatus = (await fromOneAddress()).status;
    }
    expect(lastStatus).toBe(429);
  });

  it('refuses a suggestion body carrying free text beside the picked result', async () => {
    const { app, cookieHeader } = await buildAuthenticatedApp();
    const sessionId = await createConcert(app, cookieHeader);
    const refused = await jsonRequest(app, `/api/audience/concerts/${sessionId}/suggestions`, {
      method: 'POST',
      extraHeaders: ballotHeaders(A_BALLOT),
      body: { mbid: 'mb-1', title: 'anything the room typed' },
    });
    expect(refused.status).toBe(400);
  });

  it('reads the state with no ballot at all, and answers an empty own-vote list', async () => {
    const { app, cookieHeader } = await buildAuthenticatedApp();
    const sessionId = await createConcert(app, cookieHeader);
    await createConcertReadySong(app, cookieHeader, 'Riff');
    const state = await readJson(
      await jsonRequest(app, `/api/audience/concerts/${sessionId}/state`),
      stateEnvelope,
    );
    expect(state.state.ownVotes).toEqual([]);
    expect(state.state.pool.map((entry) => entry.title)).toEqual(['Riff']);
    expect(state.state.capacity).toBe(120);
  });

  it('resolves the short address to the concert with an open round, and to nothing otherwise', async () => {
    const { app, cookieHeader } = await buildAuthenticatedApp();
    const sessionId = await createConcert(app, cookieHeader);
    const liveEnvelope = z.object({ sessionId: z.string().uuid().nullable() });
    const atRest = await readJson(await jsonRequest(app, '/api/audience/live'), liveEnvelope);
    expect(atRest.sessionId).toBe(null);

    await jsonRequest(app, `/api/audience/concerts/${sessionId}/rounds`, {
      method: 'POST',
      cookieHeader,
    });
    const duringRound = await readJson(await jsonRequest(app, '/api/audience/live'), liveEnvelope);
    expect(duringRound.sessionId).toBe(sessionId);
  });

  it('takes one vote per song per ballot, and refuses a song outside the pool', async () => {
    const { app, cookieHeader } = await buildAuthenticatedApp();
    const sessionId = await createConcert(app, cookieHeader);
    const riffSongId = await createConcertReadySong(app, cookieHeader, 'Riff');
    const balladSongId = await createConcertReadySong(app, cookieHeader, 'Ballad');
    const opened = await readJson(
      await jsonRequest(app, `/api/audience/concerts/${sessionId}/rounds`, {
        method: 'POST',
        cookieHeader,
      }),
      roundEnvelope,
    );

    const castVote = (songId: string, ballotToken: string) =>
      jsonRequest(app, `/api/audience/rounds/${opened.round.id}/votes`, {
        method: 'POST',
        body: { songId },
        extraHeaders: ballotHeaders(ballotToken),
      });

    expect((await castVote(riffSongId, A_BALLOT)).status).toBe(201);
    expect((await castVote(riffSongId, A_BALLOT)).status).toBe(409);
    expect((await castVote(balladSongId, A_BALLOT)).status).toBe(201);
    expect((await castVote(riffSongId, ANOTHER_BALLOT)).status).toBe(201);
    expect((await castVote(UNKNOWN_ID, A_BALLOT)).status).toBe(422);

    const state = await readJson(
      await jsonRequest(app, `/api/audience/concerts/${sessionId}/state`, {
        extraHeaders: ballotHeaders(A_BALLOT),
      }),
      stateEnvelope,
    );
    expect(state.state.ownVotes.toSorted()).toEqual([riffSongId, balladSongId].toSorted());
    expect(state.state.ballotCount).toBe(2);

    const retracted = await jsonRequest(
      app,
      `/api/audience/rounds/${opened.round.id}/votes/${riffSongId}`,
      { method: 'DELETE', extraHeaders: ballotHeaders(A_BALLOT) },
    );
    expect(retracted.status).toBe(200);
  });

  it(
    'settles once at the close, appends one entry, and drops the winner from the pool',
    async () => {
      const { app, cookieHeader } = await buildAuthenticatedApp();
      const sessionId = await createConcert(app, cookieHeader);
      const riffSongId = await createConcertReadySong(app, cookieHeader, 'Riff');
      await createConcertReadySong(app, cookieHeader, 'Ballad');
      const opened = await readJson(
        await jsonRequest(app, `/api/audience/concerts/${sessionId}/rounds`, {
          method: 'POST',
          cookieHeader,
        }),
        roundEnvelope,
      );
      await jsonRequest(app, `/api/audience/rounds/${opened.round.id}/votes`, {
        method: 'POST',
        body: { songId: riffSongId },
        extraHeaders: ballotHeaders(A_BALLOT),
      });

      await new Promise((resolve) => setTimeout(resolve, ROUND_DURATION_MS));

      const [firstRead, secondRead] = await Promise.all([
        jsonRequest(app, `/api/audience/concerts/${sessionId}/state`),
        jsonRequest(app, `/api/audience/concerts/${sessionId}/state`),
      ]);
      const settled = await readJson(firstRead, stateEnvelope);
      expect(secondRead.status).toBe(200);
      expect(settled.state.round?.isSettled).toBe(true);
      expect(settled.state.round?.winningSongId).toBe(riffSongId);
      expect(settled.state.pool.map((entry) => entry.title)).toEqual(['Ballad']);

      const setlists = await readJson(
        await jsonRequest(app, `/api/setlists/by-session/${sessionId}`, { cookieHeader }),
        setlistsEnvelope,
      );
      expect(setlists.setlists.map((setlist) => setlist.songCount)).toEqual([1]);

      const reopened = await jsonRequest(app, `/api/audience/concerts/${sessionId}/rounds`, {
        method: 'POST',
        cookieHeader,
      });
      expect(reopened.status).toBe(201);
    },
    SETTLEMENT_TEST_TIMEOUT_MS,
  );
});
