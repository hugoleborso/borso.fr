import { eq, getTableName } from 'drizzle-orm';
import { beforeEach, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { buildAuthenticatedApp, jsonRequest, readJson } from '../../../test/auth-utils';
import {
  holdWritesToTable,
  type LockHold,
  runSecondWhileFirstWaitsOnHold,
  runWithWritesToTableHeld,
  testDatabase,
  truncateAllTables,
} from '../../../test/database-utils';
import { sessionTable } from '../sessions/sessions.schema';
import { sessionSetlistTable, setlistEntryTable, setlistTable } from './setlists.schema';

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
      songIds: z.array(z.string().uuid()),
      sessionIds: z.array(z.string().uuid()),
    }),
  ),
});
const singleEntryEnvelope = z.object({ entry: entrySchema });
const entryListEnvelope = z.object({ entries: z.array(entrySchema) });
const sessionEnvelope = z.object({ session: z.object({ id: z.string().uuid() }) });
const songEnvelope = z.object({ song: z.object({ id: z.string().uuid() }) });

const UNKNOWN_ID = '00000000-0000-4000-8000-000000000000';

function holdSetlistRow(setlistId: string): LockHold {
  return async (transaction) =>
    await transaction
      .select({ id: setlistTable.id })
      .from(setlistTable)
      .where(eq(setlistTable.id, setlistId))
      .for('update');
}

