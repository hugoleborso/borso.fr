import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { testDatabase, truncateAllTables } from '../../../test/database-utils';
import {
  type AssistantBand,
  callTool,
  passNotificationGroupWindow,
  prepareAssistantBand,
  useOAuthOrigins,
} from '../../../test/mcp-utils';
import { deviceEndpoint, readSentNotifications } from '../../../test/push-utils';
import {
  sessionSetlistTable,
  setlistEntryTable,
  setlistTable,
  setlistVoteTable,
} from './setlists.schema';

const PRACTICE_DATE = '2026-11-03T19:00:00.000Z';
const PRACTICE_DAY = '2026-11-03';
const SINGLE_SONG_TARGET = 1;
const FULL_SINGLE_SONG_BUDGET = 3;

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
});
const setlistViewSchema = z.object({
  setlist: z.object({ id: z.string().uuid(), name: z.string(), status: z.string() }),
  entries: z.array(entryViewSchema),
});

async function createSong(band: AssistantBand, title: string): Promise<string> {
  const reply = await callTool(band.assistant, 'create_song', { title, status: 'idea' });
  return idBodySchema.parse(reply.body).id;
}

async function createPractice(band: AssistantBand): Promise<string> {
  const reply = await callTool(band.assistant, 'create_session', {
    session: { kind: 'practice', date: PRACTICE_DATE },
  });
  return idBodySchema.parse(reply.body).id;
}

async function createSetlist(
  band: AssistantBand,
  options: { session?: string; songs?: string[] } = {},
): Promise<string> {
  const reply = await callTool(band.assistant, 'create_setlist', { name: 'Saturday', ...options });
  return idBodySchema.parse(reply.body).id;
}

