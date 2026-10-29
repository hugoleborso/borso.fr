import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { jsonRequest } from '../../../test/auth-utils';
import { testDatabase, truncateAllTables } from '../../../test/database-utils';
import {
  type AssistantBand,
  callTool,
  passNotificationGroupWindow,
  prepareAssistantBand,
  seedInstrument,
  useOAuthOrigins,
} from '../../../test/mcp-utils';
import { deviceEndpoint, readSentNotifications } from '../../../test/push-utils';
import { sessionSetlistTable, setlistEntryTable, setlistTable } from './setlists.schema';

const PRACTICE_DATE = '2026-11-03T19:00:00.000Z';
const PRACTICE_DAY = '2026-11-03';

const idBodySchema = z.object({ id: z.string().uuid() });
const setlistsBodySchema = z.object({
  setlists: z.array(z.object({ id: z.string().uuid(), sessionIds: z.array(z.string()) })),
});
const entryViewSchema = z.object({
  entryId: z.string().uuid(),
  position: z.number().int(),
  songId: z.string().uuid(),
  title: z.string(),
  notes: z.string().optional(),
  lineup: z.record(z.string(), z.string()),
  transitionComment: z.string().optional(),
});
const setlistViewSchema = z.object({
  setlist: z.object({ id: z.string().uuid(), name: z.string(), status: z.string() }),
  entries: z.array(entryViewSchema),
});

async function createSong(band: AssistantBand, title: string): Promise<string> {
  const reply = await callTool(band.assistant, 'save_song', { title, status: 'idea' });
  return idBodySchema.parse(reply.body).id;
}

async function createPractice(band: AssistantBand): Promise<string> {
  const reply = await callTool(band.assistant, 'save_session', {
    kind: 'practice',
    date: PRACTICE_DATE,
  });
  return idBodySchema.parse(reply.body).id;
}

async function createSetlist(
  band: AssistantBand,
  options: { session?: string; songs?: string[] } = {},
): Promise<string> {
  const reply = await callTool(band.assistant, 'save_setlist', { name: 'Saturday', ...options });
  return idBodySchema.parse(reply.body).id;
}

async function readSetlist(band: AssistantBand, setlist: string) {
  const reply = await callTool(band.assistant, 'get_setlist', { setlist });
  return setlistViewSchema.parse(reply.body);
}

async function openVote(band: AssistantBand, setlistId: string): Promise<void> {
  await jsonRequest(band.hugo.app, `/api/setlists/${setlistId}/vote-status`, {
    method: 'PUT',
    body: { status: 'voting' },
    cookieHeader: band.hugo.cookieHeader,
  });
}

async function readSetlistRows(setlistId: string) {
  const database = testDatabase();
  const [setlists, entries, links] = await Promise.all([
    database.select().from(setlistTable).where(eq(setlistTable.id, setlistId)),
    database.select().from(setlistEntryTable).where(eq(setlistEntryTable.setlistId, setlistId)),
    database.select().from(sessionSetlistTable).where(eq(sessionSetlistTable.setlistId, setlistId)),
  ]);
  return { setlists, entries, links };
}

/**
 * @FollowsBlueprint test-back-e2e
 */
