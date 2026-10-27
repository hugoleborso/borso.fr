import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { type AuthenticatedApp, buildAuthenticatedApp } from '../../../test/auth-utils';
import { testDatabase, truncateAllTables } from '../../../test/database-utils';
import {
  type AssistantHarness,
  buildAssistantHarness,
  callTool,
  connectAssistant,
  openMcpClient,
  useOAuthOrigins,
} from '../../../test/mcp-utils';
import {
  deviceEndpoint,
  readSentNotifications,
  stubPushService,
  subscribeDevice,
} from '../../../test/push-utils';
import { songTable } from './songs.schema';

const songBodySchema = z.object({
  song: z.object({ id: z.string().uuid(), title: z.string(), status: z.string() }).passthrough(),
});
const songsBodySchema = z.object({ songs: z.array(z.object({ title: z.string() })) });

interface CatalogueBand {
  readonly harness: AssistantHarness;
  readonly hugo: AuthenticatedApp;
  readonly lea: AuthenticatedApp;
  readonly send: ReturnType<typeof stubPushService>;
}

async function prepareBand(): Promise<CatalogueBand> {
  const send = stubPushService();
  const harness = buildAssistantHarness();
  const hugo = await buildAuthenticatedApp('Hugo');
  const lea = await buildAuthenticatedApp('Léa');
  await subscribeDevice(hugo, 'hugo-phone');
  await subscribeDevice(lea, 'lea-phone');
  return { harness, hugo, lea, send };
}

async function openHugoAssistant(band: CatalogueBand) {
  const tokens = await connectAssistant(band.harness.app, band.hugo);
  return await openMcpClient(band.harness.app, tokens.accessToken);
}

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

  it('creates, reads, lists, updates and deletes a song as the routes do', async () => {
    const band = await prepareBand();
    const assistant = await openHugoAssistant(band);

    const created = songBodySchema.parse(
      (await callTool(assistant, 'create_song', { title: 'Seven Nation Army', status: 'idea' }))
        .body,
    );
    const read = songBodySchema.parse(
      (await callTool(assistant, 'get_song', { id: created.song.id })).body,
    );
    const listed = songsBodySchema.parse((await callTool(assistant, 'search_songs')).body);
    const updated = songBodySchema.parse(
      (await callTool(assistant, 'update_song', { id: created.song.id, status: 'wip' })).body,
    );
    const stored = await readSongRow(created.song.id);
    const deleted = await callTool(assistant, 'delete_song', { id: created.song.id });

    expect(read.song.title).toBe('Seven Nation Army');
    expect(listed.songs.map((song) => song.title)).toEqual(['Seven Nation Army']);
    expect(updated.song.status).toBe('wip');
    expect(stored?.status).toBe('wip');
    expect(stored?.artist).toBe('');
    expect(deleted).toEqual({ isError: false, body: { id: created.song.id, deleted: true } });
    expect(await readSongRow(created.song.id)).toBeUndefined();
  });

  it('answers the refusal codes the routes answer', async () => {
    const band = await prepareBand();
    const assistant = await openHugoAssistant(band);
    const unknownId = randomUUID();
    const deezerTrackId = 'deezer-3135556';
    const holder = songBodySchema.parse(
      (await callTool(assistant, 'create_song', { title: 'Creep', status: 'idea', deezerTrackId }))
        .body,
    );

    const missing = await callTool(assistant, 'get_song', { id: unknownId });
    const missingUpdate = await callTool(assistant, 'update_song', { id: unknownId, notes: 'x' });
    const emptyUpdate = await callTool(assistant, 'update_song', { id: holder.song.id });
    const missingDelete = await callTool(assistant, 'delete_song', { id: unknownId });
    const duplicate = await callTool(assistant, 'create_song', {
      title: 'Creep (live)',
      status: 'idea',
      deezerTrackId,
    });

    expect(missing).toEqual({ isError: true, body: { error: 'not-found' } });
    expect(missingUpdate).toEqual({ isError: true, body: { error: 'not-found' } });
    expect(emptyUpdate).toEqual({ isError: true, body: { error: 'empty-update' } });
    expect(missingDelete).toEqual({ isError: true, body: { error: 'not-found' } });
    expect(duplicate).toEqual({
      isError: true,
      body: { error: 'deezer-track-taken', songId: holder.song.id, songTitle: 'Creep' },
    });
  });

  it('refuses to move a song onto a Deezer track another song holds', async () => {
    const band = await prepareBand();
    const assistant = await openHugoAssistant(band);
    const holder = songBodySchema.parse(
      (
        await callTool(assistant, 'create_song', {
          title: 'Creep',
          status: 'idea',
          deezerTrackId: 'deezer-1',
        })
      ).body,
    );
    const other = songBodySchema.parse(
      (await callTool(assistant, 'create_song', { title: 'Karma Police', status: 'idea' })).body,
    );

    const moved = await callTool(assistant, 'update_song', {
      id: other.song.id,
      deezerTrackId: 'deezer-1',
    });

    expect(moved).toEqual({
      isError: true,
      body: { error: 'deezer-track-taken', songId: holder.song.id, songTitle: 'Creep' },
    });
  });

  it('sets the default lineup as the member, notifying the other members only', async () => {
    const band = await prepareBand();
    const assistant = await openHugoAssistant(band);
    const instrumentId = randomUUID();
    const created = songBodySchema.parse(
      (await callTool(assistant, 'create_song', { title: 'Creep', status: 'idea' })).body,
    );

    const lineup = await callTool(assistant, 'set_default_lineup', {
      id: created.song.id,
      defaultLineup: { [instrumentId]: band.lea.memberId },
    });
    const stored = await readSongRow(created.song.id);
    const sent = readSentNotifications(band.send);

    expect(lineup.isError).toBe(false);
    expect(stored?.defaultLineup).toContain(band.lea.memberId);
    expect(sent.map((notification) => notification.endpoint)).toEqual([
      deviceEndpoint('lea-phone'),
    ]);
  });

  it('answers a Deezer outage as the route does', async () => {
    const band = await prepareBand();
    const assistant = await openHugoAssistant(band);
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('', { status: 503 }));

    const search = await callTool(assistant, 'search_deezer', { q: 'nation army mcp outage' });

    expect(search).toEqual({ isError: true, body: { error: 'external-search-unavailable' } });
  });
});
