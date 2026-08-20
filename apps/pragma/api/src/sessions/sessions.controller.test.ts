import { beforeEach, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { buildAuthenticatedApp, jsonRequest, readJson } from '../../../test/auth-utils';
import { testDatabase, truncateAllTables } from '../../../test/database-utils';

const sessionSchema = z.object({
  id: z.string().uuid(),
  kind: z.string(),
  date: z.string(),
  preparedConcertId: z.string().uuid().nullable(),
  venue: z.string().nullable(),
  capacity: z.number().nullable(),
  gear: z.string().nullable(),
  friendsCountPerMember: z.unknown(),
});
const singleEnvelope = z.object({ session: sessionSchema });
const listEnvelope = z.object({ sessions: z.array(sessionSchema) });
const setlistEnvelope = z.object({
  setlist: z.object({ id: z.string().uuid(), name: z.string() }),
});
const setlistListEnvelope = z.object({
  setlists: z.array(z.object({ id: z.string().uuid() })),
});
const entriesEnvelope = z.object({ entries: z.array(z.unknown()) });

// @FollowsBlueprint test-back-e2e
describe('sessions controller (back-e2e)', () => {
  beforeEach(async () => {
    await truncateAllTables(testDatabase());
  });

  it('rejects every verb without a session cookie', async () => {
    const { app } = await buildAuthenticatedApp();
    expect((await jsonRequest(app, '/api/sessions')).status).toBe(401);
  });

  it('creates a concert + a practice + lists both newest-first', async () => {
    const { app, cookieHeader } = await buildAuthenticatedApp();
    await jsonRequest(app, '/api/sessions', {
      method: 'POST',
      body: {
        kind: 'concert',
        date: '2025-09-13T18:30:00Z',
        venue: 'Les Disquaires',
        capacity: 80,
        gear: 'Sono maison',
        friendsCountPerMember: {},
      },
      cookieHeader,
    });
    await jsonRequest(app, '/api/sessions', {
      method: 'POST',
      body: { kind: 'practice', date: '2025-09-08T19:00:00Z' },
      cookieHeader,
    });
    const list = await readJson(
      await jsonRequest(app, '/api/sessions', { cookieHeader }),
      listEnvelope,
    );
    expect(list.sessions).toHaveLength(2);
    expect(list.sessions[0]?.kind).toBe('concert');
  });

  it('rejects a payload that mixes concert-only with practice-only fields', async () => {
    const { app, cookieHeader } = await buildAuthenticatedApp();
    const response = await jsonRequest(app, '/api/sessions', {
      method: 'POST',
      body: {
        kind: 'practice',
        date: '2025-09-08T19:00:00Z',
        venue: 'should not be here',
      },
      cookieHeader,
    });
    expect(response.status).toBe(400);
  });

  it('updates the concert capacity', async () => {
    const { app, cookieHeader } = await buildAuthenticatedApp();
    const created = await readJson(
      await jsonRequest(app, '/api/sessions', {
        method: 'POST',
        body: {
          kind: 'concert',
          date: '2025-09-13T18:30:00Z',
          venue: 'Place A',
          capacity: 80,
          friendsCountPerMember: {},
        },
        cookieHeader,
      }),
      singleEnvelope,
    );
    const update = await jsonRequest(app, `/api/sessions/${created.session.id}`, {
      method: 'PUT',
      body: { capacity: 120 },
      cookieHeader,
    });
    expect(update.status).toBe(200);
    const updated = await readJson(update, singleEnvelope);
    expect(updated.session.capacity).toBe(120);
  });

  it('updates the date, the venue, the gear and the friend count in one patch', async () => {
    const { app, cookieHeader } = await buildAuthenticatedApp();
    const memberId = crypto.randomUUID();
    const created = await readJson(
      await jsonRequest(app, '/api/sessions', {
        method: 'POST',
        body: {
          kind: 'concert',
          date: '2025-09-13T18:30:00Z',
          venue: 'Place A',
          capacity: 80,
          gear: 'Sono maison',
          friendsCountPerMember: {},
        },
        cookieHeader,
      }),
      singleEnvelope,
    );
    const update = await jsonRequest(app, `/api/sessions/${created.session.id}`, {
      method: 'PUT',
      body: {
        date: '2025-10-01T20:00:00Z',
        venue: 'Place B',
        gear: 'Backline fournie',
        friendsCountPerMember: { [memberId]: 4 },
      },
      cookieHeader,
    });
    expect(update.status).toBe(200);
    const updated = await readJson(update, singleEnvelope);
    expect(new Date(updated.session.date).toISOString()).toBe('2025-10-01T20:00:00.000Z');
    expect(updated.session.venue).toBe('Place B');
    expect(updated.session.gear).toBe('Backline fournie');
    expect(updated.session.friendsCountPerMember).toEqual({ [memberId]: 4 });
  });

  it('moves a practice onto another concert it prepares', async () => {
    const { app, cookieHeader } = await buildAuthenticatedApp();
    const concert = await readJson(
      await jsonRequest(app, '/api/sessions', {
        method: 'POST',
        body: {
          kind: 'concert',
          date: '2025-09-13T18:30:00Z',
          venue: 'Place A',
          capacity: 80,
          friendsCountPerMember: {},
        },
        cookieHeader,
      }),
      singleEnvelope,
    );
    const practice = await readJson(
      await jsonRequest(app, '/api/sessions', {
        method: 'POST',
        body: { kind: 'practice', date: '2025-09-08T19:00:00Z' },
        cookieHeader,
      }),
      singleEnvelope,
    );
    const update = await jsonRequest(app, `/api/sessions/${practice.session.id}`, {
      method: 'PUT',
      body: { preparedConcertId: concert.session.id },
      cookieHeader,
    });
    expect(update.status).toBe(200);
    expect((await readJson(update, singleEnvelope)).session.preparedConcertId).toBe(
      concert.session.id,
    );
  });

  it('detaches the setlists on session delete, and keeps them', async () => {
    const { app, cookieHeader } = await buildAuthenticatedApp();
    const songCreate = await jsonRequest(app, '/api/songs', {
      method: 'POST',
      body: { title: 'X', status: 'idea' },
      cookieHeader,
    });
    const songId = (
      await readJson(songCreate, z.object({ song: z.object({ id: z.string().uuid() }) }))
    ).song.id;

    const sessionCreate = await jsonRequest(app, '/api/sessions', {
      method: 'POST',
      body: {
        kind: 'concert',
        date: '2025-09-13T18:30:00Z',
        venue: 'X',
        capacity: 0,
        friendsCountPerMember: {},
      },
      cookieHeader,
    });
    const sessionId = (await readJson(sessionCreate, singleEnvelope)).session.id;

    const setlistCreate = await jsonRequest(app, '/api/setlists', {
      method: 'POST',
      body: { name: 'Set 1', sessionId },
      cookieHeader,
    });
    const setlistId = (await readJson(setlistCreate, setlistEnvelope)).setlist.id;

    await jsonRequest(app, `/api/setlists/${setlistId}/entries`, {
      method: 'POST',
      body: { songId },
      cookieHeader,
    });

    await jsonRequest(app, `/api/sessions/${sessionId}`, { method: 'DELETE', cookieHeader });

    const afterDelete = await readJson(
      await jsonRequest(app, `/api/setlists/by-session/${sessionId}`, { cookieHeader }),
      setlistListEnvelope,
    );
    expect(afterDelete.setlists).toEqual([]);

    const stillListed = await readJson(
      await jsonRequest(app, '/api/setlists', { cookieHeader }),
      setlistListEnvelope,
    );
    expect(stillListed.setlists.map((setlist) => setlist.id)).toEqual([setlistId]);
    const keptEntries = await readJson(
      await jsonRequest(app, `/api/setlists/${setlistId}/entries`, { cookieHeader }),
      entriesEnvelope,
    );
    expect(keptEntries.entries).toHaveLength(1);
  });
});
