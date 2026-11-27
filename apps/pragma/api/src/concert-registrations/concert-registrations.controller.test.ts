import type { Hono } from 'hono';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { buildAuthenticatedApp, jsonRequest, readJson } from '../../../test/auth-utils';
import {
  abortCommitsWritingTable,
  holdWritesToTable,
  runSecondWhileFirstWaitsOnHold,
  runWithWritesToTableHeld,
  testDatabase,
  truncateAllTables,
} from '../../../test/database-utils';
import { CONCERT_PRIZE_LABEL_MAX_LENGTH } from '@domain/input-limits.core';
import { CONFLICTED_WRITE_MAX_ATTEMPTS } from '../helpers/persistence/conflict-abort.core';
import { sessionTable } from '../sessions/sessions.schema';
import { songTable } from '../songs/songs.schema';
import { concertRegistrationTable } from './concert-registrations.schema';
import {
  CONCERT_REGISTRATION_READ_BUDGET,
  CONCERT_REGISTRATION_WRITE_BUDGET,
} from './concert-registrations.types';

const UNKNOWN_ID = '00000000-0000-0000-0000-000000000000';
const UNAUTHORISED = 401;
const MILLISECONDS_PER_DAY = 86_400_000;
const TOKEN_HEADER = 'x-registration-token';

const PRESIGNER_ENV = {
  AWS_ACCESS_KEY_ID: 'AKIA-PRAGMA-TEST',
  AWS_SECRET_ACCESS_KEY: 'pragma-secret-long-enough-for-sigv4-signing',
  AWS_REGION: 'eu-west-3',
  UPLOADS_BUCKET: 'pragma-test-uploads',
} as const;

const errorEnvelope = z.object({ error: z.string() });
const registeredEnvelope = z.object({ registrationId: z.guid(), editToken: z.string().min(1) });
const wishedSongSchema = z.object({ id: z.guid(), title: z.string(), artist: z.string() });
const amendedEnvelope = z.object({
  registration: z.object({
    comingForMemberId: z.guid().nullable(),
    wishedSong: wishedSongSchema.nullable(),
  }),
});
const upcomingEnvelope = z.object({
  concerts: z.array(
    z.strictObject({
      sessionId: z.guid(),
      date: z.string(),
      venue: z.string().nullable(),
      message: z.string().nullable(),
      posterUrl: z.string().nullable(),
      prize: z.object({ label: z.string(), icon: z.string() }).nullable(),
    }),
  ),
});
const membersEnvelope = z.object({
  members: z.array(z.strictObject({ id: z.guid(), firstName: z.string(), color: z.string() })),
});
const registrationsEnvelope = z.object({
  registrations: z.array(
    z.object({
      id: z.guid(),
      firstName: z.string(),
      email: z.string(),
      registeredAt: z.string(),
      comingFor: z.object({ id: z.guid(), firstName: z.string() }).nullable(),
      wishedSong: wishedSongSchema.nullable(),
    }),
  ),
});
const announcementEnvelope = z.object({
  message: z.string().nullable(),
  posterUrl: z.string().nullable(),
  prizeLabel: z.string().nullable(),
  prizeIcon: z.string(),
});
const posterUploadEnvelope = z.object({ uploadUrl: z.url(), s3Key: z.string() });
const fanWishesEnvelope = z.object({ songIds: z.array(z.guid()) });

async function createSession(
  app: Hono,
  cookieHeader: string,
  body: Readonly<Record<string, unknown>>,
): Promise<string> {
  const created = await jsonRequest(app, '/api/sessions', { method: 'POST', cookieHeader, body });
  const newSession = await readJson(created, z.object({ session: z.object({ id: z.guid() }) }));
  return newSession.session.id;
}

async function createConcert(app: Hono, cookieHeader: string, date = new Date()) {
  return await createSession(app, cookieHeader, {
    kind: 'concert',
    date: date.toISOString(),
    venue: 'La Cave',
    capacity: 120,
  });
}

async function registerFor(
  app: Hono,
  sessionId: string,
  firstName: string,
  email: string,
  clientAddress?: string,
) {
  return await jsonRequest(app, `/api/concert-registrations/concerts/${sessionId}/registrations`, {
    method: 'POST',
    body: { firstName, email },
    ...(clientAddress === undefined ? {} : { clientAddress }),
  });
}

async function registerOk(app: Hono, sessionId: string, firstName: string, email: string) {
  return await readJson(await registerFor(app, sessionId, firstName, email), registeredEnvelope);
}