function holdSessionRow(sessionId: string): LockHold {
  return async (transaction) =>
    await transaction
      .select({ id: sessionTable.id })
      .from(sessionTable)
      .where(eq(sessionTable.id, sessionId))
      .for('update');
}

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

  it('gives each of two entries appended at the same moment a position of its own', async () => {
    const { app, cookieHeader } = await buildAuthenticatedApp();
    const { setlistId, songIds } = await seed(app, cookieHeader);
    const appended = await Promise.all(
      songIds.map(
        async (songId) =>
          await jsonRequest(app, `/api/setlists/${setlistId}/entries`, {
            method: 'POST',
            body: { songId },
            cookieHeader,
          }),
      ),
    );
    expect(appended.map((response) => response.status)).toEqual([201, 201, 201]);
    const after = await readJson(
      await jsonRequest(app, `/api/setlists/${setlistId}/entries`, { cookieHeader }),
      entryListEnvelope,
    );
    expect(after.entries.map((row) => row.position)).toEqual([0, 1, 2]);
  });

  it('applies one of two reorders sent at the same moment whole, never a mix of both', async () => {
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
    const rotated = [...entryIds.slice(1), ...entryIds.slice(0, 1)];
    const reorders = await Promise.all(
      [reversed, rotated].map(
        async (order) =>
          await jsonRequest(app, `/api/setlists/${setlistId}/reorder`, {
            method: 'PUT',
            body: { entryIds: order },
            cookieHeader,
          }),
      ),
    );
    expect(reorders.map((response) => response.status)).toEqual([200, 200]);
    const after = await readJson(
      await jsonRequest(app, `/api/setlists/${setlistId}/entries`, { cookieHeader }),
      entryListEnvelope,
    );
    expect(after.entries.map((row) => row.position)).toEqual([0, 1, 2]);
    expect([reversed, rotated]).toContainEqual(after.entries.map((row) => row.id));
  });

  it('keeps positions distinct when an append and a reorder land at the same moment', async () => {
    const { app, cookieHeader } = await buildAuthenticatedApp();
    const { setlistId, songIds } = await seed(app, cookieHeader);
    const [firstSongId, secondSongId, thirdSongId] = songIds;
    const entryIds: string[] = [];
    for (const songId of [firstSongId, secondSongId]) {
      const response = await jsonRequest(app, `/api/setlists/${setlistId}/entries`, {
        method: 'POST',
        body: { songId },
        cookieHeader,
      });
      entryIds.push((await readJson(response, singleEntryEnvelope)).entry.id);
    }
    await Promise.all([
      jsonRequest(app, `/api/setlists/${setlistId}/entries`, {
        method: 'POST',
        body: { songId: thirdSongId },
        cookieHeader,
      }),
      jsonRequest(app, `/api/setlists/${setlistId}/reorder`, {
        method: 'PUT',
        body: { entryIds: [...entryIds].reverse() },
        cookieHeader,
      }),
    ]);
    const after = await readJson(
      await jsonRequest(app, `/api/setlists/${setlistId}/entries`, { cookieHeader }),
      entryListEnvelope,
    );
    expect(after.entries.map((row) => row.position)).toEqual([0, 1, 2]);
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

  it('gives two setlists joining one session at the same moment a position each', async () => {
    const { app, cookieHeader } = await buildAuthenticatedApp();
    const sessionId = await createPractice(app, cookieHeader);
    const loose = await readJson(
      await jsonRequest(app, '/api/setlists', {
        method: 'POST',
        body: { name: 'Rappel', sessionId: null },
        cookieHeader,
      }),
      setlistEnvelope,
    );
    const answers = await runWithWritesToTableHeld(
      'session_setlist',
      2,
      async () =>
        await Promise.all([
          jsonRequest(app, '/api/setlists', {
            method: 'POST',
            body: { name: 'Filage', sessionId },
            cookieHeader,
          }),
          jsonRequest(app, `/api/setlists/${loose.setlist.id}/sessions`, {
            method: 'POST',
            body: { sessionId },
            cookieHeader,
          }),
        ]),
    );
    expect(answers.map((answer) => answer.status)).toEqual([201, 201]);
    const links = await testDatabase().select().from(sessionSetlistTable);
    expect(links.map((link) => link.position).toSorted((first, second) => first - second)).toEqual([
      0, 1,
    ]);
  });

  it('leaves no link behind when the session is deleted while a setlist joins it', async () => {
    const { app, cookieHeader } = await buildAuthenticatedApp();
    const sessionId = await createPractice(app, cookieHeader);
    const [, deletion] = await runSecondWhileFirstWaitsOnHold(
      holdWritesToTable(getTableName(setlistTable)),
      async () =>
        await jsonRequest(app, '/api/setlists', {
          method: 'POST',
          body: { name: 'Filage', sessionId },
          cookieHeader,
        }),
      async () =>
        await jsonRequest(app, `/api/sessions/${sessionId}`, { method: 'DELETE', cookieHeader }),
    );
    expect(deletion.status).toBe(200);
    expect(await testDatabase().select().from(sessionSetlistTable)).toEqual([]);
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

  it('lists every setlist with its song count, its songs and the sessions playing it', async () => {
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
    expect(listed.setlists[0]?.songIds).toEqual([songIds[0]]);
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

  it('answers 404 when writing the entries of a setlist that does not exist', async () => {
    const { app, cookieHeader } = await buildAuthenticatedApp();
    const { songIds } = await seed(app, cookieHeader);
    const append = await jsonRequest(app, `/api/setlists/${UNKNOWN_ID}/entries`, {
      method: 'POST',
      body: { songId: songIds[0] },
      cookieHeader,
    });
    const reorder = await jsonRequest(app, `/api/setlists/${UNKNOWN_ID}/reorder`, {
      method: 'PUT',
      body: { entryIds: [UNKNOWN_ID] },
      cookieHeader,
    });
    const removal = await jsonRequest(app, `/api/setlists/${UNKNOWN_ID}/entries/${UNKNOWN_ID}`, {
      method: 'DELETE',
      cookieHeader,
    });
    expect([append.status, reorder.status, removal.status]).toEqual([404, 404, 404]);
    expect(await testDatabase().select().from(setlistEntryTable)).toEqual([]);
  });

  it('refuses an entry for a setlist deleted while the entry was being written', async () => {
    const { app, cookieHeader } = await buildAuthenticatedApp();
    const { setlistId, songIds } = await seed(app, cookieHeader);
    const [deletion, append] = await runSecondWhileFirstWaitsOnHold(
      holdSetlistRow(setlistId),
      async () =>
        await jsonRequest(app, `/api/setlists/${setlistId}`, { method: 'DELETE', cookieHeader }),
      async () =>
        await jsonRequest(app, `/api/setlists/${setlistId}/entries`, {
          method: 'POST',
          body: { songId: songIds[0] },
          cookieHeader,
        }),
    );
    expect(deletion.status).toBe(200);
    expect(append.status).toBe(404);
    expect(await testDatabase().select().from(setlistEntryTable)).toEqual([]);
  });

  it('leaves no link to a setlist deleted while it was joining a session', async () => {
    const { app, cookieHeader } = await buildAuthenticatedApp();
    const sessionId = await createPractice(app, cookieHeader);
    const loose = await readJson(
      await jsonRequest(app, '/api/setlists', {
        method: 'POST',
        body: { name: 'Rappel', sessionId: null },
        cookieHeader,
      }),
      setlistEnvelope,
    );
    const [, deletion] = await runSecondWhileFirstWaitsOnHold(
      holdSessionRow(sessionId),
      async () =>
        await jsonRequest(app, `/api/setlists/${loose.setlist.id}/sessions`, {
          method: 'POST',
          body: { sessionId },
          cookieHeader,
        }),
      async () =>
        await jsonRequest(app, `/api/setlists/${loose.setlist.id}`, {
          method: 'DELETE',
          cookieHeader,
        }),
    );
    expect(deletion.status).toBe(200);
    expect(await testDatabase().select().from(sessionSetlistTable)).toEqual([]);
  });
});
