import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { testDatabase, truncateAllTables } from '../../../test/database-utils';
import { callTool, prepareAssistantBand, useOAuthOrigins } from '../../../test/mcp-utils';
import { deviceEndpoint, readSentNotifications } from '../../../test/push-utils';
import { songTable } from './songs.schema';

const createdSchema = z.object({ id: z.string().uuid(), title: z.string() });
const songBodySchema = z.object({
  song: z.object({ id: z.string().uuid(), title: z.string(), status: z.string() }).passthrough(),
});
const songsBodySchema = z.object({
  songs: z.array(z.object({ title: z.string() })),
  total: z.number(),
  nextCursor: z.string().optional(),
});

async function readSongRow(id: string) {
  const rows = await testDatabase().select().from(songTable).where(eq(songTable.id, id));
  return rows[0];
}

/**
 * @FollowsBlueprint test-back-e2e
 */
describe('songs tools (back-e2e)', () => {
  useOAuthOrigins();

  beforeEach(async () => {
    await truncateAllTables(testDatabase());
    vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('creates, reads, finds, updates and deletes a song by title, answering short confirmations', async () => {
    const band = await prepareAssistantBand();
    const { assistant } = band;

    const created = createdSchema.parse(
      (await callTool(assistant, 'create_song', { title: 'Seven Nation Army', status: 'idea' }))
        .body,
    );
    const read = songBodySchema.parse(
      (await callTool(assistant, 'get_song', { song: 'seven nation' })).body,
    );
    const found = await callTool(assistant, 'find_songs', { query: 'army' });
    const updated = await callTool(assistant, 'update_song', {
      song: 'Seven Nation Army',
      status: 'wip',
    });
    const stored = await readSongRow(created.id);
    const deleted = await callTool(assistant, 'delete_song', { song: created.id });

    expect(read.song).toEqual({
      id: created.id,
      title: 'Seven Nation Army',
      status: 'idea',
      origin: 'cover',
      lineup: {},
    });
    expect(found.body).toEqual({
      songs: [{ id: created.id, title: 'Seven Nation Army', status: 'idea' }],
      total: 1,
    });
    expect(updated).toEqual({ isError: false, body: { id: created.id, updated: ['status'] } });
    expect(stored?.status).toBe('wip');
    expect(stored?.artist).toBe('');
    expect(deleted).toEqual({ isError: false, body: { id: created.id, deleted: true } });
    expect(await readSongRow(created.id)).toBeUndefined();
  });

  it('pages a long catalogue and names every song an ambiguous title could mean', async () => {
    const band = await prepareAssistantBand();
    const { assistant } = band;
    const first = createdSchema.parse(
      (await callTool(assistant, 'create_song', { title: 'Creep', status: 'idea' })).body,
    );
    const second = createdSchema.parse(
      (await callTool(assistant, 'create_song', { title: 'Creep', status: 'wip', artist: 'TLC' }))
        .body,
    );

    const firstPage = songsBodySchema.parse(
      (await callTool(assistant, 'find_songs', { limit: 1 })).body,
    );
    const ambiguous = await callTool(assistant, 'get_song', { song: 'creep' });

    expect(firstPage.songs).toHaveLength(1);
    expect(firstPage).toMatchObject({ total: 2, nextCursor: '1' });
    expect(ambiguous).toEqual({
      isError: true,
      body: {
        error: 'song-ambiguous',
        reference: 'creep',
        candidates: expect.arrayContaining([
          { id: first.id, label: 'Creep' },
          { id: second.id, label: 'Creep', hint: 'TLC' },
        ]),
      },
    });
  });

  it('answers the refusal codes the routes answer', async () => {
    const band = await prepareAssistantBand();
    const { assistant } = band;
    const unknownId = randomUUID();
    const deezerTrackId = 'deezer-3135556';
    const holder = createdSchema.parse(
      (await callTool(assistant, 'create_song', { title: 'Creep', status: 'idea', deezerTrackId }))
        .body,
    );

    const missing = await callTool(assistant, 'get_song', { song: unknownId });
    const missingUpdate = await callTool(assistant, 'update_song', { song: unknownId, notes: 'x' });
    const emptyUpdate = await callTool(assistant, 'update_song', { song: holder.id });
    const missingDelete = await callTool(assistant, 'delete_song', { song: unknownId });
    const missingTitle = await callTool(assistant, 'delete_song', { song: 'Karma Police' });
    const duplicate = await callTool(assistant, 'create_song', {
      title: 'Creep (live)',
      status: 'idea',
      deezerTrackId,
    });

    expect(missing).toEqual({ isError: true, body: { error: 'not-found' } });
    expect(missingUpdate).toEqual({ isError: true, body: { error: 'not-found' } });
    expect(emptyUpdate).toEqual({ isError: true, body: { error: 'empty-update' } });
    expect(missingDelete).toEqual({ isError: true, body: { error: 'not-found' } });
    expect(missingTitle).toEqual({
      isError: true,
      body: { error: 'song-not-found', reference: 'Karma Police' },
    });
    expect(duplicate).toEqual({
      isError: true,
      body: { error: 'deezer-track-taken', songId: holder.id, songTitle: 'Creep' },
    });
  });

  it('refuses to move a song onto a Deezer track another song holds', async () => {
    const band = await prepareAssistantBand();
    const { assistant } = band;
    const holder = createdSchema.parse(
      (
        await callTool(assistant, 'create_song', {
          title: 'Creep',
          status: 'idea',
          deezerTrackId: 'deezer-1',
        })
      ).body,
    );
    await callTool(assistant, 'create_song', { title: 'Karma Police', status: 'idea' });

    const moved = await callTool(assistant, 'update_song', {
      song: 'Karma Police',
      deezerTrackId: 'deezer-1',
    });

    expect(moved).toEqual({
      isError: true,
      body: { error: 'deezer-track-taken', songId: holder.id, songTitle: 'Creep' },
    });
  });

  it('sets the default lineup by name as the member, notifying the other members only', async () => {
    const band = await prepareAssistantBand();
    const { assistant } = band;
    await callTool(assistant, 'create_instrument', { name: 'Guitare', family: 'harmonic' });
    const created = createdSchema.parse(
      (await callTool(assistant, 'create_song', { title: 'Creep', status: 'idea' })).body,
    );

    const lineup = await callTool(assistant, 'update_song', {
      song: 'Creep',
      defaultLineup: { Léa: 'guitare' },
    });
    const read = songBodySchema.parse(
      (await callTool(assistant, 'get_song', { song: 'Creep' })).body,
    );
    const stored = await readSongRow(created.id);
    const sent = readSentNotifications(band.send);
    const unknownMember = await callTool(assistant, 'update_song', {
      song: 'Creep',
      defaultLineup: { Marc: 'Guitare' },
    });

    expect(lineup).toEqual({
      isError: false,
      body: { id: created.id, updated: ['defaultLineup'] },
    });
    expect(read.song).toMatchObject({ lineup: { Léa: 'Guitare' } });
    expect(stored?.defaultLineup).toContain(band.lea.memberId);
    expect(sent.map((notification) => notification.endpoint)).toEqual([
      deviceEndpoint('lea-phone'),
    ]);
    expect(unknownMember).toEqual({
      isError: true,
      body: { error: 'member-not-found', reference: 'Marc' },
    });
  });

  it('answers a Deezer outage as the route does', async () => {
    const band = await prepareAssistantBand();
    const { assistant } = band;
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('', { status: 503 }));

    const search = await callTool(assistant, 'search_deezer', { q: 'nation army mcp outage' });

    expect(search).toEqual({ isError: true, body: { error: 'external-search-unavailable' } });
  });
});
