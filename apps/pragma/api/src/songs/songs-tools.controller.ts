import {
  externalSearchQuerySchema,
  songCreateToolInputSchema,
  songFindToolInputSchema,
  songMasteryReadToolInputSchema,
  songMasteryToolInputSchema,
  songReadToolInputSchema,
  songReferenceToolInputSchema,
  songUpdateToolInputSchema,
} from './songs.schema';
import {
  buildSongCreate,
  buildSongUpdate,
  confirmUpdate,
  createSong,
  defineTool,
  listSongsForTool,
  pageItems,
  patchSong,
  readSongForTool,
  readSongMasteryForTool,
  removeSong,
  resolveSongId,
  searchExternalSongs,
  type ToolActor,
  type ToolAnswer,
  writeMasteryOverride,
} from './songs.service';

type SongUpdate = Parameters<typeof patchSong>[1];

const SONG_PAGE_SIZE = 50;

async function runSongUpdate(id: string, input: SongUpdate, actor: ToolActor): Promise<ToolAnswer> {
  const outcome = await patchSong(id, input, actor);
  if (outcome.kind === 'empty') return { kind: 'refused', body: { error: 'empty-update' } };
  if (outcome.kind === 'not-found') return { kind: 'refused', body: { error: 'not-found' } };
  if (outcome.kind === 'deezer-track-taken') {
    return {
      kind: 'refused',
      body: { error: outcome.kind, songId: outcome.holder.id, songTitle: outcome.holder.title },
    };
  }
  return { kind: 'answered', body: confirmUpdate(id, input) };
}

// @FollowsBlueprint controller-dispatch
export const SONG_TOOLS = [
  defineTool({
    name: 'find_songs',
    description:
      'List catalogue songs by title (id, artist, status, tonality); `query` matches title or artist.',
    routes: ['GET /api/songs'],
    inputSchema: songFindToolInputSchema,
    run: async ({ query, status, limit, cursor }) => {
      const page = pageItems(
        await listSongsForTool({ query, status }),
        { limit, cursor },
        SONG_PAGE_SIZE,
      );
      return {
        kind: 'answered',
        body: { songs: page.items, total: page.total, nextCursor: page.nextCursor },
      };
    },
  }),
  defineTool({
    name: 'get_song',
    description:
      'Read one song by title or id, with its lineup by name and its notes; `detail` adds the chart and links.',
    routes: ['GET /api/songs/:id'],
    inputSchema: songReadToolInputSchema,
    run: async ({ song, detail }) => {
      const view = await readSongForTool(song, detail === true);
      if (view === null) return { kind: 'refused', body: { error: 'not-found' } };
      return { kind: 'answered', body: { song: view } };
    },
  }),
  defineTool({
    name: 'search_deezer',
    description: 'Search Deezer for tracks to add to the catalogue.',
    routes: ['GET /api/songs/search'],
    inputSchema: externalSearchQuerySchema,
    run: async ({ q }) => {
      const outcome = await searchExternalSongs(q);
      if (outcome.kind === 'unavailable') {
        return { kind: 'refused', body: { error: 'external-search-unavailable' } };
      }
      return { kind: 'answered', body: { hits: outcome.hits } };
    },
  }),
  defineTool({
    name: 'create_song',
    description: 'Add a song to the catalogue; `defaultLineup` as in `update_song`.',
    routes: ['POST /api/songs'],
    inputSchema: songCreateToolInputSchema,
    run: async ({ defaultLineup, ...input }) => {
      const outcome = await createSong(await buildSongCreate(input, defaultLineup));
      if (outcome.kind === 'deezer-track-taken') {
        return {
          kind: 'refused',
          body: { error: outcome.kind, songId: outcome.holder.id, songTitle: outcome.holder.title },
        };
      }
      return { kind: 'answered', body: { id: outcome.song.id, title: outcome.song.title } };
    },
  }),
  defineTool({
    name: 'update_song',
    description:
      'Change the fields given of a song. `defaultLineup` maps each member to the instrument(s) they play, by name or id; null sits a member out.',
    routes: ['PUT /api/songs/:id'],
    inputSchema: songUpdateToolInputSchema,
    run: async ({ song, defaultLineup, ...changes }, actor) => {
      const id = await resolveSongId(song);
      return await runSongUpdate(id, await buildSongUpdate(changes, defaultLineup), actor);
    },
  }),
  defineTool({
    name: 'delete_song',
    description: 'Delete a song with its takes, comments and setlist entries.',
    routes: ['DELETE /api/songs/:id'],
    inputSchema: songReferenceToolInputSchema,
    run: async ({ song }) => {
      const id = await resolveSongId(song);
      const outcome = await removeSong(id);
      if (outcome === 'not-found') return { kind: 'refused', body: { error: 'not-found' } };
      return { kind: 'answered', body: { id, deleted: true } };
    },
  }),
  defineTool({
    name: 'get_song_mastery',
    description:
      'Read the mastery scores, 0 to 10, set for one song only (they win over the defaults); `history` adds every change.',
    routes: ['GET /api/mastery/overrides/:songId', 'GET /api/mastery/history/:songId'],
    inputSchema: songMasteryReadToolInputSchema,
    run: async ({ song, history }) => ({
      kind: 'answered',
      body: await readSongMasteryForTool(await resolveSongId(song), history === true),
    }),
  }),
  defineTool({
    name: 'set_song_mastery',
    description:
      'Set the mastery score, 0 to 10, of a member on an instrument for one song only (names or ids); null removes it so the default applies.',
    routes: [
      'PUT /api/mastery/overrides',
      'DELETE /api/mastery/overrides/:memberId/:instrumentId/:songId',
    ],
    inputSchema: songMasteryToolInputSchema,
    run: async ({ song, member, instrument, score }, actor) => {
      const songId = await resolveSongId(song);
      const outcome = await writeMasteryOverride({ songId, member, instrument }, score, actor.now);
      if (outcome === 'not-found') return { kind: 'refused', body: { error: outcome } };
      return { kind: 'answered', body: { songId, member, instrument, score } };
    },
  }),
];
