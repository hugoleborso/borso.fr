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
const SINGLE_SONG_TARGET = 1;
const FULL_SINGLE_SONG_BUDGET = 3;

const idBodySchema = z.object({ id: z.string().uuid() });
const songBodySchema = z.object({ song: idBodySchema });
const sessionBodySchema = z.object({ session: idBodySchema });
const setlistBodySchema = z.object({
  setlist: z.object({ id: z.string().uuid(), name: z.string() }),
});
const setlistsBodySchema = z.object({
  setlists: z.array(z.object({ id: z.string().uuid(), sessionIds: z.array(z.string()) })),
});
const entrySchema = z.object({
  id: z.string().uuid(),
  songId: z.string().uuid(),
  position: z.number().int(),
  notes: z.string(),
  lineupOverride: z.record(z.string(), z.array(z.string())).nullable(),
});
const entryBodySchema = z.object({ entry: entrySchema });
const entriesBodySchema = z.object({ entries: z.array(entrySchema) });
const voteBoardSchema = z.object({
  status: z.string(),
  budget: z.object({ remaining: z.number() }),
  tallies: z.array(z.object({ songId: z.string(), points: z.number() })),
});

async function createSong(band: AssistantBand, title: string): Promise<string> {
  const reply = await callTool(band.assistant, 'create_song', { title, status: 'idea' });
  return songBodySchema.parse(reply.body).song.id;
}

async function createPractice(band: AssistantBand): Promise<string> {
  const reply = await callTool(band.assistant, 'create_session', {
    session: { kind: 'practice', date: PRACTICE_DATE },
  });
  return sessionBodySchema.parse(reply.body).session.id;
}

async function createSetlist(band: AssistantBand, sessionId: string | null): Promise<string> {
  const reply = await callTool(band.assistant, 'create_setlist', { name: 'Saturday', sessionId });
  return setlistBodySchema.parse(reply.body).setlist.id;
}

async function addEntry(band: AssistantBand, setlistId: string, songId: string): Promise<string> {
  const reply = await callTool(band.assistant, 'add_setlist_entry', { id: setlistId, songId });
  return entryBodySchema.parse(reply.body).entry.id;
}