async function readSetlist(band: AssistantBand, setlist: string) {
  const reply = await callTool(band.assistant, 'get_setlist', { setlist });
  return setlistViewSchema.parse(reply.body);
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
    await callTool(band.assistant, 'create_instrument', { name: 'Guitare', family: 'harmonic' });

    const created = await callTool(band.assistant, 'create_setlist', {
      name: 'Saturday',
      session: PRACTICE_DAY,
      songs: ['creep', armyId],
    });
    const setlistId = idBodySchema.parse(created.body).id;
    const added = await callTool(band.assistant, 'add_setlist_entries', {
      setlist: 'saturday',
      songs: ['Karma Police'],
    });
    const renamed = await callTool(band.assistant, 'update_setlist', {
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
    expect(renamed.body).toEqual({ id: setlistId, name: 'Saturday night' });
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
    const deleted = await callTool(band.assistant, 'delete_setlist', { setlist: setlistId });
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

  it('runs an audience vote as the member, from opening to closing', async () => {
    const band = await prepareAssistantBand();
    const creepId = await createSong(band, 'Creep');
    await createSong(band, 'Seven Nation Army');
    const setlistId = await createSetlist(band);

    const opened = await callTool(band.assistant, 'set_vote_status', {
      setlist: setlistId,
      status: 'voting',
      targetSongCount: SINGLE_SONG_TARGET,
    });
    const cast = await callTool(band.assistant, 'cast_vote', {
      setlist: setlistId,
      song: 'Creep',
      points: FULL_SINGLE_SONG_BUDGET,
    });
    const overBudget = await callTool(band.assistant, 'cast_vote', {
      setlist: setlistId,
      song: 'army',
      points: 1,
    });
    const board = await callTool(band.assistant, 'get_vote_board', { setlist: setlistId });
    const votes = await testDatabase()
      .select()
      .from(setlistVoteTable)
      .where(eq(setlistVoteTable.setlistId, setlistId));
    const closed = await callTool(band.assistant, 'close_vote', {
      setlist: setlistId,
      songs: ['Creep'],
    });
    const lockedEntries = (await readSetlist(band, setlistId)).entries;
    const lateVote = await callTool(band.assistant, 'cast_vote', {
      setlist: setlistId,
      song: creepId,
      points: 1,
    });

    expect(opened).toEqual({ isError: false, body: { setlistId, status: 'voting' } });
    expect(cast).toEqual({
      isError: false,
      body: { points: FULL_SINGLE_SONG_BUDGET, remaining: 0 },
    });
    expect(overBudget).toEqual({
      isError: true,
      body: { error: 'budget-exhausted', budget: { total: 3, spent: 3, remaining: 0 } },
    });
    expect(board.body).toMatchObject({
      status: 'voting',
      tallies: [{ song: 'Creep', songId: creepId, points: 3, voters: 1 }],
      proposal: ['Creep'],
    });
    expect(votes.map((vote) => vote.memberId)).toEqual([band.hugo.memberId]);
    expect(closed).toEqual({ isError: false, body: { setlistId, closed: true } });
    expect(lockedEntries.map((entry) => entry.songId)).toEqual([creepId]);
    expect(lateVote).toEqual({ isError: true, body: { error: 'not-voting' } });
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
      unknownSession: await callTool(band.assistant, 'create_setlist', {
        name: 'x',
        session: unknownId,
      }),
      missingRename: await callTool(band.assistant, 'update_setlist', {
        setlist: unknownId,
        name: 'x',
      }),
      missingDelete: await callTool(band.assistant, 'delete_setlist', { setlist: unknownId }),
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
      missingBoard: await callTool(band.assistant, 'get_vote_board', { setlist: unknownId }),
      missingStatus: await callTool(band.assistant, 'set_vote_status', {
        setlist: unknownId,
        status: 'voting',
      }),
      missingVote: await callTool(band.assistant, 'cast_vote', {
        setlist: unknownId,
        song: songId,
        points: 1,
      }),
      closedVote: await callTool(band.assistant, 'cast_vote', {
        setlist: setlistId,
        song: songId,
        points: 1,
      }),
      missingClose: await callTool(band.assistant, 'close_vote', {
        setlist: unknownId,
        songs: [songId],
      }),
      closedClose: await callTool(band.assistant, 'close_vote', {
        setlist: setlistId,
        songs: [songId],
      }),
    };
    await callTool(band.assistant, 'set_vote_status', { setlist: setlistId, status: 'voting' });
    const emptyBoard = await callTool(band.assistant, 'get_vote_board', { setlist: setlistId });
    const emptyClose = await callTool(band.assistant, 'close_vote', {
      setlist: setlistId,
      songs: [songId],
    });

    const notFound = { isError: true, body: { error: 'not-found' } };
    const notVoting = { isError: true, body: { error: 'not-voting' } };
    expect(replies).toEqual({
      missing: notFound,
      missingName: { isError: true, body: { error: 'setlist-not-found', reference: 'Sunday' } },
      missingSession: notFound,
      unknownSession: { isError: true, body: { error: 'session-not-found' } },
      missingRename: notFound,
      missingDelete: notFound,
      missingLink: notFound,
      missingUnlink: notFound,
      missingAppend: notFound,
      missingSong: { isError: true, body: { error: 'song-not-found', reference: 'Karma Police' } },
      emptyEntryUpdate: { isError: true, body: { error: 'empty-update' } },
      missingEntry: { isError: true, body: { error: 'entry-not-found', reference: unknownId } },
      emptyReorder: { isError: true, body: { error: 'empty-update' } },
      missingReorder: { isError: true, body: { error: 'entry-not-found', reference: unknownId } },
      missingBoard: notFound,
      missingStatus: notFound,
      missingVote: notFound,
      closedVote: notVoting,
      missingClose: notFound,
      closedClose: notVoting,
    });
    expect(emptyBoard.body).not.toHaveProperty('proposal');
    expect(emptyClose).toEqual({ isError: true, body: { error: 'no-votes' } });
  });

  it('pushes each setlist change to the other members only', async () => {
    const band = await prepareAssistantBand();
    const songId = await createSong(band, 'Creep');
    await callTool(band.assistant, 'create_instrument', { name: 'Guitare', family: 'harmonic' });
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
