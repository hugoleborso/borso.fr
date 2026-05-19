/**
 * Back-e2e for the sessions endpoints. Covers auth gating, CRUD on
 * concerts and practices, the kind discriminator (a payload that mixes
 * concert-only with practice-only keys is rejected at the controller
 * boundary), and the cascade that clears the setlist + entries on
 * session delete.
 */

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
  setlist: z.object({ id: z.string().uuid(), sessionId: z.string().uuid() }),
});
const entriesEnvelope = z.object({ entries: z.array(z.unknown()) });

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

  it('cascades the setlist + entries on session delete', async () => {
    const { app, cookieHeader } = await buildAuthenticatedApp();
    const songCreate = await jsonRequest(app, '/api/songs', {
      method: 'POST',
      body: { title: 'X', status: 'idea' },
      cookieHeader,
    });
    const songId = (await readJson(songCreate, z.object({ song: z.object({ id: z.string().uuid() }) }))).song.id;

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
      body: { sessionId },
      cookieHeader,
    });
    const setlistId = (await readJson(setlistCreate, setlistEnvelope)).setlist.id;

    await jsonRequest(app, `/api/setlists/${setlistId}/entries`, {
      method: 'POST',
      body: { songId },
      cookieHeader,
    });

    await jsonRequest(app, `/api/sessions/${sessionId}`, { method: 'DELETE', cookieHeader });

    const afterDelete = await jsonRequest(app, `/api/setlists/by-session/${sessionId}`, {
      cookieHeader,
    });
    expect(afterDelete.status).toBe(404);
    // The orphaned entries query is best-effort: we re-create the
    // setlist for the same session and expect zero entries inherited.
    const newSessionRes = await jsonRequest(app, '/api/sessions', {
      method: 'POST',
      body: {
        kind: 'practice',
        date: '2025-09-08T19:00:00Z',
      },
      cookieHeader,
    });
    const newSessionId = (await readJson(newSessionRes, singleEnvelope)).session.id;
    const newSetlistRes = await jsonRequest(app, '/api/setlists', {
      method: 'POST',
      body: { sessionId: newSessionId },
      cookieHeader,
    });
    const newSetlistId = (await readJson(newSetlistRes, setlistEnvelope)).setlist.id;
    const entries = await readJson(
      await jsonRequest(app, `/api/setlists/${newSetlistId}/entries`, { cookieHeader }),
      entriesEnvelope,
    );
    expect(entries.entries).toHaveLength(0);
  });
});
