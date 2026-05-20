/**
 * Back-e2e for the setlists endpoints. Covers create + add/update/remove
 * entries + reorder + delete-compaction. The transition warning rule
 * is unit-tested in `transition.core.test.ts`; here we just verify the
 * end-to-end persistence semantics.
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
  lineupOverride: z.record(z.string(), z.string().nullable()).nullable(),
  energy: z.number().int().nullable(),
  keyOverride: z.string().nullable(),
  capo: z.number().int().nullable(),
  notes: z.string(),
});
const setlistEnvelope = z.object({
  setlist: z.object({ id: z.string().uuid(), sessionId: z.string().uuid() }),
});
const singleEntryEnvelope = z.object({ entry: entrySchema });
const entryListEnvelope = z.object({ entries: z.array(entrySchema) });
const sessionEnvelope = z.object({ session: z.object({ id: z.string().uuid() }) });
const songEnvelope = z.object({ song: z.object({ id: z.string().uuid() }) });

async function seed(
  app: Awaited<ReturnType<typeof buildAuthenticatedApp>>['app'],
  cookieHeader: string,
): Promise<{ setlistId: string; songIds: readonly string[] }> {
  const sessionRes = await jsonRequest(app, '/api/sessions', {
    method: 'POST',
    body: { kind: 'practice', date: '2025-09-08T19:00:00Z' },
    cookieHeader,
  });
  const sessionId = (await readJson(sessionRes, sessionEnvelope)).session.id;
  const setlistRes = await jsonRequest(app, '/api/setlists', {
    method: 'POST',
    body: { sessionId },
    cookieHeader,
  });
  const setlistId = (await readJson(setlistRes, setlistEnvelope)).setlist.id;
  const songIds: string[] = [];
  for (const title of ['Alpha', 'Bravo', 'Charlie']) {
    const songRes = await jsonRequest(app, '/api/songs', {
      method: 'POST',
      body: { title, status: 'idea' },
      cookieHeader,
    });
    songIds.push((await readJson(songRes, songEnvelope)).song.id);
  }
  return { setlistId, songIds };
}

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
    const entries = await readJson(
      await jsonRequest(app, `/api/setlists/${setlistId}/entries`, { cookieHeader }),
      entryListEnvelope,
    );
    expect(entries.entries.map((row) => row.position)).toEqual([0, 1, 2]);
  });

  it('reorders entries via PUT /reorder', async () => {
    const { app, cookieHeader } = await buildAuthenticatedApp();
    const { setlistId, songIds } = await seed(app, cookieHeader);
    const entryIds: string[] = [];
    for (const songId of songIds) {
      const res = await jsonRequest(app, `/api/setlists/${setlistId}/entries`, {
        method: 'POST',
        body: { songId },
        cookieHeader,
      });
      entryIds.push((await readJson(res, singleEntryEnvelope)).entry.id);
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
      const res = await jsonRequest(app, `/api/setlists/${setlistId}/entries`, {
        method: 'POST',
        body: { songId },
        cookieHeader,
      });
      ids.push((await readJson(res, singleEntryEnvelope)).entry.id);
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

  it('rejects the creation of a second setlist on the same session', async () => {
    const { app, cookieHeader } = await buildAuthenticatedApp();
    const sessionRes = await jsonRequest(app, '/api/sessions', {
      method: 'POST',
      body: { kind: 'practice', date: '2025-09-08T19:00:00Z' },
      cookieHeader,
    });
    const sessionId = (await readJson(sessionRes, sessionEnvelope)).session.id;
    const first = await jsonRequest(app, '/api/setlists', {
      method: 'POST',
      body: { sessionId },
      cookieHeader,
    });
    const second = await jsonRequest(app, '/api/setlists', {
      method: 'POST',
      body: { sessionId },
      cookieHeader,
    });
    expect(first.status).toBe(201);
    expect(second.status).toBe(409);
  });
});
