import { z } from 'zod';
import {
  externalSearchQuerySchema,
  songCreateInputSchema,
  songIdParamSchema,
  songLineupToolInputSchema,
  songUpdateToolInputSchema,
} from './songs.schema';
import {
  createSong,
  defineTool,
  findSongById,
  getSongs,
  patchSong,
  removeSong,
  searchExternalSongs,
  type ToolActor,
  type ToolAnswer,
} from './songs.service';

type SongUpdate = Parameters<typeof patchSong>[1];

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
  return { kind: 'answered', body: { song: outcome.song } };
}

// @FollowsBlueprint controller-dispatch
export const SONG_TOOLS = [
  defineTool({
    name: 'search_songs',
    description: "List every song in the band's catalogue, newest first.",
    route: 'GET /api/songs',
    inputSchema: z.object({}),
    run: async () => ({ kind: 'answered', body: { songs: await getSongs() } }),
  }),
  defineTool({
    name: 'search_deezer',
    description: 'Search Deezer for tracks to add to the catalogue; `q` is the search text.',
    route: 'GET /api/songs/search',
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
    name: 'get_song',
    description: 'Read one song of the catalogue by its id.',
    route: 'GET /api/songs/:id',
    inputSchema: songIdParamSchema,
    run: async ({ id }) => {
      const song = await findSongById(id);
      if (song === null) return { kind: 'refused', body: { error: 'not-found' } };
      return { kind: 'answered', body: { song } };
    },
  }),
  defineTool({
    name: 'create_song',
    description: 'Add a song to the catalogue.',
    route: 'POST /api/songs',
    inputSchema: songCreateInputSchema,
    run: async (input) => {
      const outcome = await createSong(input);
      if (outcome.kind === 'deezer-track-taken') {
        return {
          kind: 'refused',
          body: { error: outcome.kind, songId: outcome.holder.id, songTitle: outcome.holder.title },
        };
      }
      return { kind: 'answered', body: { song: outcome.song } };
    },
  }),
  defineTool({
    name: 'update_song',
    description: 'Change some fields of a song; fields left out keep their value.',
    route: 'PUT /api/songs/:id',
    inputSchema: songUpdateToolInputSchema,
    run: async ({ id, ...input }, actor) => await runSongUpdate(id, input, actor),
  }),
  defineTool({
    name: 'set_default_lineup',
    description:
      "Set a song's default lineup: a map from instrument id to the member id, or member ids, who play it.",
    route: 'PUT /api/songs/:id',
    inputSchema: songLineupToolInputSchema,
    run: async ({ id, defaultLineup }, actor) => await runSongUpdate(id, { defaultLineup }, actor),
  }),
  defineTool({
    name: 'delete_song',
    description: 'Delete a song with its takes, comments and setlist entries.',
    route: 'DELETE /api/songs/:id',
    inputSchema: songIdParamSchema,
    run: async ({ id }) => {
      const outcome = await removeSong(id);
      if (outcome === 'not-found') return { kind: 'refused', body: { error: 'not-found' } };
      return { kind: 'answered', body: { id, deleted: true } };
    },
  }),
];
