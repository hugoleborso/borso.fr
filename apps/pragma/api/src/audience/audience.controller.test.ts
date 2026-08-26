import type { Hono } from 'hono';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { buildAuthenticatedApp, jsonRequest, readJson } from '../../../test/auth-utils';
import { testDatabase, truncateAllTables } from '../../../test/database-utils';
import { externalSearchCacheTable } from '../songs/songs.schema';
import { AUDIENCE_SEARCH_BUDGET, AUDIENCE_WRITE_BUDGET } from './audience-rate-limit.middleware';

const UNKNOWN_ID = '00000000-0000-0000-0000-000000000000';
const KNOWN_SONG_MBID = 'cccccccc-3333-4333-8333-333333333333';
const PLANNED_SONG_MBID = 'dddddddd-4444-4444-8444-444444444444';
const UNKNOWN_SONG_MBID = 'eeeeeeee-5555-4555-8555-555555555555';
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
const suggestedSongEnvelope = z.object({
  song: z.object({
    id: z.string().uuid(),
    title: z.string(),
    artist: z.string(),
    status: z.string(),
    mbid: z.string().nullable(),
    album: z.string().nullable(),
    durationSeconds: z.number().nullable(),
    tags: z.array(z.string()),
    isrcs: z.array(z.string()),
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

async function createSongRow(
  app: Hono,
  cookieHeader: string,
  body: Readonly<Record<string, unknown>>,
): Promise<string> {
  const created = await jsonRequest(app, '/api/songs', { method: 'POST', cookieHeader, body });
  const newSong = await readJson(created, z.object({ song: z.object({ id: z.string().uuid() }) }));
  return newSong.song.id;
}

async function createConcertReadySong(app: Hono, cookieHeader: string, title: string) {
  return await createSongRow(app, cookieHeader, {
    title,
    artist: 'The Band',
    status: 'concert_ready',
  });
}

async function appendSongToSetlist(
  app: Hono,
  cookieHeader: string,
  setlistId: string,
  songId: string,
): Promise<void> {
  await jsonRequest(app, `/api/setlists/${setlistId}/entries`, {
    method: 'POST',
    cookieHeader,
    body: { songId },
  });
}

async function createManualSetlistHolding(
  app: Hono,
  cookieHeader: string,
  sessionId: string,
  songId: string,
): Promise<string> {
  const created = await jsonRequest(app, '/api/setlists', {
    method: 'POST',
    cookieHeader,
    body: { name: 'Tonight', sessionId },
  });
  const newSetlist = await readJson(
    created,
    z.object({ setlist: z.object({ id: z.string().uuid() }) }),
  );
  await appendSongToSetlist(app, cookieHeader, newSetlist.setlist.id, songId);
  return newSetlist.setlist.id;
}

async function readSetlistsOfSession(app: Hono, cookieHeader: string, sessionId: string) {
  return await readJson(
    await jsonRequest(app, `/api/setlists/by-session/${sessionId}`, { cookieHeader }),
    setlistsEnvelope,
  );
}

async function countCatalogSongs(app: Hono, cookieHeader: string): Promise<number> {
  const listed = await readJson(
    await jsonRequest(app, '/api/songs', { cookieHeader }),
    z.object({ songs: z.array(z.object({ id: z.string().uuid() })) }),
  );
  return listed.songs.length;
}

async function openRoundOn(app: Hono, cookieHeader: string, sessionId: string): Promise<void> {
  await jsonRequest(app, `/api/audience/concerts/${sessionId}/rounds`, {
    method: 'POST',
    cookieHeader,
  });
}

function recordingPayload(musicBrainzId: string): Readonly<Record<string, unknown>> {
  return {
    id: musicBrainzId,
    title: 'Voodoo Child',
    length: 900_000,
    'first-release-date': '1968-10-25',
    'artist-credit': [{ name: 'The Jimi Hendrix Experience' }],
    releases: [{ id: 'ffffffff-1111-4111-8111-111111111111', title: 'Electric Ladyland' }],
    isrcs: ['USSM16800123'],
    tags: [{ name: 'psychedelic rock', count: 4 }],
  };
}

function stubMusicBrainzRecording(musicBrainzId: string): void {
  vi.stubGlobal('fetch', () =>
    Promise.resolve(
      new Response(JSON.stringify(recordingPayload(musicBrainzId)), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    ),
  );
}

// @FollowsBlueprint test-back-e2e
describe('audience controller (back-e2e)', () => {
  beforeEach(async () => {
    await truncateAllTables(testDatabase());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
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

  it('refuses a vote naming a round nobody ever opened with a conflict, not a silent drop', async () => {
    const { app } = await buildAuthenticatedApp();
    const refused = await jsonRequest(app, `/api/audience/rounds/${UNKNOWN_ID}/votes`, {
      method: 'POST',
      body: { songId: UNKNOWN_ID },
      extraHeaders: ballotHeaders(A_BALLOT),
    });
    expect(refused.status).toBe(409);
    expect((await readJson(refused, z.object({ error: z.string() }))).error).toBe('round-closed');
  });

  it('refuses a suggestion on a concert running no round, and writes no song for it', async () => {
    const { app, cookieHeader } = await buildAuthenticatedApp();
    const sessionId = await createConcert(app, cookieHeader);
    const before = await countCatalogSongs(app, cookieHeader);
    stubMusicBrainzRecording(UNKNOWN_SONG_MBID);

    const refused = await jsonRequest(app, `/api/audience/concerts/${sessionId}/suggestions`, {
      method: 'POST',
      extraHeaders: ballotHeaders(A_BALLOT),
      body: { mbid: UNKNOWN_SONG_MBID },
    });
    expect(refused.status).toBe(409);
    expect((await readJson(refused, z.object({ error: z.string() }))).error).toBe('round-closed');
    expect(await countCatalogSongs(app, cookieHeader)).toBe(before);
  });

  it('refuses a suggestion on a practice and on a session that does not exist', async () => {
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
    const before = await countCatalogSongs(app, cookieHeader);
    stubMusicBrainzRecording(UNKNOWN_SONG_MBID);

    const suggest = (sessionId: string) =>
      jsonRequest(app, `/api/audience/concerts/${sessionId}/suggestions`, {
        method: 'POST',
        extraHeaders: ballotHeaders(A_BALLOT),
        body: { mbid: UNKNOWN_SONG_MBID },
      });
    const onAPractice = await suggest(body.session.id);
    const onNothing = await suggest(UNKNOWN_ID);
    expect(onAPractice.status).toBe(422);
    expect(onNothing.status).toBe(422);
    expect((await readJson(onNothing, z.object({ error: z.string() }))).error).toBe(
      'not-a-concert',
    );
    expect(await countCatalogSongs(app, cookieHeader)).toBe(before);
  });

  it('bars an address that hammers the public write routes, sharing one budget across them', async () => {
    const { app } = await buildAuthenticatedApp();
    const fromOneAddress = () =>
      jsonRequest(app, `/api/audience/rounds/${UNKNOWN_ID}/votes/${UNKNOWN_ID}`, {
        method: 'DELETE',
        extraHeaders: { ...ballotHeaders(A_BALLOT), 'x-forwarded-for': '203.0.113.9' },
      });
    let lastStatus = (await fromOneAddress()).status;
    expect(lastStatus).toBe(409);
    for (let attempt = 1; attempt <= AUDIENCE_WRITE_BUDGET.maxAttempts; attempt += 1) {
      lastStatus = (await fromOneAddress()).status;
    }
    expect(lastStatus).toBe(429);

    const suggestion = await jsonRequest(app, `/api/audience/concerts/${UNKNOWN_ID}/suggestions`, {
      method: 'POST',
      extraHeaders: { ...ballotHeaders(A_BALLOT), 'x-forwarded-for': '203.0.113.9' },
      body: { mbid: UNKNOWN_SONG_MBID },
    });
    expect(suggestion.status).toBe(429);
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
    const duplicate = await castVote(riffSongId, A_BALLOT);
    expect(duplicate.status).toBe(409);
    expect((await readJson(duplicate, z.object({ error: z.string() }))).error).toBe(
      'duplicate-vote',
    );
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

  it('keeps a song sitting in the audience-choice setlist in the pool, and drops a planned one', async () => {
    const { app, cookieHeader } = await buildAuthenticatedApp();
    const sessionId = await createConcert(app, cookieHeader);
    const riffSongId = await createConcertReadySong(app, cookieHeader, 'Riff');
    const balladSongId = await createConcertReadySong(app, cookieHeader, 'Ballad');
    await createManualSetlistHolding(app, cookieHeader, sessionId, balladSongId);

    await jsonRequest(app, `/api/audience/concerts/${sessionId}/rounds`, {
      method: 'POST',
      cookieHeader,
    });
    const setlists = await readSetlistsOfSession(app, cookieHeader, sessionId);
    const audienceChoice = setlists.setlists.find((setlist) => setlist.kind === 'audience_choice');
    await appendSongToSetlist(app, cookieHeader, audienceChoice?.id ?? '', riffSongId);

    const state = await readJson(
      await jsonRequest(app, `/api/audience/concerts/${sessionId}/state`),
      stateEnvelope,
    );
    expect(state.state.pool.map((entry) => entry.songId)).toEqual([riffSongId]);
    expect(state.state.round?.isSettled).toBe(false);
    expect(state.state.pool.map((entry) => entry.title)).not.toContain('Ballad');
  });

  it('refuses a suggestion naming a song the band already planned for tonight', async () => {
    const { app, cookieHeader } = await buildAuthenticatedApp();
    const sessionId = await createConcert(app, cookieHeader);
    const plannedSongId = await createSongRow(app, cookieHeader, {
      title: 'Ballad',
      artist: 'The Band',
      status: 'concert_ready',
      mbid: PLANNED_SONG_MBID,
    });
    await createManualSetlistHolding(app, cookieHeader, sessionId, plannedSongId);
    await openRoundOn(app, cookieHeader, sessionId);

    const refused = await jsonRequest(app, `/api/audience/concerts/${sessionId}/suggestions`, {
      method: 'POST',
      extraHeaders: ballotHeaders(A_BALLOT),
      body: { mbid: PLANNED_SONG_MBID },
    });
    expect(refused.status).toBe(409);
    const body = await readJson(refused, z.object({ error: z.string() }));
    expect(body.error).toBe('song-already-planned');
  });

  it('resolves a suggestion naming a catalogue song onto that song, adding none', async () => {
    const { app, cookieHeader } = await buildAuthenticatedApp();
    const sessionId = await createConcert(app, cookieHeader);
    const knownSongId = await createSongRow(app, cookieHeader, {
      title: 'Riff',
      artist: 'The Band',
      status: 'concert_ready',
      mbid: KNOWN_SONG_MBID,
    });
    const before = await countCatalogSongs(app, cookieHeader);
    await openRoundOn(app, cookieHeader, sessionId);

    const accepted = await jsonRequest(app, `/api/audience/concerts/${sessionId}/suggestions`, {
      method: 'POST',
      extraHeaders: ballotHeaders(A_BALLOT),
      body: { mbid: KNOWN_SONG_MBID },
    });
    expect(accepted.status).toBe(201);
    const body = await readJson(accepted, suggestedSongEnvelope);
    expect(body.song.id).toBe(knownSongId);
    expect(await countCatalogSongs(app, cookieHeader)).toBe(before);
  });

  it('imports a suggestion naming an unknown recording as one idea carrying its MusicBrainz columns', async () => {
    const { app, cookieHeader } = await buildAuthenticatedApp();
    const sessionId = await createConcert(app, cookieHeader);
    const before = await countCatalogSongs(app, cookieHeader);
    await openRoundOn(app, cookieHeader, sessionId);
    stubMusicBrainzRecording(UNKNOWN_SONG_MBID);

    const accepted = await jsonRequest(app, `/api/audience/concerts/${sessionId}/suggestions`, {
      method: 'POST',
      extraHeaders: ballotHeaders(A_BALLOT),
      body: { mbid: UNKNOWN_SONG_MBID },
    });
    expect(accepted.status).toBe(201);
    const body = await readJson(accepted, suggestedSongEnvelope);
    expect(body.song.status).toBe('idea');
    expect(body.song.mbid).toBe(UNKNOWN_SONG_MBID);
    expect(body.song.title).toBe('Voodoo Child');
    expect(body.song.artist).toBe('The Jimi Hendrix Experience');
    expect(body.song.album).toBe('Electric Ladyland');
    expect(body.song.durationSeconds).toBe(900);
    expect(body.song.isrcs).toEqual(['USSM16800123']);
    expect(body.song.tags).toEqual(['psychedelic rock']);
    expect(await countCatalogSongs(app, cookieHeader)).toBe(before + 1);

    const state = await readJson(
      await jsonRequest(app, `/api/audience/concerts/${sessionId}/state`),
      stateEnvelope,
    );
    expect(state.state.pool.map((entry) => entry.songId)).toEqual([body.song.id]);
    expect(state.state.pool.map((entry) => entry.isSuggestion)).toEqual([true]);
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

      const lateVote = await jsonRequest(app, `/api/audience/rounds/${opened.round.id}/votes`, {
        method: 'POST',
        body: { songId: riffSongId },
        extraHeaders: ballotHeaders(ANOTHER_BALLOT),
      });
      expect(lateVote.status).toBe(409);
      expect((await readJson(lateVote, z.object({ error: z.string() }))).error).toBe(
        'round-closed',
      );

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
