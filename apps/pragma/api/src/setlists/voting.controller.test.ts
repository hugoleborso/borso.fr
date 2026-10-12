import type { Hono } from 'hono';
import { beforeEach, describe, expect, it } from 'vitest';
import { z } from 'zod';
import {
  buildAuthenticatedApp,
  createMemberDirectly,
  giveMemberCredentials,
  loginAsMember,
  extractSessionCookie,
  jsonRequest,
  readJson,
  SESSION_COOKIE_NAME,
} from '../../../test/auth-utils';
import { testDatabase, truncateAllTables } from '../../../test/database-utils';

const boardSchema = z.object({
  status: z.enum(['voting', 'locked']),
  lastScoredAt: z.string().nullable(),
  targetSongCount: z.number(),
  budget: z.object({ total: z.number(), spent: z.number(), remaining: z.number() }),
  tallies: z.array(
    z.object({
      songId: z.string(),
      points: z.number(),
      voterCount: z.number(),
      pointsByMember: z.record(z.string(), z.number()),
    }),
  ),
});

const setlistSchema = z.object({ setlist: z.object({ id: z.string() }) });
const songSchema = z.object({ song: z.object({ id: z.string() }) });
const proposalSchema = z.object({ tallies: z.array(z.object({ songId: z.string() })) });
const entriesSchema = z.object({ entries: z.array(z.object({ songId: z.string() })) });

async function createSong(app: Hono, cookieHeader: string, title: string): Promise<string> {
  const response = await jsonRequest(app, '/api/songs', {
    method: 'POST',
    body: { title, artist: '', status: 'wip' },
    cookieHeader,
  });
  const created = await readJson(response, songSchema);
  return created.song.id;
}

async function createVotingSetlist(
  app: Hono,
  cookieHeader: string,
  targetSongCount: number,
): Promise<string> {
  const response = await jsonRequest(app, '/api/setlists', {
    method: 'POST',
    body: { name: 'Prochain concert' },
    cookieHeader,
  });
  const created = await readJson(response, setlistSchema);
  await jsonRequest(app, `/api/setlists/${created.setlist.id}/vote-status`, {
    method: 'PUT',
    body: { status: 'voting', targetSongCount },
    cookieHeader,
  });
  return created.setlist.id;
}

async function score(
  app: Hono,
  cookieHeader: string,
  setlistId: string,
  songId: string,
  points: number,
): Promise<Response> {
  return jsonRequest(app, `/api/setlists/${setlistId}/votes/${songId}`, {
    method: 'PUT',
    body: { points },
    cookieHeader,
  });
}