async function amend(
  app: Hono,
  registrationId: string,
  editToken: string,
  body: Readonly<Record<string, unknown>>,
  clientAddress?: string,
) {
  return await jsonRequest(app, `/api/concert-registrations/registrations/${registrationId}`, {
    method: 'PATCH',
    body,
    extraHeaders: { [TOKEN_HEADER]: editToken },
    ...(clientAddress === undefined ? {} : { clientAddress }),
  });
}

async function checkStored(app: Hono, registrationId: string, editToken: string) {
  return await jsonRequest(app, `/api/concert-registrations/registrations/${registrationId}`, {
    extraHeaders: { [TOKEN_HEADER]: editToken },
  });
}

async function removeRegistrationOf(
  app: Hono,
  cookieHeader: string,
  sessionId: string,
  registrationId: string,
) {
  return await jsonRequest(
    app,
    `/api/concert-registrations/concerts/${sessionId}/registrations/${registrationId}`,
    { method: 'DELETE', cookieHeader },
  );
}

function statusesInOrder(responses: readonly Response[]): number[] {
  return responses.map((response) => response.status).toSorted((first, second) => first - second);
}

async function storedRegistrationsOf(sessionId: string) {
  return await testDatabase()
    .select({ id: concertRegistrationTable.id })
    .from(concertRegistrationTable)
    .where(eq(concertRegistrationTable.sessionId, sessionId));
}

const WISHED_TRACK = {
  id: 333333333,
  title: 'Voodoo Child',
  title_short: 'Voodoo Child',
  isrc: 'USSM16800123',
  duration: 900,
  artist: { name: 'The Jimi Hendrix Experience' },
  album: { title: 'Electric Ladyland' },
};

