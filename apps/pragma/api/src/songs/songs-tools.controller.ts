import {
  externalSearchQuerySchema,
  songCreateFieldsSchema,
  songFindToolInputSchema,
  songMasteryToolInputSchema,
  songReadToolInputSchema,
  songSaveToolInputSchema,
} from './songs.schema';
import {
  buildSongCreate,
  buildSongUpdate,
  confirmUpdate,
  createSong,
  defineDeletion,
  defineTool,
  listSongsForTool,
  pageItems,
  parseToolFields,
  patchSong,
  readSongForTool,
  removeSong,
  resolveSongId,
  searchExternalSongs,
  type ToolActor,
  type ToolAnswer,
  writeMasteryOverride,
} from './songs.service';

type SongUpdate = Parameters<typeof patchSong>[1];
type SongCreate = Parameters<typeof createSong>[0];

const SONG_PAGE_SIZE = 50;

function refuseTakenDeezerTrack(holder: { id: string; title: string }): ToolAnswer {
  return {
    kind: 'refused',
    body: { error: 'deezer-track-taken', songId: holder.id, songTitle: holder.title },
  };
}

async function runSongCreate(input: SongCreate): Promise<ToolAnswer> {
  const outcome = await createSong(input);
  if (outcome.kind === 'deezer-track-taken') return refuseTakenDeezerTrack(outcome.holder);
  return { kind: 'answered', body: { id: outcome.song.id, title: outcome.song.title } };
}

async function runSongUpdate(id: string, input: SongUpdate, actor: ToolActor): Promise<ToolAnswer> {
  const outcome = await patchSong(id, input, actor);
  if (outcome.kind === 'empty') return { kind: 'refused', body: { error: 'empty-update' } };
  if (outcome.kind === 'not-found') return { kind: 'refused', body: { error: 'not-found' } };
  if (outcome.kind === 'deezer-track-taken') return refuseTakenDeezerTrack(outcome.holder);
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
      'Read one song by title or id, with its lineup by name, its notes and the mastery scores set for it; `detail` adds the chart, links and mastery history.',
    routes: [
      'GET /api/songs/:id',
      'GET /api/mastery/overrides/:songId',
      'GET /api/mastery/history/:songId',
    ],
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
    name: 'save_song',
    description:
      'Add a song (`title` and `status` required), or, with `song` (title or id), change only the fields given. `defaultLineup` maps each member to the instrument(s) they play, by name or id; null sits a member out.',
    routes: ['POST /api/songs', 'PUT /api/songs/:id'],
    inputSchema: songSaveToolInputSchema,
    run: async ({ song, defaultLineup, ...fields }, actor) => {
      if (song === undefined) {
        const input = parseToolFields(songCreateFieldsSchema, fields);
        return await runSongCreate(await buildSongCreate(input, defaultLineup));
      }
      const id = await resolveSongId(song);
      return await runSongUpdate(id, await buildSongUpdate(fields, defaultLineup), actor);
    },
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

export const SONG_DELETION = defineDeletion({
  route: 'DELETE /api/songs/:id',
  remove: async (reference) => {
    const id = await resolveSongId(reference);
    const outcome = await removeSong(id);
    if (outcome === 'not-found') return { kind: 'refused', body: { error: 'not-found' } };
    return { kind: 'answered', body: { id, deleted: true } };
  },
});