describe('setlists tools (back-e2e)', () => {
  useOAuthOrigins();

  beforeEach(async () => {
    await truncateAllTables(testDatabase());
    vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('builds a setlist for a session by name in one call, edits and reorders it, then deletes it', async () => {
    const band = await prepareAssistantBand();
    const sessionId = await createPractice(band);
    const creepId = await createSong(band, 'Creep');
    const armyId = await createSong(band, 'Seven Nation Army');
    const karmaId = await createSong(band, 'Karma Police');
    await seedInstrument(band.hugo, { name: 'Guitare', family: 'harmonic' });

    const created = await callTool(band.assistant, 'save_setlist', {
      name: 'Saturday',
      session: PRACTICE_DAY,
      songs: ['creep', armyId],
    });
    const setlistId = idBodySchema.parse(created.body).id;
    const added = await callTool(band.assistant, 'add_setlist_entries', {
      setlist: 'saturday',
      songs: ['Karma Police'],
    });
    const renamed = await callTool(band.assistant, 'save_setlist', {
      setlist: setlistId,
      name: 'Saturday night',
    });
    const noted = await callTool(band.assistant, 'update_setlist_entry', {
      setlist: 'Saturday night',
      entry: 'Creep',
      notes: 'Start soft',
    });
    const lineup = await callTool(band.assistant, 'update_setlist_entry', {
      setlist: setlistId,
      entry: armyId,
      lineupOverride: { Léa: 'Guitare' },
    });
    const swapped = await callTool(band.assistant, 'reorder_setlist', {
      setlist: setlistId,
      swap: ['Creep', 'Seven Nation Army'],
    });
    const moved = await callTool(band.assistant, 'reorder_setlist', {
      setlist: setlistId,
      move: { entry: 'karma', position: 1 },
    });
    const ofSession = setlistsBodySchema.parse(
      (await callTool(band.assistant, 'list_setlists', { session: sessionId })).body,
    );
    const read = await readSetlist(band, setlistId);
    const plan = await callTool(band.assistant, 'get_session', { session: PRACTICE_DAY });

    expect(created.body).toEqual({ id: setlistId, songs: 2 });
    expect(added.body).toEqual({ setlistId, entryIds: [expect.any(String)] });
    expect(renamed.body).toEqual({ id: setlistId, updated: ['name'] });
    expect(noted.body).toEqual({ id: expect.any(String), updated: ['notes'] });
    expect(lineup.body).toEqual({ id: expect.any(String), updated: ['lineupOverride'] });
    expect(swapped.body).toEqual({ order: ['Seven Nation Army', 'Creep', 'Karma Police'] });
    expect(moved.body).toEqual({ order: ['Karma Police', 'Seven Nation Army', 'Creep'] });
    expect(ofSession.setlists.map((setlist) => setlist.id)).toEqual([setlistId]);
    expect(read.setlist.name).toBe('Saturday night');
    expect(read.entries.map((entry) => [entry.position, entry.songId])).toEqual([
      [1, karmaId],
      [2, armyId],
      [3, creepId],
    ]);
    expect(read.entries[1]?.lineup).toEqual({ Léa: 'Guitare' });
    expect(read.entries[2]?.notes).toBe('Start soft');
    expect(plan.body).toMatchObject({
      session: { id: sessionId, kind: 'practice', date: PRACTICE_DATE },
      setlists: [{ id: setlistId, name: 'Saturday night', entries: read.entries }],
    });

    const resetLineup = await callTool(band.assistant, 'update_setlist_entry', {
      setlist: setlistId,
      entry: 'Seven Nation Army',
      lineupOverride: null,
    });
    const removed = await callTool(band.assistant, 'remove_setlist_entries', {
      setlist: setlistId,
      entries: ['Seven Nation Army', 'Karma Police'],
    });
    const afterRemoval = await readSetlistRows(setlistId);

    expect(resetLineup.isError).toBe(false);
    expect(removed).toEqual({ isError: false, body: { setlistId, removed: 2 } });
    expect(afterRemoval.entries.map((entry) => [entry.songId, entry.position])).toEqual([
      [creepId, 0],
    ]);

    const reordered = await callTool(band.assistant, 'reorder_setlist', {
      setlist: setlistId,
      order: [creepId],
    });
    const deleted = await callTool(band.assistant, 'delete', { kind: 'setlist', id: setlistId });
    const afterDeletion = await readSetlistRows(setlistId);

    expect(reordered.body).toEqual({ order: ['Creep'] });
    expect(deleted).toEqual({ isError: false, body: { id: setlistId, deleted: true } });
    expect(afterDeletion).toEqual({ setlists: [], entries: [], links: [] });
  });

  it('links a setlist to a session and unlinks it', async () => {
    const band = await prepareAssistantBand();
    const sessionId = await createPractice(band);
    const setlistId = await createSetlist(band);

    const linked = await callTool(band.assistant, 'link_setlist', {
      setlist: 'Saturday',
      session: PRACTICE_DAY,
    });
    const listed = setlistsBodySchema.parse((await callTool(band.assistant, 'list_setlists')).body);
    const unlinked = await callTool(band.assistant, 'link_setlist', {
      setlist: setlistId,
      session: sessionId,
      unlink: true,
    });
    const rows = await readSetlistRows(setlistId);

    expect(linked).toEqual({ isError: false, body: { setlistId, sessionId, linked: true } });
    expect(listed.setlists).toEqual([
      expect.objectContaining({ id: setlistId, sessionIds: [sessionId] }),
    ]);
    expect(unlinked).toEqual({ isError: false, body: { setlistId, sessionId, linked: false } });
    expect(rows.links).toEqual([]);
  });

  it('reads what the band wrote about each transition into the next song, which the tools never write', async () => {
    const band = await prepareAssistantBand();
    const creepId = await createSong(band, 'Creep');
    const armyId = await createSong(band, 'Seven Nation Army');
    await createSetlist(band, { songs: ['Creep', 'Seven Nation Army'] });
    await jsonRequest(band.lea.app, `/api/transition-comments/${creepId}/${armyId}`, {
      method: 'PUT',
      cookieHeader: band.lea.cookieHeader,
      body: { comment: 'Straight in, no count' },
    });
    await jsonRequest(band.lea.app, `/api/transition-comments/${armyId}/${creepId}`, {
      method: 'PUT',
      cookieHeader: band.lea.cookieHeader,
      body: { comment: 'The other way round' },
    });

    const read = await readSetlist(band, 'Saturday');

    expect(read.entries.map((entry) => [entry.title, entry.transitionComment])).toEqual([
      ['Creep', 'Straight in, no count'],
      ['Seven Nation Army', undefined],
    ]);
  });

  it('answers the refusal codes the routes answer, and names a reference nothing matches', async () => {
    const band = await prepareAssistantBand();
    const unknownId = randomUUID();
    const songId = await createSong(band, 'Creep');
    const setlistId = await createSetlist(band, { songs: [songId] });

    const replies = {
      missing: await callTool(band.assistant, 'get_setlist', { setlist: unknownId }),
      missingName: await callTool(band.assistant, 'get_setlist', { setlist: 'Sunday' }),
      missingSession: await callTool(band.assistant, 'get_session', { session: unknownId }),
      unknownSession: await callTool(band.assistant, 'save_setlist', {
        name: 'x',
        session: unknownId,
      }),
      missingRename: await callTool(band.assistant, 'save_setlist', {
        setlist: unknownId,
        name: 'x',
      }),
      emptyRename: await callTool(band.assistant, 'save_setlist', { setlist: setlistId }),
      creationOnly: await callTool(band.assistant, 'save_setlist', {
        setlist: setlistId,
        songs: [songId],
      }),
      missingDelete: await callTool(band.assistant, 'delete', { kind: 'setlist', id: unknownId }),
      missingLink: await callTool(band.assistant, 'link_setlist', {
        setlist: setlistId,
        session: unknownId,
      }),
      missingUnlink: await callTool(band.assistant, 'link_setlist', {
        setlist: setlistId,
        session: unknownId,
        unlink: true,
      }),
      missingAppend: await callTool(band.assistant, 'add_setlist_entries', {
        setlist: unknownId,
        songs: [songId],
      }),
      missingSong: await callTool(band.assistant, 'add_setlist_entries', {
        setlist: setlistId,
        songs: ['Karma Police'],
      }),
      emptyEntryUpdate: await callTool(band.assistant, 'update_setlist_entry', {
        setlist: setlistId,
        entry: 'Creep',
      }),
      missingEntry: await callTool(band.assistant, 'update_setlist_entry', {
        setlist: setlistId,
        entry: unknownId,
        notes: 'x',
      }),
      emptyReorder: await callTool(band.assistant, 'reorder_setlist', { setlist: setlistId }),
      missingReorder: await callTool(band.assistant, 'reorder_setlist', {
        setlist: unknownId,
        order: [unknownId],
      }),
    };

    const notFound = { isError: true, body: { error: 'not-found' } };
    expect(replies).toEqual({
      missing: notFound,
      missingName: { isError: true, body: { error: 'setlist-not-found', reference: 'Sunday' } },
      missingSession: notFound,
      unknownSession: { isError: true, body: { error: 'session-not-found' } },
      missingRename: notFound,
      emptyRename: { isError: true, body: { error: 'empty-update' } },
      creationOnly: {
        isError: true,
        body: {
          error: 'invalid-input',
          fields: { songs: 'only when creating; use link_setlist or add_setlist_entries' },
        },
      },
      missingDelete: notFound,
      missingLink: notFound,
      missingUnlink: notFound,
      missingAppend: notFound,
      missingSong: { isError: true, body: { error: 'song-not-found', reference: 'Karma Police' } },
      emptyEntryUpdate: { isError: true, body: { error: 'empty-update' } },
      missingEntry: { isError: true, body: { error: 'entry-not-found', reference: unknownId } },
      emptyReorder: { isError: true, body: { error: 'empty-update' } },
      missingReorder: { isError: true, body: { error: 'entry-not-found', reference: unknownId } },
    });
  });

  it('closes a vote keeping the songs the setlist has, and refuses to close it twice', async () => {
    const band = await prepareAssistantBand();
    await createSong(band, 'Creep');
    await createSong(band, 'Karma Police');
    const setlistId = await createSetlist(band, { songs: ['Creep', 'Karma Police'] });
    await openVote(band, setlistId);

    const closed = await callTool(band.assistant, 'close_setlist_vote', { setlist: 'Saturday' });
    const closedAgain = await callTool(band.assistant, 'close_setlist_vote', {
      setlist: setlistId,
    });

    expect(closed).toEqual({ isError: false, body: { setlistId, status: 'locked' } });
    expect(closedAgain).toEqual({ isError: true, body: { error: 'not-voting' } });
    const view = await readSetlist(band, setlistId);
    expect(view.setlist.status).toBe('locked');
    expect(view.entries.map((entry) => entry.title)).toEqual(['Creep', 'Karma Police']);
  });

  it('closes a vote on the songs given, in order, once the band has voted', async () => {
    const band = await prepareAssistantBand();
    const creepId = await createSong(band, 'Creep');
    await createSong(band, 'Karma Police');
    await createSong(band, 'Seven Nation Army');
    const setlistId = await createSetlist(band, { songs: ['Creep'] });
    await openVote(band, setlistId);
    const songs = ['Seven Nation Army', 'Karma Police'];

    const beforeAnyVote = await callTool(band.assistant, 'close_setlist_vote', {
      setlist: setlistId,
      songs,
    });
    await jsonRequest(band.hugo.app, `/api/setlists/${setlistId}/votes/${creepId}`, {
      method: 'PUT',
      body: { points: 1 },
      cookieHeader: band.hugo.cookieHeader,
    });
    const closed = await callTool(band.assistant, 'close_setlist_vote', {
      setlist: setlistId,
      songs,
    });

    expect(beforeAnyVote).toEqual({ isError: true, body: { error: 'no-votes' } });
    expect(closed).toEqual({ isError: false, body: { setlistId, status: 'locked' } });
    const view = await readSetlist(band, setlistId);
    expect(view.setlist.status).toBe('locked');
    expect(view.entries.map((entry) => entry.title)).toEqual(songs);
  });

  it('pushes each setlist change to the other members only', async () => {
    const band = await prepareAssistantBand();
    const songId = await createSong(band, 'Creep');
    await seedInstrument(band.hugo, { name: 'Guitare', family: 'harmonic' });
    band.send.mockClear();
    const setlistId = await createSetlist(band);
    passNotificationGroupWindow(band.harness);
    await callTool(band.assistant, 'add_setlist_entries', { setlist: setlistId, songs: [songId] });
    passNotificationGroupWindow(band.harness);
    await callTool(band.assistant, 'update_setlist_entry', {
      setlist: setlistId,
      entry: songId,
      lineupOverride: { Léa: 'Guitare' },
    });
    const sent = readSentNotifications(band.send);

    expect(sent.map((notification) => [notification.endpoint, notification.tag])).toEqual([
      [deviceEndpoint('lea-phone'), `setlist:${setlistId}`],
      [deviceEndpoint('lea-phone'), `setlist:${setlistId}`],
      [deviceEndpoint('lea-phone'), `setlist:${setlistId}`],
    ]);
  });
});
