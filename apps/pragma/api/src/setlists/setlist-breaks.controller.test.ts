import { eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { buildAuthenticatedApp, jsonRequest, readJson } from '../../../test/auth-utils';
import { testDatabase, truncateAllTables } from '../../../test/database-utils';
import { setlistBreakTable } from './setlists.schema';

type App = Awaited<ReturnType<typeof buildAuthenticatedApp>>['app'];

const breakSchema = z.object({
  id: z.guid(),
  setlistId: z.guid(),
  position: z.number().int(),
  label: z.string(),
});
const breakViewSchema = breakSchema.extend({ songsBefore: z.number().int() });
const singleBreakEnvelope = z.object({
  setlistBreak: breakSchema,
  breaks: z.array(breakViewSchema),
});
const breakListEnvelope = z.object({ breaks: z.array(breakViewSchema) });
const entryListEnvelope = z.object({
  entries: z.array(z.object({ id: z.guid(), position: z.number().int() })),
});
const idEnvelope = (key: 'setlist' | 'song' | 'entry') =>
  z.object({ [key]: z.object({ id: z.guid() }) });

const UNKNOWN_ID = '00000000-0000-4000-8000-000000000000';

interface Seeded {
  readonly setlistId: string;
  readonly entryIds: readonly string[];
}

async function readId(response: Response, key: 'setlist' | 'song' | 'entry'): Promise<string> {
  const envelope = await readJson(response, idEnvelope(key));
  const created = envelope[key];
  if (created === undefined) throw new Error(`no ${key} in response`);
  return created.id;
}

async function seedSetlistOfThree(app: App, cookieHeader: string): Promise<Seeded> {
  const setlistId = await readId(
    await jsonRequest(app, '/api/setlists', {
      method: 'POST',
      body: { name: 'Set' },
      cookieHeader,
    }),
    'setlist',
  );
  const entryIds: string[] = [];
  for (const title of ['Alpha', 'Bravo', 'Charlie']) {
    const songId = await readId(
      await jsonRequest(app, '/api/songs', {
        method: 'POST',
        body: { title, status: 'idea' },
        cookieHeader,
      }),
      'song',
    );
    const entryResponse = await jsonRequest(app, `/api/setlists/${setlistId}/entries`, {
      method: 'POST',
      body: { songId },
      cookieHeader,
    });
    entryIds.push(await readId(entryResponse, 'entry'));
  }
  return { setlistId, entryIds };
}

async function insertBreakAfter(
  app: App,
  cookieHeader: string,
  setlistId: string,
  afterEntryId: string,
  label = '',
): Promise<Response> {
  return await jsonRequest(app, `/api/setlists/${setlistId}/breaks`, {
    method: 'POST',
    body: { afterEntryId, label },
    cookieHeader,
  });
}

async function readOrder(app: App, cookieHeader: string, setlistId: string) {
  const [entries, breaks] = await Promise.all([
    readJson(
      await jsonRequest(app, `/api/setlists/${setlistId}/entries`, { cookieHeader }),
      entryListEnvelope,
    ),
    readJson(
      await jsonRequest(app, `/api/setlists/${setlistId}/breaks`, { cookieHeader }),
      breakListEnvelope,
    ),
  ]);
  return [...entries.entries, ...breaks.breaks]
    .toSorted((left, right) => left.position - right.position)
    .map((item) => item.id);
}

// @FollowsBlueprint test-back-e2e
describe('setlist breaks controller (back-e2e)', () => {
  beforeEach(async () => {
    await truncateAllTables(testDatabase());
  });

  it('places a break after the song it names, and counts the songs played before it', async () => {
    const { app, cookieHeader } = await buildAuthenticatedApp();
    const { setlistId, entryIds } = await seedSetlistOfThree(app, cookieHeader);

    const inserted = await insertBreakAfter(
      app,
      cookieHeader,
      setlistId,
      entryIds[0] ?? '',
      ' Intermission ',
    );
    expect(inserted.status).toBe(201);

    const { setlistBreak, breaks } = await readJson(inserted, singleBreakEnvelope);
    expect(setlistBreak).toMatchObject({ label: 'Intermission', position: 1 });
    expect(breaks).toEqual([{ ...setlistBreak, songsBefore: 1 }]);
    expect(await readOrder(app, cookieHeader, setlistId)).toEqual([
      entryIds[0],
      setlistBreak.id,
      entryIds[1],
      entryIds[2],
    ]);
    const listed = await readJson(
      await jsonRequest(app, `/api/setlists/${setlistId}/breaks`, { cookieHeader }),
      breakListEnvelope,
    );
    expect(listed.breaks.map((row) => row.songsBefore)).toEqual([1]);
  });

  it('appends a new song after the last item, past a trailing break', async () => {
    const { app, cookieHeader } = await buildAuthenticatedApp();
    const { setlistId, entryIds } = await seedSetlistOfThree(app, cookieHeader);
    const { setlistBreak } = await readJson(
      await insertBreakAfter(app, cookieHeader, setlistId, entryIds[2] ?? ''),
      singleBreakEnvelope,
    );
    const songId = await readId(
      await jsonRequest(app, '/api/songs', {
        method: 'POST',
        body: { title: 'Delta', status: 'idea' },
        cookieHeader,
      }),
      'song',
    );
    const appendedId = await readId(
      await jsonRequest(app, `/api/setlists/${setlistId}/entries`, {
        method: 'POST',
        body: { songId },
        cookieHeader,
      }),
      'entry',
    );

    expect(await readOrder(app, cookieHeader, setlistId)).toEqual([
      ...entryIds,
      setlistBreak.id,
      appendedId,
    ]);
  });

  it('keeps every break in its slot when a reorder names the songs only', async () => {
    const { app, cookieHeader } = await buildAuthenticatedApp();
    const { setlistId, entryIds } = await seedSetlistOfThree(app, cookieHeader);
    const [first, second, third] = entryIds;
    const { setlistBreak } = await readJson(
      await insertBreakAfter(app, cookieHeader, setlistId, first ?? ''),
      singleBreakEnvelope,
    );

    const reorder = await jsonRequest(app, `/api/setlists/${setlistId}/reorder`, {
      method: 'PUT',
      body: { entryIds: [third, first, second] },
      cookieHeader,
    });

    expect(reorder.status).toBe(200);
    expect(await readOrder(app, cookieHeader, setlistId)).toEqual([
      third,
      setlistBreak.id,
      first,
      second,
    ]);
  });

  it('moves a break when a reorder names it beside the songs', async () => {
    const { app, cookieHeader } = await buildAuthenticatedApp();
    const { setlistId, entryIds } = await seedSetlistOfThree(app, cookieHeader);
    const [first, second, third] = entryIds;
    const { setlistBreak } = await readJson(
      await insertBreakAfter(app, cookieHeader, setlistId, first ?? ''),
      singleBreakEnvelope,
    );
    const moved = [first, second, setlistBreak.id, third];

    const reorder = await jsonRequest(app, `/api/setlists/${setlistId}/reorder`, {
      method: 'PUT',
      body: { entryIds: moved },
      cookieHeader,
    });

    expect(reorder.status).toBe(200);
    expect(await readOrder(app, cookieHeader, setlistId)).toEqual(moved);
  });

  it('compacts songs and breaks into one gapless run after either is deleted', async () => {
    const { app, cookieHeader } = await buildAuthenticatedApp();
    const { setlistId, entryIds } = await seedSetlistOfThree(app, cookieHeader);
    const [first, second, third] = entryIds;
    const { setlistBreak: firstBreak } = await readJson(
      await insertBreakAfter(app, cookieHeader, setlistId, first ?? ''),
      singleBreakEnvelope,
    );
    const { setlistBreak: secondBreak } = await readJson(
      await insertBreakAfter(app, cookieHeader, setlistId, second ?? ''),
      singleBreakEnvelope,
    );

    await jsonRequest(app, `/api/setlists/${setlistId}/entries/${second}`, {
      method: 'DELETE',
      cookieHeader,
    });
    const removed = await jsonRequest(app, `/api/setlists/${setlistId}/breaks/${firstBreak.id}`, {
      method: 'DELETE',
      cookieHeader,
    });

    expect(removed.status).toBe(200);
    const removedBody = await readJson(removed, z.object({ breaks: z.array(breakViewSchema) }));
    expect(removedBody.breaks.map((row) => [row.id, row.songsBefore])).toEqual([
      [secondBreak.id, 1],
    ]);
    const rows = await testDatabase()
      .select({ position: setlistBreakTable.position })
      .from(setlistBreakTable)
      .where(eq(setlistBreakTable.setlistId, setlistId));
    expect(rows).toEqual([{ position: 1 }]);
    expect(await readOrder(app, cookieHeader, setlistId)).toEqual([first, secondBreak.id, third]);
  });

  it('renames a break, and refuses a label past the limit', async () => {
    const { app, cookieHeader } = await buildAuthenticatedApp();
    const { setlistId, entryIds } = await seedSetlistOfThree(app, cookieHeader);
    const { setlistBreak } = await readJson(
      await insertBreakAfter(app, cookieHeader, setlistId, entryIds[1] ?? ''),
      singleBreakEnvelope,
    );
    const path = `/api/setlists/${setlistId}/breaks/${setlistBreak.id}`;

    const renamed = await jsonRequest(app, path, {
      method: 'PUT',
      body: { label: 'Tune the bass' },
      cookieHeader,
    });
    const tooLong = await jsonRequest(app, path, {
      method: 'PUT',
      body: { label: 'x'.repeat(81) },
      cookieHeader,
    });

    const renamedBody = await readJson(renamed, singleBreakEnvelope);
    expect(renamedBody.setlistBreak.label).toBe('Tune the bass');
    expect(renamedBody.breaks.map((row) => row.label)).toEqual(['Tune the bass']);
    expect(tooLong.status).toBe(400);
  });

  it('answers 404 for an unknown setlist, an anchor outside the setlist and an unknown break', async () => {
    const { app, cookieHeader } = await buildAuthenticatedApp();
    const { setlistId, entryIds } = await seedSetlistOfThree(app, cookieHeader);
    const breakPath = `/api/setlists/${setlistId}/breaks/${UNKNOWN_ID}`;

    const statuses = {
      unknownSetlist: (await insertBreakAfter(app, cookieHeader, UNKNOWN_ID, entryIds[0] ?? ''))
        .status,
      unknownAnchor: await readJson(
        await insertBreakAfter(app, cookieHeader, setlistId, UNKNOWN_ID),
        z.object({ error: z.string() }),
      ),
      rename: (
        await jsonRequest(app, breakPath, { method: 'PUT', body: { label: 'x' }, cookieHeader })
      ).status,
      remove: (await jsonRequest(app, breakPath, { method: 'DELETE', cookieHeader })).status,
      removeFromUnknownSetlist: (
        await jsonRequest(app, `/api/setlists/${UNKNOWN_ID}/breaks/${UNKNOWN_ID}`, {
          method: 'DELETE',
          cookieHeader,
        })
      ).status,
    };

    expect(statuses).toEqual({
      unknownSetlist: 404,
      unknownAnchor: { error: 'entry-not-found' },
      rename: 404,
      remove: 404,
      removeFromUnknownSetlist: 404,
    });
  });

  it('deletes the breaks of a deleted setlist', async () => {
    const { app, cookieHeader } = await buildAuthenticatedApp();
    const { setlistId, entryIds } = await seedSetlistOfThree(app, cookieHeader);
    await insertBreakAfter(app, cookieHeader, setlistId, entryIds[0] ?? '');

    await jsonRequest(app, `/api/setlists/${setlistId}`, { method: 'DELETE', cookieHeader });

    const rows = await testDatabase().select().from(setlistBreakTable);
    expect(rows).toEqual([]);
  });

  it('keeps every position distinct when a break lands while a song is appended', async () => {
    const { app, cookieHeader } = await buildAuthenticatedApp();
    const { setlistId, entryIds } = await seedSetlistOfThree(app, cookieHeader);
    const songId = await readId(
      await jsonRequest(app, '/api/songs', {
        method: 'POST',
        body: { title: 'Delta', status: 'idea' },
        cookieHeader,
      }),
      'song',
    );

    const answers = await Promise.all([
      insertBreakAfter(app, cookieHeader, setlistId, entryIds[0] ?? ''),
      insertBreakAfter(app, cookieHeader, setlistId, entryIds[1] ?? ''),
      jsonRequest(app, `/api/setlists/${setlistId}/entries`, {
        method: 'POST',
        body: { songId },
        cookieHeader,
      }),
      jsonRequest(app, `/api/setlists/${setlistId}/reorder`, {
        method: 'PUT',
        body: { entryIds: [...entryIds].reverse() },
        cookieHeader,
      }),
    ]);

    const [entries, breaks] = await Promise.all([
      readJson(
        await jsonRequest(app, `/api/setlists/${setlistId}/entries`, { cookieHeader }),
        entryListEnvelope,
      ),
      readJson(
        await jsonRequest(app, `/api/setlists/${setlistId}/breaks`, { cookieHeader }),
        breakListEnvelope,
      ),
    ]);
    expect(answers.slice(0, 3).map((answer) => answer.status)).toEqual([201, 201, 201]);
    expect([200, 409]).toContain(answers[3].status);
    const positions = [...entries.entries, ...breaks.breaks]
      .map((item) => item.position)
      .toSorted((left, right) => left - right);
    expect(positions).toEqual([0, 1, 2, 3, 4, 5]);
  });
});
