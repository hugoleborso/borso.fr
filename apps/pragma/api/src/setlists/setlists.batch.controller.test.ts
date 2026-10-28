import { beforeEach, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { buildAuthenticatedApp, jsonRequest, readJson } from '../../../test/auth-utils';
import { testDatabase, truncateAllTables } from '../../../test/database-utils';
import { setlistEntryTable } from './setlists.schema';

const entrySchema = z.object({
  id: z.string().uuid(),
  songId: z.string().uuid(),
  position: z.number().int(),
  energy: z.number().int().nullable(),
});
const entryListEnvelope = z.object({ entries: z.array(entrySchema) });

type ListedEntry = z.infer<typeof entrySchema>;
const setlistEnvelope = z.object({ setlist: z.object({ id: z.string().uuid() }) });
const songEnvelope = z.object({ song: z.object({ id: z.string().uuid() }) });

const UNKNOWN_ID = '00000000-0000-4000-8000-000000000000';
const SONG_TITLES = ['Alpha', 'Bravo', 'Charlie', 'Delta'] as const;

type AuthenticatedApp = Awaited<ReturnType<typeof buildAuthenticatedApp>>['app'];

async function seedSetlistAndSongs(
  app: AuthenticatedApp,
  cookieHeader: string,
): Promise<{ setlistId: string; songIds: readonly string[] }> {
  const setlistResponse = await jsonRequest(app, '/api/setlists', {
    method: 'POST',
    body: { name: 'Set 1' },
    cookieHeader,
  });
  const setlistId = (await readJson(setlistResponse, setlistEnvelope)).setlist.id;
  const songIds: string[] = [];
  for (const title of SONG_TITLES) {
    const songResponse = await jsonRequest(app, '/api/songs', {
      method: 'POST',
      body: { title, status: 'idea' },
      cookieHeader,
    });
    songIds.push((await readJson(songResponse, songEnvelope)).song.id);
  }
  return { setlistId, songIds };
}

async function listEntries(
  app: AuthenticatedApp,
  cookieHeader: string,
  setlistId: string,
): Promise<ListedEntry[]> {
  const response = await jsonRequest(app, `/api/setlists/${setlistId}/entries`, { cookieHeader });
  return (await readJson(response, entryListEnvelope)).entries;
}

// @FollowsBlueprint test-back-e2e
describe('setlists batch add (back-e2e)', () => {
  beforeEach(async () => {
    await truncateAllTables(testDatabase());
  });

  it('appends the songs after the existing entries, in the order they were picked', async () => {
    const { app, cookieHeader } = await buildAuthenticatedApp();
    const { setlistId, songIds } = await seedSetlistAndSongs(app, cookieHeader);
    const [first, second, third, fourth] = songIds;
    await jsonRequest(app, `/api/setlists/${setlistId}/entries`, {
      method: 'POST',
      body: { songId: first },
      cookieHeader,
    });
    const response = await jsonRequest(app, `/api/setlists/${setlistId}/entries/batch`, {
      method: 'POST',
      body: { songIds: [fourth, second, third] },
      cookieHeader,
    });
    expect(response.status).toBe(201);
    const added = (await readJson(response, entryListEnvelope)).entries;
    expect(added.map((entry) => [entry.songId, entry.position])).toEqual([
      [fourth, 1],
      [second, 2],
      [third, 3],
    ]);
    expect(added.every((entry) => entry.energy === null)).toBe(true);
    const listed = await listEntries(app, cookieHeader, setlistId);
    expect(listed.map((entry) => entry.songId)).toEqual([first, fourth, second, third]);
  });

  it('adds nothing when one of the songs does not exist', async () => {
    const { app, cookieHeader } = await buildAuthenticatedApp();
    const { setlistId, songIds } = await seedSetlistAndSongs(app, cookieHeader);
    const response = await jsonRequest(app, `/api/setlists/${setlistId}/entries/batch`, {
      method: 'POST',
      body: { songIds: [songIds[0], UNKNOWN_ID, songIds[1]] },
      cookieHeader,
    });
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: 'song-not-found' });
    expect(await testDatabase().select().from(setlistEntryTable)).toEqual([]);
  });

  it('answers 404 for a setlist that does not exist', async () => {
    const { app, cookieHeader } = await buildAuthenticatedApp();
    const { songIds } = await seedSetlistAndSongs(app, cookieHeader);
    const response = await jsonRequest(app, `/api/setlists/${UNKNOWN_ID}/entries/batch`, {
      method: 'POST',
      body: { songIds: [songIds[0]] },
      cookieHeader,
    });
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: 'not-found' });
    expect(await testDatabase().select().from(setlistEntryTable)).toEqual([]);
  });

  it('refuses an empty list and a list naming one song twice', async () => {
    const { app, cookieHeader } = await buildAuthenticatedApp();
    const { setlistId, songIds } = await seedSetlistAndSongs(app, cookieHeader);
    const empty = await jsonRequest(app, `/api/setlists/${setlistId}/entries/batch`, {
      method: 'POST',
      body: { songIds: [] },
      cookieHeader,
    });
    const repeated = await jsonRequest(app, `/api/setlists/${setlistId}/entries/batch`, {
      method: 'POST',
      body: { songIds: [songIds[0], songIds[0]] },
      cookieHeader,
    });
    expect([empty.status, repeated.status]).toEqual([400, 400]);
    expect(await listEntries(app, cookieHeader, setlistId)).toEqual([]);
  });

  it('keeps two batches sent at the same moment contiguous, each in its own run of positions', async () => {
    const { app, cookieHeader } = await buildAuthenticatedApp();
    const { setlistId, songIds } = await seedSetlistAndSongs(app, cookieHeader);
    const [first, second, third, fourth] = songIds;
    const batches = [
      [first, second],
      [third, fourth],
    ];
    const responses = await Promise.all(
      batches.map(
        async (batch) =>
          await jsonRequest(app, `/api/setlists/${setlistId}/entries/batch`, {
            method: 'POST',
            body: { songIds: batch },
            cookieHeader,
          }),
      ),
    );
    expect(responses.map((response) => response.status)).toEqual([201, 201]);
    const listed = await listEntries(app, cookieHeader, setlistId);
    expect(listed.map((entry) => entry.position)).toEqual([0, 1, 2, 3]);
    expect([
      [first, second, third, fourth],
      [third, fourth, first, second],
    ]).toContainEqual(listed.map((entry) => entry.songId));
  });

  it('gives a batch and a single append sent at the same moment distinct positions', async () => {
    const { app, cookieHeader } = await buildAuthenticatedApp();
    const { setlistId, songIds } = await seedSetlistAndSongs(app, cookieHeader);
    const [first, second, third] = songIds;
    const [batch, single] = await Promise.all([
      jsonRequest(app, `/api/setlists/${setlistId}/entries/batch`, {
        method: 'POST',
        body: { songIds: [first, second] },
        cookieHeader,
      }),
      jsonRequest(app, `/api/setlists/${setlistId}/entries`, {
        method: 'POST',
        body: { songId: third },
        cookieHeader,
      }),
    ]);
    expect([batch.status, single.status]).toEqual([201, 201]);
    const listed = await listEntries(app, cookieHeader, setlistId);
    expect(listed.map((entry) => entry.position)).toEqual([0, 1, 2]);
    expect([
      [first, second, third],
      [third, first, second],
    ]).toContainEqual(listed.map((entry) => entry.songId));
  });
});
