/**
 * Back-e2e for the setlists endpoints. Covers create + attach/detach to
 * sessions + rename + delete + add/update/remove entries + reorder +
 * delete-compaction. The transition warning rule is unit-tested in
 * `transition.core.test.ts`; here we just verify the end-to-end
 * persistence semantics.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { buildAuthenticatedApp, jsonRequest, readJson } from '../../../test/auth-utils';
import { testDatabase, truncateAllTables } from '../../../test/database-utils';

const entrySchema = z.object({
  id: z.string().uuid(),
  setlistId: z.string().uuid(),
  songId: z.string().uuid(),
  position: z.number().int(),
  lineupOverride: z.record(z.string(), z.array(z.string())).nullable(),
  energy: z.number().int().nullable(),
  keyOverride: z.string().nullable(),
  capo: z.number().int().nullable(),
  notes: z.string(),
});
const setlistEnvelope = z.object({
  setlist: z.object({ id: z.string().uuid(), name: z.string() }),
});
const setlistSummaryListEnvelope = z.object({
  setlists: z.array(
    z.object({
      id: z.string().uuid(),
      name: z.string(),
      songCount: z.number().int(),
      sessionIds: z.array(z.string().uuid()),
    }),
  ),
});
const singleEntryEnvelope = z.object({ entry: entrySchema });
const entryListEnvelope = z.object({ entries: z.array(entrySchema) });
const sessionEnvelope = z.object({ session: z.object({ id: z.string().uuid() }) });
const songEnvelope = z.object({ song: z.object({ id: z.string().uuid() }) });

async function createPractice(
  app: Awaited<ReturnType<typeof buildAuthenticatedApp>>['app'],
  cookieHeader: string,
): Promise<string> {
  const response = await jsonRequest(app, '/api/sessions', {
    method: 'POST',
    body: { kind: 'practice', date: '2025-09-08T19:00:00Z' },
    cookieHeader,
  });
  return (await readJson(response, sessionEnvelope)).session.id;
}

async function seed(
  app: Awaited<ReturnType<typeof buildAuthenticatedApp>>['app'],
  cookieHeader: string,
): Promise<{ setlistId: string; songIds: readonly string[] }> {
  const sessionId = await createPractice(app, cookieHeader);
  const setlistResponse = await jsonRequest(app, '/api/setlists', {
    method: 'POST',
    body: { name: 'Set 1', sessionId },
    cookieHeader,
  });
  const setlistId = (await readJson(setlistResponse, setlistEnvelope)).setlist.id;
  const songIds: string[] = [];
  for (const title of ['Alpha', 'Bravo', 'Charlie']) {
    const songResponse = await jsonRequest(app, '/api/songs', {
      method: 'POST',
      body: { title, status: 'idea' },
      cookieHeader,
    });
    songIds.push((await readJson(songResponse, songEnvelope)).song.id);
  }
  return { setlistId, songIds };
}

// @FollowsBlueprint test-back-e2e
describe('setlists controller (back-e2e)', () => {
  beforeEach(async () => {
    await truncateAllTables(testDatabase());
  });

  it('appends entries with increasing positions', async () => {
    const { app, cookieHeader } = await buildAuthenticatedApp();
    const { setlistId, songIds } = await seed(app, cookieHeader);
    for (const songId of songIds) {
      await jsonRequest(app, `/api/setlists/${setlistId}/entries`, {
        method: 'POST',
        body: { songId },
        cookieHeader,
      });
    }
    const listedEntries = await readJson(
      await jsonRequest(app, `/api/setlists/${setlistId}/entries`, { cookieHeader }),
      entryListEnvelope,
    );
    expect(listedEntries.entries.map((row) => row.position)).toEqual([0, 1, 2]);
  });

  it('reorders entries via PUT /reorder', async () => {
    const { app, cookieHeader } = await buildAuthenticatedApp();
    const { setlistId, songIds } = await seed(app, cookieHeader);
    const entryIds: string[] = [];
    for (const songId of songIds) {
      const response = await jsonRequest(app, `/api/setlists/${setlistId}/entries`, {
        method: 'POST',
        body: { songId },
        cookieHeader,
      });
      entryIds.push((await readJson(response, singleEntryEnvelope)).entry.id);
    }
    const reversed = [...entryIds].reverse();
    const reorder = await jsonRequest(app, `/api/setlists/${setlistId}/reorder`, {
      method: 'PUT',
      body: { entryIds: reversed },
      cookieHeader,
    });
    expect(reorder.status).toBe(200);
    const after = await readJson(
      await jsonRequest(app, `/api/setlists/${setlistId}/entries`, { cookieHeader }),
      entryListEnvelope,
    );
    expect(after.entries.map((row) => row.id)).toEqual(reversed);
  });

  it('refuses a reorder payload whose ids do not match the current set', async () => {
    const { app, cookieHeader } = await buildAuthenticatedApp();
    const { setlistId, songIds } = await seed(app, cookieHeader);
    await jsonRequest(app, `/api/setlists/${setlistId}/entries`, {
      method: 'POST',
      body: { songId: songIds[0] },
      cookieHeader,
    });
    const stale = await jsonRequest(app, `/api/setlists/${setlistId}/reorder`, {
      method: 'PUT',
      body: { entryIds: ['11111111-1111-1111-1111-111111111111'] },
      cookieHeader,
    });
    expect(stale.status).toBe(409);
  });

  it('compacts positions after a delete', async () => {
    const { app, cookieHeader } = await buildAuthenticatedApp();
    const { setlistId, songIds } = await seed(app, cookieHeader);
    const ids: string[] = [];
    for (const songId of songIds) {
      const response = await jsonRequest(app, `/api/setlists/${setlistId}/entries`, {
        method: 'POST',
        body: { songId },
        cookieHeader,
      });
      ids.push((await readJson(response, singleEntryEnvelope)).entry.id);
    }
    // Remove the middle entry; the others must end up at positions [0, 1].
    await jsonRequest(app, `/api/setlists/${setlistId}/entries/${ids[1]}`, {
      method: 'DELETE',
      cookieHeader,
    });
    const after = await readJson(
      await jsonRequest(app, `/api/setlists/${setlistId}/entries`, { cookieHeader }),
      entryListEnvelope,
    );
    expect(after.entries.map((row) => row.position)).toEqual([0, 1]);
  });

  it('updates an entry partially', async () => {
    const { app, cookieHeader } = await buildAuthenticatedApp();
    const { setlistId, songIds } = await seed(app, cookieHeader);
    const created = await readJson(
      await jsonRequest(app, `/api/setlists/${setlistId}/entries`, {
        method: 'POST',
        body: { songId: songIds[0] },
        cookieHeader,
      }),
      singleEntryEnvelope,
    );
    const update = await jsonRequest(
      app,
      `/api/setlists/${setlistId}/entries/${created.entry.id}`,
      { method: 'PUT', body: { energy: 7, capo: 2, notes: 'go!' }, cookieHeader },
    );
    expect(update.status).toBe(200);
    const updated = await readJson(update, singleEntryEnvelope);
    expect(updated.entry.energy).toBe(7);
    expect(updated.entry.capo).toBe(2);
    expect(updated.entry.notes).toBe('go!');
  });

  it('writes a lineup override on an entry and clears it again', async () => {
    const { app, cookieHeader } = await buildAuthenticatedApp();
    const { setlistId, songIds } = await seed(app, cookieHeader);
    const memberId = crypto.randomUUID();
    const instrumentId = crypto.randomUUID();
    const created = await readJson(
      await jsonRequest(app, `/api/setlists/${setlistId}/entries`, {
        method: 'POST',
        body: { songId: songIds[0] },
        cookieHeader,
      }),
      singleEntryEnvelope,
    );
    const withOverride = await readJson(
      await jsonRequest(app, `/api/setlists/${setlistId}/entries/${created.entry.id}`, {
        method: 'PUT',
        body: { lineupOverride: { [memberId]: [instrumentId] }, keyOverride: 'Bb' },
        cookieHeader,
      }),
      singleEntryEnvelope,
    );
    expect(withOverride.entry.lineupOverride).toEqual({ [memberId]: [instrumentId] });
    expect(withOverride.entry.keyOverride).toBe('Bb');

    const cleared = await readJson(
      await jsonRequest(app, `/api/setlists/${setlistId}/entries/${created.entry.id}`, {
        method: 'PUT',
        body: { lineupOverride: null, keyOverride: null },
        cookieHeader,
      }),
      singleEntryEnvelope,
    );
    expect(cleared.entry.lineupOverride).toBeNull();
    expect(cleared.entry.keyOverride).toBeNull();
  });

  it('carries several setlists on one session, in the order they were attached', async () => {
    const { app, cookieHeader } = await buildAuthenticatedApp();
    const sessionId = await createPractice(app, cookieHeader);
    for (const name of ['Premier set', 'Second set']) {
      const created = await jsonRequest(app, '/api/setlists', {
        method: 'POST',
        body: { name, sessionId },
        cookieHeader,
      });
      expect(created.status).toBe(201);
    }
    const listed = await readJson(
      await jsonRequest(app, `/api/setlists/by-session/${sessionId}`, { cookieHeader }),
      setlistSummaryListEnvelope,
    );
    expect(listed.setlists.map((setlist) => setlist.name)).toEqual(['Premier set', 'Second set']);
  });

  it('refuses to create a setlist on a session that does not exist', async () => {
    const { app, cookieHeader } = await buildAuthenticatedApp();
    const response = await jsonRequest(app, '/api/setlists', {
      method: 'POST',
      body: { name: 'Set 1', sessionId: '11111111-1111-1111-1111-111111111111' },
      cookieHeader,
    });
    expect(response.status).toBe(404);
  });

  it('plays one setlist in two sessions, and lists it under both', async () => {
    const { app, cookieHeader } = await buildAuthenticatedApp();
    const practiceId = await createPractice(app, cookieHeader);
    const concertId = await createPractice(app, cookieHeader);
    const created = await readJson(
      await jsonRequest(app, '/api/setlists', {
        method: 'POST',
        body: { name: 'Filage', sessionId: practiceId },
        cookieHeader,
      }),
      setlistEnvelope,
    );
    const link = await jsonRequest(app, `/api/setlists/${created.setlist.id}/sessions`, {
      method: 'POST',
      body: { sessionId: concertId },
      cookieHeader,
    });
    expect(link.status).toBe(201);
    for (const sessionId of [practiceId, concertId]) {
      const listed = await readJson(
        await jsonRequest(app, `/api/setlists/by-session/${sessionId}`, { cookieHeader }),
        setlistSummaryListEnvelope,
      );
      expect(listed.setlists.map((setlist) => setlist.id)).toEqual([created.setlist.id]);
    }
  });

  it('detaches a setlist from one session and leaves it in the other', async () => {
    const { app, cookieHeader } = await buildAuthenticatedApp();
    const { setlistId } = await seed(app, cookieHeader);
    const otherSessionId = await createPractice(app, cookieHeader);
    await jsonRequest(app, `/api/setlists/${setlistId}/sessions`, {
      method: 'POST',
      body: { sessionId: otherSessionId },
      cookieHeader,
    });
    const detached = await jsonRequest(
      app,
      `/api/setlists/${setlistId}/sessions/${otherSessionId}`,
      { method: 'DELETE', cookieHeader },
    );
    expect(detached.status).toBe(200);
    const listed = await readJson(
      await jsonRequest(app, `/api/setlists/by-session/${otherSessionId}`, { cookieHeader }),
      setlistSummaryListEnvelope,
    );
    expect(listed.setlists).toEqual([]);
    const stillListed = await readJson(
      await jsonRequest(app, '/api/setlists', { cookieHeader }),
      setlistSummaryListEnvelope,
    );
    expect(stillListed.setlists.map((setlist) => setlist.id)).toEqual([setlistId]);
  });

  it('answers 404 when detaching a setlist the session does not carry', async () => {
    const { app, cookieHeader } = await buildAuthenticatedApp();
    const { setlistId } = await seed(app, cookieHeader);
    const otherSessionId = await createPractice(app, cookieHeader);
    const response = await jsonRequest(
      app,
      `/api/setlists/${setlistId}/sessions/${otherSessionId}`,
      { method: 'DELETE', cookieHeader },
    );
    expect(response.status).toBe(404);
  });

  it('lists every setlist with its song count and the sessions playing it', async () => {
    const { app, cookieHeader } = await buildAuthenticatedApp();
    const { setlistId, songIds } = await seed(app, cookieHeader);
    await jsonRequest(app, `/api/setlists/${setlistId}/entries`, {
      method: 'POST',
      body: { songId: songIds[0] },
      cookieHeader,
    });
    const listed = await readJson(
      await jsonRequest(app, '/api/setlists', { cookieHeader }),
      setlistSummaryListEnvelope,
    );
    expect(listed.setlists).toHaveLength(1);
    expect(listed.setlists[0]?.songCount).toBe(1);
    expect(listed.setlists[0]?.sessionIds).toHaveLength(1);
  });

  it('renames a setlist', async () => {
    const { app, cookieHeader } = await buildAuthenticatedApp();
    const { setlistId } = await seed(app, cookieHeader);
    const renamed = await readJson(
      await jsonRequest(app, `/api/setlists/${setlistId}`, {
        method: 'PUT',
        body: { name: 'Rappel' },
        cookieHeader,
      }),
      setlistEnvelope,
    );
    expect(renamed.setlist.name).toBe('Rappel');
  });

  it('deletes a setlist with its entries and its links', async () => {
    const { app, cookieHeader } = await buildAuthenticatedApp();
    const { setlistId, songIds } = await seed(app, cookieHeader);
    await jsonRequest(app, `/api/setlists/${setlistId}/entries`, {
      method: 'POST',
      body: { songId: songIds[0] },
      cookieHeader,
    });
    const deleted = await jsonRequest(app, `/api/setlists/${setlistId}`, {
      method: 'DELETE',
      cookieHeader,
    });
    expect(deleted.status).toBe(200);
    const listed = await readJson(
      await jsonRequest(app, '/api/setlists', { cookieHeader }),
      setlistSummaryListEnvelope,
    );
    expect(listed.setlists).toEqual([]);
    const gone = await jsonRequest(app, `/api/setlists/${setlistId}`, { cookieHeader });
    expect(gone.status).toBe(404);
  });
});