// @FollowsBlueprint test-back-e2e
describe('setlist voting (back-e2e)', () => {
  beforeEach(async () => {
    await truncateAllTables(testDatabase());
  });

  it('reads a setlist that was never voted on as locked', async () => {
    const { app, cookieHeader } = await buildAuthenticatedApp();
    const response = await jsonRequest(app, '/api/setlists', {
      method: 'POST',
      body: { name: 'Ancienne' },
      cookieHeader,
    });
    const created = await readJson(response, setlistSchema);
    const board = await readJson(
      await jsonRequest(app, `/api/setlists/${created.setlist.id}/votes`, { cookieHeader }),
      boardSchema,
    );
    expect(board.status).toBe('locked');
  });

  it('opens a vote, scores songs and reports the budget that is left', async () => {
    const { app, cookieHeader } = await buildAuthenticatedApp();
    const setlistId = await createVotingSetlist(app, cookieHeader, 2);
    const songId = await createSong(app, cookieHeader, 'Première');

    expect((await score(app, cookieHeader, setlistId, songId, 3)).status).toBe(200);
    const board = await readJson(
      await jsonRequest(app, `/api/setlists/${setlistId}/votes`, { cookieHeader }),
      boardSchema,
    );
    expect(board.budget).toEqual({ total: 6, spent: 3, remaining: 3 });
    expect(board.tallies[0]?.points).toBe(3);
  });

  it('refuses a score beyond the budget and says what is left', async () => {
    const { app, cookieHeader } = await buildAuthenticatedApp();
    const setlistId = await createVotingSetlist(app, cookieHeader, 1);
    const first = await createSong(app, cookieHeader, 'Première');
    const second = await createSong(app, cookieHeader, 'Deuxième');

    await score(app, cookieHeader, setlistId, first, 3);
    const refused = await score(app, cookieHeader, setlistId, second, 1);
    expect(refused.status).toBe(409);
    const body = await readJson(refused, z.object({ error: z.string() }));
    expect(body.error).toBe('budget-exhausted');
  });

  it('takes a song back off when it is scored zero', async () => {
    const { app, cookieHeader } = await buildAuthenticatedApp();
    const setlistId = await createVotingSetlist(app, cookieHeader, 1);
    const songId = await createSong(app, cookieHeader, 'Première');

    await score(app, cookieHeader, setlistId, songId, 3);
    await score(app, cookieHeader, setlistId, songId, 0);
    const board = await readJson(
      await jsonRequest(app, `/api/setlists/${setlistId}/votes`, { cookieHeader }),
      boardSchema,
    );
    expect(board.tallies).toEqual([]);
    expect(board.budget.remaining).toBe(3);
  });

  it('shows every member who scored, and what they gave', async () => {
    const { app, cookieHeader } = await buildAuthenticatedApp('Ada');
    const setlistId = await createVotingSetlist(app, cookieHeader, 3);
    const songId = await createSong(app, cookieHeader, 'Partagée');
    await score(app, cookieHeader, setlistId, songId, 2);

    const graceId = await createMemberDirectly(app, 'Grace');
    await giveMemberCredentials({ memberId: graceId, username: 'grace' });
    const graceLogin = await loginAsMember(app, 'grace');
    const graceCookie = `${SESSION_COOKIE_NAME}=${extractSessionCookie(graceLogin)}`;
    await score(app, graceCookie, setlistId, songId, 3);

    const board = await readJson(
      await jsonRequest(app, `/api/setlists/${setlistId}/votes`, { cookieHeader }),
      boardSchema,
    );
    expect(board.tallies[0]?.points).toBe(5);
    expect(board.tallies[0]?.voterCount).toBe(2);
    expect(Object.keys(board.tallies[0]?.pointsByMember ?? {})).toHaveLength(2);
  });

  it('refuses a score on a setlist that is not in its voting phase', async () => {
    const { app, cookieHeader } = await buildAuthenticatedApp();
    const setlistId = await createVotingSetlist(app, cookieHeader, 2);
    const songId = await createSong(app, cookieHeader, 'Première');
    await jsonRequest(app, `/api/setlists/${setlistId}/vote-status`, {
      method: 'PUT',
      body: { status: 'locked' },
      cookieHeader,
    });
    expect((await score(app, cookieHeader, setlistId, songId, 1)).status).toBe(409);
  });

  it('refuses to close a vote nobody scored', async () => {
    const { app, cookieHeader } = await buildAuthenticatedApp();
    const setlistId = await createVotingSetlist(app, cookieHeader, 2);
    const songId = await createSong(app, cookieHeader, 'Première');
    const refused = await jsonRequest(app, `/api/setlists/${setlistId}/close`, {
      method: 'POST',
      body: { songIds: [songId] },
      cookieHeader,
    });
    expect(refused.status).toBe(409);
    const board = await readJson(
      await jsonRequest(app, `/api/setlists/${setlistId}/votes`, { cookieHeader }),
      boardSchema,
    );
    expect(board.status).toBe('voting');
  });

  it('refuses to propose a closing when no song scored', async () => {
    const { app, cookieHeader } = await buildAuthenticatedApp();
    const setlistId = await createVotingSetlist(app, cookieHeader, 2);
    const response = await jsonRequest(app, `/api/setlists/${setlistId}/closing-proposal`, {
      cookieHeader,
    });
    expect(response.status).toBe(409);
  });

  it('proposes the top songs plus everything tied at the boundary', async () => {
    const { app, cookieHeader } = await buildAuthenticatedApp();
    const setlistId = await createVotingSetlist(app, cookieHeader, 6);
    const first = await createSong(app, cookieHeader, 'Première');
    const second = await createSong(app, cookieHeader, 'Deuxième');
    const third = await createSong(app, cookieHeader, 'Troisième');
    await score(app, cookieHeader, setlistId, first, 3);
    await score(app, cookieHeader, setlistId, second, 2);
    await score(app, cookieHeader, setlistId, third, 2);

    await jsonRequest(app, `/api/setlists/${setlistId}/vote-status`, {
      method: 'PUT',
      body: { status: 'voting', targetSongCount: 2 },
      cookieHeader,
    });
    const proposal = await readJson(
      await jsonRequest(app, `/api/setlists/${setlistId}/closing-proposal`, { cookieHeader }),
      proposalSchema,
    );
    expect(proposal.tallies).toHaveLength(3);
  });

  it('closes a vote into an ordinary setlist, in the order it was handed', async () => {
    const { app, cookieHeader } = await buildAuthenticatedApp();
    const setlistId = await createVotingSetlist(app, cookieHeader, 2);
    const first = await createSong(app, cookieHeader, 'Première');
    const second = await createSong(app, cookieHeader, 'Deuxième');
    await score(app, cookieHeader, setlistId, first, 3);
    await score(app, cookieHeader, setlistId, second, 3);

    const closed = await jsonRequest(app, `/api/setlists/${setlistId}/close`, {
      method: 'POST',
      body: { songIds: [second, first] },
      cookieHeader,
    });
    expect(closed.status).toBe(200);

    const runningOrder = await readJson(
      await jsonRequest(app, `/api/setlists/${setlistId}/entries`, { cookieHeader }),
      entriesSchema,
    );
    expect(runningOrder.entries.map((entry) => entry.songId)).toEqual([second, first]);

    const board = await readJson(
      await jsonRequest(app, `/api/setlists/${setlistId}/votes`, { cookieHeader }),
      boardSchema,
    );
    expect(board.status).toBe('locked');
    expect(board.tallies).toHaveLength(2);
  });

  it('reopens a closed vote with every point still posted', async () => {
    const { app, cookieHeader } = await buildAuthenticatedApp();
    const setlistId = await createVotingSetlist(app, cookieHeader, 2);
    const songId = await createSong(app, cookieHeader, 'Première');
    await score(app, cookieHeader, setlistId, songId, 3);
    await jsonRequest(app, `/api/setlists/${setlistId}/close`, {
      method: 'POST',
      body: { songIds: [songId] },
      cookieHeader,
    });

    await jsonRequest(app, `/api/setlists/${setlistId}/vote-status`, {
      method: 'PUT',
      body: { status: 'voting' },
      cookieHeader,
    });
    const board = await readJson(
      await jsonRequest(app, `/api/setlists/${setlistId}/votes`, { cookieHeader }),
      boardSchema,
    );
    expect(board.status).toBe('voting');
    expect(board.tallies[0]?.points).toBe(3);
  });

  it('deletes the votes of a member with the member', async () => {
    const { app, cookieHeader, memberId } = await buildAuthenticatedApp();
    const setlistId = await createVotingSetlist(app, cookieHeader, 2);
    const songId = await createSong(app, cookieHeader, 'Première');
    await score(app, cookieHeader, setlistId, songId, 3);

    const otherId = await createMemberDirectly(app, 'Grace');
    await giveMemberCredentials({ memberId: otherId, username: 'grace' });
    const otherLogin = await loginAsMember(app, 'grace');
    const otherCookie = `${SESSION_COOKIE_NAME}=${extractSessionCookie(otherLogin)}`;
    await jsonRequest(app, `/api/members/${memberId}`, {
      method: 'DELETE',
      cookieHeader: otherCookie,
    });

    const board = await readJson(
      await jsonRequest(app, `/api/setlists/${setlistId}/votes`, { cookieHeader: otherCookie }),
      boardSchema,
    );
    expect(board.tallies).toEqual([]);
  });

  it('deletes the votes of a song with the song', async () => {
    const { app, cookieHeader } = await buildAuthenticatedApp();
    const setlistId = await createVotingSetlist(app, cookieHeader, 2);
    const songId = await createSong(app, cookieHeader, 'Première');
    await score(app, cookieHeader, setlistId, songId, 3);

    await jsonRequest(app, `/api/songs/${songId}`, { method: 'DELETE', cookieHeader });
    const board = await readJson(
      await jsonRequest(app, `/api/setlists/${setlistId}/votes`, { cookieHeader }),
      boardSchema,
    );
    expect(board.tallies).toEqual([]);
  });

  it('reports when this member last scored, so the deck can mark what arrived after', async () => {
    const { app, cookieHeader } = await buildAuthenticatedApp();
    const setlistId = await createVotingSetlist(app, cookieHeader, 2);
    const emptyBoard = await readJson(
      await jsonRequest(app, `/api/setlists/${setlistId}/votes`, { cookieHeader }),
      boardSchema,
    );
    expect(emptyBoard.lastScoredAt).toBeNull();

    const songId = await createSong(app, cookieHeader, 'Première');
    await score(app, cookieHeader, setlistId, songId, 2);
    const scoredBoard = await readJson(
      await jsonRequest(app, `/api/setlists/${setlistId}/votes`, { cookieHeader }),
      boardSchema,
    );
    expect(scoredBoard.lastScoredAt).not.toBeNull();
  });

  it('answers 404 on a setlist that does not exist', async () => {
    const { app, cookieHeader } = await buildAuthenticatedApp();
    const missing = '11111111-2222-3333-4444-555555555555';
    expect(
      (await jsonRequest(app, `/api/setlists/${missing}/votes`, { cookieHeader })).status,
    ).toBe(404);
  });
});