async function readEntries(band: AssistantBand, setlistId: string) {
  const reply = await callTool(band.assistant, 'list_setlist_entries', { id: setlistId });
  return entriesBodySchema.parse(reply.body).entries;
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

  it('builds a setlist for a session, edits and reorders its entries, then deletes it', async () => {
    const band = await prepareAssistantBand();
    const sessionId = await createPractice(band);
    const creepId = await createSong(band, 'Creep');
    const armyId = await createSong(band, 'Seven Nation Army');
    const setlistId = await createSetlist(band, sessionId);
    const instrumentId = randomUUID();

    const creepEntryId = await addEntry(band, setlistId, creepId);
    const armyEntryId = await addEntry(band, setlistId, armyId);
    const renamed = await callTool(band.assistant, 'update_setlist', {
      id: setlistId,
      name: 'Saturday night',
    });
    const noted = await callTool(band.assistant, 'update_setlist_entry', {
      id: setlistId,
      entryId: creepEntryId,
      notes: 'Start soft',
    });
    const lineup = await callTool(band.assistant, 'set_entry_lineup', {
      id: setlistId,
      entryId: armyEntryId,
      lineupOverride: { [instrumentId]: band.lea.memberId },
    });
    const moved = await callTool(band.assistant, 'move_setlist_entry', {
      id: setlistId,
      entryIds: [armyEntryId, creepEntryId],
    });
    const ofSession = setlistsBodySchema.parse(
      (await callTool(band.assistant, 'list_session_setlists', { sessionId })).body,
    );
    const read = setlistBodySchema.parse(
      (await callTool(band.assistant, 'get_setlist', { id: setlistId })).body,
    );
    const orderedEntries = await readEntries(band, setlistId);

    expect(renamed.isError).toBe(false);
    expect(noted.isError).toBe(false);
    expect(lineup.isError).toBe(false);
    expect(moved).toEqual({
      isError: false,
      body: { id: setlistId, entryIds: [armyEntryId, creepEntryId] },
    });
    expect(ofSession.setlists.map((setlist) => setlist.id)).toEqual([setlistId]);
    expect(read.setlist.name).toBe('Saturday night');
    expect(orderedEntries.map((entry) => entry.songId)).toEqual([armyId, creepId]);
    expect(orderedEntries[0]?.lineupOverride).toEqual({ [instrumentId]: [band.lea.memberId] });
    expect(orderedEntries[1]?.notes).toBe('Start soft');

    const removed = await callTool(band.assistant, 'remove_setlist_entry', {
      id: setlistId,
      entryId: armyEntryId,
    });
    const afterRemoval = await readSetlistRows(setlistId);

    expect(removed).toEqual({ isError: false, body: { id: armyEntryId, deleted: true } });
    expect(afterRemoval.entries.map((entry) => [entry.songId, entry.position])).toEqual([
      [creepId, 0],
    ]);

    const deleted = await callTool(band.assistant, 'delete_setlist', { id: setlistId });
    const afterDeletion = await readSetlistRows(setlistId);

    expect(deleted).toEqual({ isError: false, body: { id: setlistId, deleted: true } });
    expect(afterDeletion).toEqual({ setlists: [], entries: [], links: [] });
  });

  it('links a setlist to a session and unlinks it', async () => {
    const band = await prepareAssistantBand();
    const sessionId = await createPractice(band);
    const setlistId = await createSetlist(band, null);

    const linked = await callTool(band.assistant, 'link_setlist_to_session', {
      id: setlistId,
      sessionId,
    });
    const listed = setlistsBodySchema.parse((await callTool(band.assistant, 'list_setlists')).body);
    const unlinked = await callTool(band.assistant, 'unlink_setlist_from_session', {
      id: setlistId,
      sessionId,
    });
    const rows = await readSetlistRows(setlistId);

    expect(linked).toEqual({ isError: false, body: { setlistId, sessionId } });
    expect(listed.setlists).toEqual([
      expect.objectContaining({ id: setlistId, sessionIds: [sessionId] }),
    ]);
    expect(unlinked).toEqual({ isError: false, body: { setlistId, sessionId, unlinked: true } });
    expect(rows.links).toEqual([]);
  });

  it('runs an audience vote as the member, from opening to closing', async () => {
    const band = await prepareAssistantBand();
    const creepId = await createSong(band, 'Creep');
    const armyId = await createSong(band, 'Seven Nation Army');
    const setlistId = await createSetlist(band, null);

    const opened = await callTool(band.assistant, 'set_vote_status', {
      id: setlistId,
      status: 'voting',
      targetSongCount: SINGLE_SONG_TARGET,
    });
    const cast = await callTool(band.assistant, 'cast_vote', {
      id: setlistId,
      songId: creepId,
      points: FULL_SINGLE_SONG_BUDGET,
    });
    const overBudget = await callTool(band.assistant, 'cast_vote', {
      id: setlistId,
      songId: armyId,
      points: 1,
    });
    const board = voteBoardSchema.parse(
      (await callTool(band.assistant, 'get_vote_board', { id: setlistId })).body,
    );
    const proposal = await callTool(band.assistant, 'get_closing_proposal', { id: setlistId });
    const votes = await testDatabase()
      .select()
      .from(setlistVoteTable)
      .where(eq(setlistVoteTable.setlistId, setlistId));
    const closed = await callTool(band.assistant, 'close_vote', {
      id: setlistId,
      songIds: [creepId],
    });
    const lockedEntries = await readEntries(band, setlistId);
    const lateVote = await callTool(band.assistant, 'cast_vote', {
      id: setlistId,
      songId: creepId,
      points: 1,
    });

    expect(opened).toEqual({ isError: false, body: { ok: true } });
    expect(cast).toEqual({
      isError: false,
      body: {
        budget: { total: 3, spent: 3, remaining: 0 },
        songId: creepId,
        points: FULL_SINGLE_SONG_BUDGET,
      },
    });
    expect(overBudget).toEqual({
      isError: true,
      body: { error: 'budget-exhausted', budget: { total: 3, spent: 3, remaining: 0 } },
    });
    expect(board.status).toBe('voting');
    expect(board.tallies.map((tally) => [tally.songId, tally.points])).toEqual([[creepId, 3]]);
    expect(proposal.isError).toBe(false);
    expect(votes.map((vote) => vote.memberId)).toEqual([band.hugo.memberId]);
    expect(closed).toEqual({ isError: false, body: { ok: true } });
    expect(lockedEntries.map((entry) => entry.songId)).toEqual([creepId]);
    expect(lateVote).toEqual({ isError: true, body: { error: 'not-voting' } });
  });

  it('answers the refusal codes the routes answer', async () => {
    const band = await prepareAssistantBand();
    const unknownId = randomUUID();
    const songId = await createSong(band, 'Creep');
    const setlistId = await createSetlist(band, null);
    const entryId = await addEntry(band, setlistId, songId);

    const replies = {
      missing: await callTool(band.assistant, 'get_setlist', { id: unknownId }),
      unknownSession: await callTool(band.assistant, 'create_setlist', { sessionId: unknownId }),
      missingRename: await callTool(band.assistant, 'update_setlist', {
        id: unknownId,
        name: 'x',
      }),
      missingDelete: await callTool(band.assistant, 'delete_setlist', { id: unknownId }),
      missingLink: await callTool(band.assistant, 'link_setlist_to_session', {
        id: setlistId,
        sessionId: unknownId,
      }),
      missingUnlink: await callTool(band.assistant, 'unlink_setlist_from_session', {
        id: setlistId,
        sessionId: unknownId,
      }),
      missingAppend: await callTool(band.assistant, 'add_setlist_entry', {
        id: unknownId,
        songId,
      }),
      emptyEntryUpdate: await callTool(band.assistant, 'update_setlist_entry', {
        id: setlistId,
        entryId,
      }),
      missingEntryUpdate: await callTool(band.assistant, 'set_entry_lineup', {
        id: setlistId,
        entryId: unknownId,
        lineupOverride: null,
      }),
      missingRemoval: await callTool(band.assistant, 'remove_setlist_entry', {
        id: setlistId,
        entryId: unknownId,
      }),
      staleReorder: await callTool(band.assistant, 'move_setlist_entry', {
        id: setlistId,
        entryIds: [unknownId],
      }),
      missingReorder: await callTool(band.assistant, 'move_setlist_entry', {
        id: unknownId,
        entryIds: [entryId],
      }),
      missingBoard: await callTool(band.assistant, 'get_vote_board', { id: unknownId }),
      missingStatus: await callTool(band.assistant, 'set_vote_status', {
        id: unknownId,
        status: 'voting',
      }),
      missingVote: await callTool(band.assistant, 'cast_vote', {
        id: unknownId,
        songId,
        points: 1,
      }),
      closedVote: await callTool(band.assistant, 'cast_vote', { id: setlistId, songId, points: 1 }),
      missingProposal: await callTool(band.assistant, 'get_closing_proposal', { id: unknownId }),
      closedProposal: await callTool(band.assistant, 'get_closing_proposal', { id: setlistId }),
      missingClose: await callTool(band.assistant, 'close_vote', {
        id: unknownId,
        songIds: [songId],
      }),
      closedClose: await callTool(band.assistant, 'close_vote', {
        id: setlistId,
        songIds: [songId],
      }),
    };
    await callTool(band.assistant, 'set_vote_status', { id: setlistId, status: 'voting' });
    const emptyProposal = await callTool(band.assistant, 'get_closing_proposal', {
      id: setlistId,
    });
    const emptyClose = await callTool(band.assistant, 'close_vote', {
      id: setlistId,
      songIds: [songId],
    });

    const notFound = { isError: true, body: { error: 'not-found' } };
    const notVoting = { isError: true, body: { error: 'not-voting' } };
    expect(replies).toEqual({
      missing: notFound,
      unknownSession: { isError: true, body: { error: 'session-not-found' } },
      missingRename: notFound,
      missingDelete: notFound,
      missingLink: notFound,
      missingUnlink: notFound,
      missingAppend: notFound,
      emptyEntryUpdate: { isError: true, body: { error: 'empty-update' } },
      missingEntryUpdate: notFound,
      missingRemoval: notFound,
      staleReorder: { isError: true, body: { error: 'reorder-stale' } },
      missingReorder: notFound,
      missingBoard: notFound,
      missingStatus: notFound,
      missingVote: notFound,
      closedVote: notVoting,
      missingProposal: notFound,
      closedProposal: notVoting,
      missingClose: notFound,
      closedClose: notVoting,
    });
    expect(emptyProposal).toEqual({ isError: true, body: { error: 'no-votes' } });
    expect(emptyClose).toEqual({ isError: true, body: { error: 'no-votes' } });
  });

  it('pushes each setlist change to the other members only', async () => {
    const band = await prepareAssistantBand();
    const songId = await createSong(band, 'Creep');
    band.send.mockClear();
    const setlistId = await createSetlist(band, null);
    passNotificationGroupWindow(band.harness);
    const entryId = await addEntry(band, setlistId, songId);
    passNotificationGroupWindow(band.harness);
    await callTool(band.assistant, 'set_entry_lineup', {
      id: setlistId,
      entryId,
      lineupOverride: { [randomUUID()]: band.lea.memberId },
    });
    const sent = readSentNotifications(band.send);

    expect(sent.map((notification) => [notification.endpoint, notification.tag])).toEqual([
      [deviceEndpoint('lea-phone'), `setlist:${setlistId}`],
      [deviceEndpoint('lea-phone'), `setlist:${setlistId}`],
      [deviceEndpoint('lea-phone'), `setlist:${setlistId}`],
    ]);
  });
});