function stubDeezerTrack(): void {
  vi.stubGlobal('fetch', (url: string) =>
    Promise.resolve(
      new Response(
        JSON.stringify(
          url.includes(`/track/${WISHED_TRACK.id}`)
            ? WISHED_TRACK
            : { error: { type: 'DataException', code: 800 } },
        ),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    ),
  );
}

// @FollowsBlueprint test-back-e2e
describe('concert registrations controller (back-e2e)', () => {
  beforeEach(async () => {
    await truncateAllTables(testDatabase());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('answers every public route without a session cookie and gates every member route', async () => {
    const { app, cookieHeader } = await buildAuthenticatedApp();
    const sessionId = await createConcert(app, cookieHeader);

    const publicResponses = await Promise.all([
      jsonRequest(app, '/api/concert-registrations/upcoming'),
      jsonRequest(app, '/api/concert-registrations/members'),
      registerFor(app, sessionId, 'Lou', 'lou@example.com'),
      amend(app, UNKNOWN_ID, 'nope', { comingForMemberId: null }),
      checkStored(app, UNKNOWN_ID, 'nope'),
    ]);
    for (const response of publicResponses) {
      expect(response.status).not.toBe(UNAUTHORISED);
    }

    const base = `/api/concert-registrations/concerts/${sessionId}`;
    const gatedResponses = await Promise.all([
      jsonRequest(app, `${base}/announcement`),
      jsonRequest(app, `${base}/announcement`, { method: 'PATCH', body: { message: 'Hi' } }),
      jsonRequest(app, `${base}/poster-upload`, {
        method: 'POST',
        body: { contentType: 'image/png', byteSize: 1 },
      }),
      jsonRequest(app, `${base}/registrations`),
      jsonRequest(app, `${base}/registrations/${UNKNOWN_ID}`, { method: 'DELETE' }),
      jsonRequest(app, '/api/concert-registrations/fan-wishes'),
    ]);
    for (const response of gatedResponses) {
      expect(response.status).toBe(UNAUTHORISED);
    }
  });

  it('stores the email lower case and refuses the same email twice on one concert', async () => {
    const { app, cookieHeader } = await buildAuthenticatedApp();
    const sessionId = await createConcert(app, cookieHeader);

    const first = await registerFor(app, sessionId, ' Lou ', '  Lou@Example.COM ');
    expect(first.status).toBe(201);
    const again = await registerFor(app, sessionId, 'Louise', 'lou@example.com');
    expect(again.status).toBe(409);
    expect((await readJson(again, errorEnvelope)).error).toBe('already-registered');

    const listed = await readJson(
      await jsonRequest(app, `/api/concert-registrations/concerts/${sessionId}/registrations`, {
        cookieHeader,
      }),
      registrationsEnvelope,
    );
    expect(listed.registrations.map(({ firstName, email }) => ({ firstName, email }))).toEqual([
      { firstName: 'Lou', email: 'lou@example.com' },
    ]);
  });

  it('refuses a second alias of one mailbox on one concert, so a giveaway is entered once', async () => {
    const { app, cookieHeader } = await buildAuthenticatedApp();
    const sessionId = await createConcert(app, cookieHeader);
    const aliasPairs: readonly (readonly [string, string])[] = [
      ['jean.dupont+bieres@gmail.com', 'jeandupont@googlemail.com'],
      ['a+x@free.fr', 'a@free.fr'],
    ];
    for (const [first, second] of aliasPairs) {
      expect((await registerFor(app, sessionId, 'Fan', first)).status).toBe(201);
      const refused = await registerFor(app, sessionId, 'Fan', second);
      expect(refused.status).toBe(409);
      expect((await readJson(refused, errorEnvelope)).error).toBe('already-registered');
    }
  });

  it('refuses a throwaway mailbox and writes nothing for it', async () => {
    const { app, cookieHeader } = await buildAuthenticatedApp();
    const sessionId = await createConcert(app, cookieHeader);
    const refused = await registerFor(app, sessionId, 'Fan', 'x@yopmail.com');
    expect(refused.status).toBe(422);
    expect((await readJson(refused, errorEnvelope)).error).toBe('disposable-email');

    const listed = await readJson(
      await jsonRequest(app, `/api/concert-registrations/concerts/${sessionId}/registrations`, {
        cookieHeader,
      }),
      registrationsEnvelope,
    );
    expect(listed.registrations).toEqual([]);
  });

  it('keeps the dots of an address outside Gmail, where they name another mailbox', async () => {
    const { app, cookieHeader } = await buildAuthenticatedApp();
    const sessionId = await createConcert(app, cookieHeader);
    expect((await registerFor(app, sessionId, 'Fan', 'a.b@free.fr')).status).toBe(201);
    expect((await registerFor(app, sessionId, 'Fan', 'ab@free.fr')).status).toBe(201);

    const listed = await readJson(
      await jsonRequest(app, `/api/concert-registrations/concerts/${sessionId}/registrations`, {
        cookieHeader,
      }),
      registrationsEnvelope,
    );
    expect(listed.registrations.map((registration) => registration.email)).toEqual([
      'a.b@free.fr',
      'ab@free.fr',
    ]);
  });

  it('erases the sign-ups of a concert when the concert is deleted, so no email outlives it', async () => {
    const { app, cookieHeader } = await buildAuthenticatedApp();
    const sessionId = await createConcert(app, cookieHeader);
    await registerOk(app, sessionId, 'Lou', 'lou@example.com');

    await jsonRequest(app, `/api/sessions/${sessionId}`, { method: 'DELETE', cookieHeader });

    const remaining = await testDatabase()
      .select({ id: concertRegistrationTable.id })
      .from(concertRegistrationTable)
      .where(eq(concertRegistrationTable.sessionId, sessionId));
    expect(remaining).toEqual([]);
  });

  it('answers one 201 and one 409 when one mailbox signs up twice at the same moment, and keeps one row', async () => {
    const { app, cookieHeader } = await buildAuthenticatedApp();
    const sessionId = await createConcert(app, cookieHeader);

    const answers = await runWithWritesToTableHeld(
      'session',
      2,
      async () =>
        await Promise.all([
          registerFor(app, sessionId, 'Lou', 'lou@example.com'),
          registerFor(app, sessionId, 'Lou', 'lou+gig@example.com'),
        ]),
    );

    expect(statusesInOrder(answers)).toEqual([201, 409]);
    expect(await storedRegistrationsOf(sessionId)).toHaveLength(1);
  });

  it('keeps no sign-up for a concert deleted while the sign-up was being written', async () => {
    const { app, cookieHeader } = await buildAuthenticatedApp();
    const sessionId = await createConcert(app, cookieHeader);

    const [deletion, signUp] = await runSecondWhileFirstWaitsOnHold(
      holdWritesToTable('concert_registration'),
      async () =>
        await jsonRequest(app, `/api/sessions/${sessionId}`, { method: 'DELETE', cookieHeader }),
      async () => await registerFor(app, sessionId, 'Lou', 'lou@example.com'),
    );

    expect(deletion.status).toBe(200);
    expect(signUp.status).toBe(422);
    expect((await readJson(signUp, errorEnvelope)).error).toBe('not-an-upcoming-concert');
    expect(await storedRegistrationsOf(sessionId)).toEqual([]);
  });

  it('answers 409 to a mailbox already signed up when every retry of its commit conflicts, and fails loudly for a new one', async () => {
    const { app, cookieHeader } = await buildAuthenticatedApp();
    const sessionId = await createConcert(app, cookieHeader);
    await registerOk(app, sessionId, 'Lou', 'lou@example.com');

    const removeSimulatedConflict = await abortCommitsWritingTable(
      'session',
      2 * CONFLICTED_WRITE_MAX_ATTEMPTS,
    );
    try {
      const again = await registerFor(app, sessionId, 'Lou', 'lou@example.com');
      expect(again.status).toBe(409);
      expect((await readJson(again, errorEnvelope)).error).toBe('already-registered');
      const stranger = await registerFor(app, sessionId, 'Max', 'max@example.com');
      expect(stranger.status).toBe(500);
    } finally {
      await removeSimulatedConflict();
    }
    expect(await storedRegistrationsOf(sessionId)).toHaveLength(1);
  });

  it('bars an address that hammers the sign-up', async () => {
    const { app, cookieHeader } = await buildAuthenticatedApp();
    const sessionId = await createConcert(app, cookieHeader);
    const fromOneAddress = async (attempt: number) =>
      await registerFor(app, sessionId, 'Fan', `fan${String(attempt)}@example.com`, '203.0.113.21');

    let lastStatus = 0;
    for (let attempt = 0; attempt < CONCERT_REGISTRATION_WRITE_BUDGET.maxAttempts; attempt += 1) {
      lastStatus = (await fromOneAddress(attempt)).status;
    }
    expect(lastStatus).toBe(201);
    const barred = await fromOneAddress(CONCERT_REGISTRATION_WRITE_BUDGET.maxAttempts);
    expect(barred.status).toBe(429);
    expect((await registerFor(app, sessionId, 'Fan', 'other@example.com')).status).toBe(201);
  });

  it('bars an address that hammers the answers of a registration', async () => {
    const { app, cookieHeader } = await buildAuthenticatedApp();
    const sessionId = await createConcert(app, cookieHeader);
    const { registrationId, editToken } = await registerOk(app, sessionId, 'Lou', 'l@e.fr');
    const fromOneAddress = async () =>
      await amend(app, registrationId, editToken, { comingForMemberId: null }, '203.0.113.22');

    let lastStatus = 0;
    for (let attempt = 0; attempt < CONCERT_REGISTRATION_WRITE_BUDGET.maxAttempts; attempt += 1) {
      lastStatus = (await fromOneAddress()).status;
    }
    expect(lastStatus).toBe(200);
    expect((await fromOneAddress()).status).toBe(429);
  });

  it('lets the same email sign up for a second concert', async () => {
    const { app, cookieHeader } = await buildAuthenticatedApp();
    const first = await createConcert(app, cookieHeader);
    const second = await createConcert(app, cookieHeader);
    expect((await registerFor(app, first, 'Lou', 'lou@example.com')).status).toBe(201);
    expect((await registerFor(app, second, 'Lou', 'lou@example.com')).status).toBe(201);
  });

  it('refuses a sign-up on a practice, a past concert and a session that does not exist', async () => {
    const { app, cookieHeader } = await buildAuthenticatedApp();
    const practice = await createSession(app, cookieHeader, {
      kind: 'practice',
      date: new Date().toISOString(),
    });
    const pastConcert = await createConcert(
      app,
      cookieHeader,
      new Date(Date.now() - 2 * MILLISECONDS_PER_DAY),
    );
    for (const sessionId of [practice, pastConcert, UNKNOWN_ID]) {
      const refused = await registerFor(app, sessionId, 'Lou', 'lou@example.com');
      expect(refused.status).toBe(422);
      expect((await readJson(refused, errorEnvelope)).error).toBe('not-an-upcoming-concert');
    }
  });

  it('lists the upcoming concerts only, soonest first, with their message and no sign-up count', async () => {
    const { app, cookieHeader } = await buildAuthenticatedApp();
    const later = await createConcert(
      app,
      cookieHeader,
      new Date(Date.now() + 7 * MILLISECONDS_PER_DAY),
    );
    const tonight = await createConcert(app, cookieHeader);
    await createConcert(app, cookieHeader, new Date(Date.now() - 2 * MILLISECONDS_PER_DAY));
    await createSession(app, cookieHeader, { kind: 'practice', date: new Date().toISOString() });
    await registerOk(app, tonight, 'Lou', 'lou@example.com');
    await registerOk(app, tonight, 'Max', 'max@example.com');
    await jsonRequest(app, `/api/concert-registrations/concerts/${tonight}/announcement`, {
      method: 'PATCH',
      cookieHeader,
      body: { message: 'Doors at 8.\nFree entry.' },
    });

    const listed = await readJson(
      await jsonRequest(app, '/api/concert-registrations/upcoming'),
      upcomingEnvelope,
    );
    expect(
      listed.concerts.map(({ sessionId, message, posterUrl }) => ({
        sessionId,
        message,
        posterUrl,
      })),
    ).toEqual([
      { sessionId: tonight, message: 'Doors at 8.\nFree entry.', posterUrl: null },
      { sessionId: later, message: null, posterUrl: null },
    ]);
  });

  it('shows the public only the id, first name and colour of each member', async () => {
    const { app, memberId } = await buildAuthenticatedApp('Hugo');
    const listed = await readJson(
      await jsonRequest(app, '/api/concert-registrations/members'),
      membersEnvelope,
    );
    expect(listed.members).toEqual([
      { id: memberId, firstName: 'Hugo', color: expect.stringMatching(/^#[0-9a-f]{3,6}$/i) },
    ]);
  });

  it('refuses an answer carrying a wrong edit token or none, and changes nothing', async () => {
    const { app, cookieHeader, memberId } = await buildAuthenticatedApp();
    const sessionId = await createConcert(app, cookieHeader);
    const { registrationId } = await registerOk(app, sessionId, 'Lou', 'lou@example.com');

    const wrong = await amend(app, registrationId, 'f'.repeat(48), { comingForMemberId: memberId });
    expect(wrong.status).toBe(403);
    expect((await readJson(wrong, errorEnvelope)).error).toBe('invalid-registration-token');
    const missing = await jsonRequest(
      app,
      `/api/concert-registrations/registrations/${registrationId}`,
      { method: 'PATCH', body: { comingForMemberId: memberId } },
    );
    expect(missing.status).toBe(403);

    const listed = await readJson(
      await jsonRequest(app, `/api/concert-registrations/concerts/${sessionId}/registrations`, {
        cookieHeader,
      }),
      registrationsEnvelope,
    );
    expect(listed.registrations[0]?.comingFor).toBeNull();
  });

  it('removes a registration of its concert only, keeps its wished song out of the fan wishes but in the catalogue, and lets the mailbox sign up again', async () => {
    const { app, cookieHeader } = await buildAuthenticatedApp();
    const sessionId = await createConcert(app, cookieHeader);
    const otherConcertId = await createConcert(app, cookieHeader);
    const { registrationId, editToken } = await registerOk(app, sessionId, 'Lou', 'l@e.fr');
    stubDeezerTrack();
    await amend(app, registrationId, editToken, { wishedTrackId: String(WISHED_TRACK.id) });

    const elsewhere = await removeRegistrationOf(app, cookieHeader, otherConcertId, registrationId);
    expect(elsewhere.status).toBe(404);
    expect((await readJson(elsewhere, errorEnvelope)).error).toBe('unknown-registration');
    expect(await storedRegistrationsOf(sessionId)).toHaveLength(1);

    const removed = await removeRegistrationOf(app, cookieHeader, sessionId, registrationId);
    expect(removed.status).toBe(204);
    expect(await storedRegistrationsOf(sessionId)).toEqual([]);
    expect(await testDatabase().select({ title: songTable.title }).from(songTable)).toEqual([
      { title: 'Voodoo Child' },
    ]);
    const wishes = await readJson(
      await jsonRequest(app, '/api/concert-registrations/fan-wishes', { cookieHeader }),
      fanWishesEnvelope,
    );
    expect(wishes.songIds).toEqual([]);

    const again = await removeRegistrationOf(app, cookieHeader, sessionId, registrationId);
    expect(again.status).toBe(404);
    expect((await registerFor(app, sessionId, 'Lou', 'l@e.fr')).status).toBe(201);
  });

  it('tells a browser whether its remembered registration still stands, and only with its token', async () => {
    const { app, cookieHeader } = await buildAuthenticatedApp();
    const sessionId = await createConcert(app, cookieHeader);
    const { registrationId, editToken } = await registerOk(app, sessionId, 'Lou', 'l@e.fr');

    const kept = await checkStored(app, registrationId, editToken);
    expect(kept.status).toBe(200);
    expect(await readJson(kept, z.object({ registrationId: z.guid() }))).toEqual({
      registrationId,
    });
    const wrong = await checkStored(app, registrationId, 'f'.repeat(48));
    expect(wrong.status).toBe(403);
    expect((await readJson(wrong, errorEnvelope)).error).toBe('invalid-registration-token');
    const missing = await jsonRequest(
      app,
      `/api/concert-registrations/registrations/${registrationId}`,
    );
    expect(missing.status).toBe(403);

    await removeRegistrationOf(app, cookieHeader, sessionId, registrationId);
    const gone = await checkStored(app, registrationId, editToken);
    expect(gone.status).toBe(404);
    expect((await readJson(gone, errorEnvelope)).error).toBe('unknown-registration');
  });

  it('bars an address that hammers the check of a registration', async () => {
    const { app, cookieHeader } = await buildAuthenticatedApp();
    const sessionId = await createConcert(app, cookieHeader);
    const { registrationId, editToken } = await registerOk(app, sessionId, 'Lou', 'l@e.fr');
    const fromOneAddress = async () =>
      await jsonRequest(app, `/api/concert-registrations/registrations/${registrationId}`, {
        extraHeaders: { [TOKEN_HEADER]: editToken },
        clientAddress: '203.0.113.23',
      });

    let lastStatus = 0;
    for (let attempt = 0; attempt < CONCERT_REGISTRATION_READ_BUDGET.maxAttempts; attempt += 1) {
      lastStatus = (await fromOneAddress()).status;
    }
    expect(lastStatus).toBe(200);
    expect((await fromOneAddress()).status).toBe(429);
  });

  it('refuses an answer that names nothing to change with 400, and changes nothing', async () => {
    const { app, cookieHeader } = await buildAuthenticatedApp();
    const sessionId = await createConcert(app, cookieHeader);
    const { registrationId, editToken } = await registerOk(app, sessionId, 'Lou', 'l@e.fr');

    const empty = await amend(app, registrationId, editToken, {});

    expect(empty.status).toBe(400);
    expect(await storedRegistrationsOf(sessionId)).toEqual([{ id: registrationId }]);
  });

  it('answers 404 to an answer whose registration a member removed while it was being saved', async () => {
    const { app, cookieHeader } = await buildAuthenticatedApp();
    const sessionId = await createConcert(app, cookieHeader);
    const { registrationId, editToken } = await registerOk(app, sessionId, 'Lou', 'l@e.fr');
    vi.stubGlobal('fetch', async () => {
      await removeRegistrationOf(app, cookieHeader, sessionId, registrationId);
      return new Response(JSON.stringify(WISHED_TRACK), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    });

    const amended = await amend(app, registrationId, editToken, {
      wishedTrackId: String(WISHED_TRACK.id),
    });

    expect(amended.status).toBe(404);
    expect((await readJson(amended, errorEnvelope)).error).toBe('unknown-registration');
    expect(await storedRegistrationsOf(sessionId)).toEqual([]);
  });

  it('records who a registration comes for and the song it wishes, imported as an idea', async () => {
    const { app, cookieHeader, memberId } = await buildAuthenticatedApp('Hugo');
    const sessionId = await createConcert(app, cookieHeader);
    const { registrationId, editToken } = await registerOk(app, sessionId, 'Lou', 'l@e.fr');
    stubDeezerTrack();

    const amended = await amend(app, registrationId, editToken, {
      comingForMemberId: memberId,
      wishedTrackId: String(WISHED_TRACK.id),
    });
    expect(amended.status).toBe(200);
    const body = await readJson(amended, amendedEnvelope);
    expect(body.registration.comingForMemberId).toBe(memberId);
    expect(body.registration.wishedSong).toMatchObject({
      title: 'Voodoo Child',
      artist: 'The Jimi Hendrix Experience',
    });

    const songs = await readJson(
      await jsonRequest(app, '/api/songs', { cookieHeader }),
      z.object({ songs: z.array(z.object({ id: z.guid(), status: z.string() })) }),
    );
    expect(songs.songs).toEqual([
      expect.objectContaining({ id: body.registration.wishedSong?.id, status: 'idea' }),
    ]);

    const listed = await readJson(
      await jsonRequest(app, `/api/concert-registrations/concerts/${sessionId}/registrations`, {
        cookieHeader,
      }),
      registrationsEnvelope,
    );
    expect(listed.registrations[0]?.comingFor).toEqual({ id: memberId, firstName: 'Hugo' });
    expect(listed.registrations[0]?.wishedSong?.title).toBe('Voodoo Child');
  });

  it('refuses a member who does not exist and a track Deezer does not know', async () => {
    const { app, cookieHeader } = await buildAuthenticatedApp();
    const sessionId = await createConcert(app, cookieHeader);
    const { registrationId, editToken } = await registerOk(app, sessionId, 'Lou', 'l@e.fr');
    stubDeezerTrack();

    const unknownMember = await amend(app, registrationId, editToken, {
      comingForMemberId: UNKNOWN_ID,
    });
    expect(unknownMember.status).toBe(422);
    expect((await readJson(unknownMember, errorEnvelope)).error).toBe('unknown-member');
    const unknownTrack = await amend(app, registrationId, editToken, { wishedTrackId: '1' });
    expect(unknownTrack.status).toBe(422);
    expect((await readJson(unknownTrack, errorEnvelope)).error).toBe('unknown-track');
  });

  it('refuses the answers once the concert is past, so an old token imports no more songs', async () => {
    const { app, cookieHeader } = await buildAuthenticatedApp();
    const sessionId = await createConcert(app, cookieHeader);
    const { registrationId, editToken } = await registerOk(app, sessionId, 'Lou', 'l@e.fr');
    await testDatabase()
      .update(sessionTable)
      .set({ date: new Date(Date.now() - 2 * MILLISECONDS_PER_DAY) })
      .where(eq(sessionTable.id, sessionId));
    stubDeezerTrack();

    const refused = await amend(app, registrationId, editToken, {
      wishedTrackId: String(WISHED_TRACK.id),
    });
    expect(refused.status).toBe(422);
    expect((await readJson(refused, errorEnvelope)).error).toBe('not-an-upcoming-concert');
    expect(await testDatabase().select({ id: songTable.id }).from(songTable)).toEqual([]);
  });

  it('imports one song when two registrations wish the same unknown track at the same moment', async () => {
    const { app, cookieHeader } = await buildAuthenticatedApp();
    const sessionId = await createConcert(app, cookieHeader);
    const first = await registerOk(app, sessionId, 'Lou', 'a@e.fr');
    const second = await registerOk(app, sessionId, 'Max', 'b@e.fr');
    stubDeezerTrack();
    const wish = { wishedTrackId: String(WISHED_TRACK.id) };

    const answers = await runWithWritesToTableHeld(
      'song',
      2,
      async () =>
        await Promise.all([
          amend(app, first.registrationId, first.editToken, wish),
          amend(app, second.registrationId, second.editToken, wish),
        ]),
    );

    expect(statusesInOrder(answers)).toEqual([200, 200]);
    expect(await testDatabase().select({ id: songTable.id }).from(songTable)).toHaveLength(1);
    const wishes = await readJson(
      await jsonRequest(app, '/api/concert-registrations/fan-wishes', { cookieHeader }),
      fanWishesEnvelope,
    );
    expect(wishes.songIds).toHaveLength(1);
  });

  it('lists each wished song once, however many registrations wish it', async () => {
    const { app, cookieHeader } = await buildAuthenticatedApp();
    const sessionId = await createConcert(app, cookieHeader);
    stubDeezerTrack();
    for (const email of ['a@e.fr', 'b@e.fr']) {
      const { registrationId, editToken } = await registerOk(app, sessionId, 'Fan', email);
      await amend(app, registrationId, editToken, { wishedTrackId: String(WISHED_TRACK.id) });
    }
    await registerOk(app, sessionId, 'Quiet', 'c@e.fr');

    const wishes = await readJson(
      await jsonRequest(app, '/api/concert-registrations/fan-wishes', { cookieHeader }),
      fanWishesEnvelope,
    );
    expect(wishes.songIds).toHaveLength(1);
  });

  it('sets and clears the public message of a concert, and refuses it on a practice', async () => {
    const { app, cookieHeader } = await buildAuthenticatedApp();
    const sessionId = await createConcert(app, cookieHeader);
    const practice = await createSession(app, cookieHeader, {
      kind: 'practice',
      date: new Date().toISOString(),
    });
    const path = `/api/concert-registrations/concerts/${sessionId}/announcement`;

    await jsonRequest(app, path, { method: 'PATCH', cookieHeader, body: { message: 'Come!' } });
    expect(
      await readJson(await jsonRequest(app, path, { cookieHeader }), announcementEnvelope),
    ).toEqual({ message: 'Come!', posterUrl: null, prizeLabel: null, prizeIcon: 'beer' });
    await jsonRequest(app, path, { method: 'PATCH', cookieHeader, body: { message: null } });
    expect(
      (await readJson(await jsonRequest(app, path, { cookieHeader }), announcementEnvelope))
        .message,
    ).toBeNull();

    const refused = await jsonRequest(
      app,
      `/api/concert-registrations/concerts/${practice}/announcement`,
      { method: 'PATCH', cookieHeader, body: { message: 'Come!' } },
    );
    expect(refused.status).toBe(422);
    expect((await readJson(refused, errorEnvelope)).error).toBe('not-a-concert');
  });

  it('sets a prize with its icon, shows it on the public list, clears it, and refuses an unknown icon', async () => {
    const { app, cookieHeader } = await buildAuthenticatedApp();
    const sessionId = await createConcert(app, cookieHeader);
    const path = `/api/concert-registrations/concerts/${sessionId}/announcement`;

    const set = await jsonRequest(app, path, {
      method: 'PATCH',
      cookieHeader,
      body: { prizeLabel: ' 2 places ', prizeIcon: 'ticket' },
    });
    expect(await readJson(set, announcementEnvelope)).toEqual({
      message: null,
      posterUrl: null,
      prizeLabel: '2 places',
      prizeIcon: 'ticket',
    });
    const listed = await readJson(
      await jsonRequest(app, '/api/concert-registrations/upcoming'),
      upcomingEnvelope,
    );
    expect(listed.concerts[0]?.prize).toEqual({ label: '2 places', icon: 'ticket' });

    await jsonRequest(app, path, { method: 'PATCH', cookieHeader, body: { prizeLabel: null } });
    const cleared = await readJson(
      await jsonRequest(app, '/api/concert-registrations/upcoming'),
      upcomingEnvelope,
    );
    expect(cleared.concerts[0]?.prize).toBeNull();

    const unknownIcon = await jsonRequest(app, path, {
      method: 'PATCH',
      cookieHeader,
      body: { prizeIcon: 'trophy' },
    });
    expect(unknownIcon.status).toBe(400);
    const tooLong = await jsonRequest(app, path, {
      method: 'PATCH',
      cookieHeader,
      body: { prizeLabel: 'x'.repeat(CONCERT_PRIZE_LABEL_MAX_LENGTH + 1) },
    });
    expect(tooLong.status).toBe(400);
  });

  it('signs a poster upload under its concert and shows the poster once it is set', async () => {
    for (const [name, value] of Object.entries(PRESIGNER_ENV)) vi.stubEnv(name, value);
    const { app, cookieHeader } = await buildAuthenticatedApp();
    const sessionId = await createConcert(app, cookieHeader);
    const base = `/api/concert-registrations/concerts/${sessionId}`;

    const signed = await readJson(
      await jsonRequest(app, `${base}/poster-upload`, {
        method: 'POST',
        cookieHeader,
        body: { contentType: 'image/jpeg', byteSize: 2_000_000 },
      }),
      posterUploadEnvelope,
    );
    expect(signed.s3Key).toMatch(new RegExp(`^poster/${sessionId}/[0-9a-f-]+\\.jpg$`));

    const set = await jsonRequest(app, `${base}/announcement`, {
      method: 'PATCH',
      cookieHeader,
      body: { posterS3Key: signed.s3Key },
    });
    expect((await readJson(set, announcementEnvelope)).posterUrl).toContain(signed.s3Key);
    const listed = await readJson(
      await jsonRequest(app, '/api/concert-registrations/upcoming'),
      upcomingEnvelope,
    );
    expect(listed.concerts[0]?.posterUrl).toContain(signed.s3Key);

    const removed = await jsonRequest(app, `${base}/announcement`, {
      method: 'PATCH',
      cookieHeader,
      body: { posterS3Key: null },
    });
    expect((await readJson(removed, announcementEnvelope)).posterUrl).toBeNull();
  });

  it('refuses a poster key that belongs to another object, so the public page signs only posters', async () => {
    const { app, cookieHeader } = await buildAuthenticatedApp();
    const sessionId = await createConcert(app, cookieHeader);
    const refused = await jsonRequest(
      app,
      `/api/concert-registrations/concerts/${sessionId}/announcement`,
      { method: 'PATCH', cookieHeader, body: { posterS3Key: 'take/some-song/recording.m4a' } },
    );
    expect(refused.status).toBe(422);
    expect((await readJson(refused, errorEnvelope)).error).toBe('foreign-poster-key');
  });
});
