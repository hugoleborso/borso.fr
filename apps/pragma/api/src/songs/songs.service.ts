import type { z } from 'zod';
import type { ExternalSongHit } from './musicbrainz.core';
import { searchExternal, type SearchExternalOptions } from './musicbrainz.adapter';
import type { DeletionOutcome } from '../helpers/persistence/deletion.core';
import {
  deleteSongWithCascade,
  findSongById,
  insertSong,
  listSongsNewestFirst,
  type SongInsertShape,
  type SongRow,
  updateSong,
} from './songs.repository';
import type { songCreateInputSchema, songUpdateInputSchema } from './songs.schema';

type SongCreateInput = z.infer<typeof songCreateInputSchema>;
type SongUpdateInput = z.infer<typeof songUpdateInputSchema>;

function valuesFromCreate(input: SongCreateInput): SongInsertShape {
  return {
    title: input.title,
    artist: input.artist,
    status: input.status,
    links: input.links,
    chart: input.chart,
    tonalityStart: input.tonalityStart,
    tonalityEnd: input.tonalityEnd,
    defaultLineup: input.defaultLineup,
    baseEnergy: input.baseEnergy,
    mbid: input.mbid,
    album: input.album,
    durationSeconds: input.durationSeconds,
    isrcs: input.isrcs,
    tags: input.tags,
    structureNotes: input.structureNotes,
    gimmickNotes: input.gimmickNotes,
    notes: input.notes,
  };
}

export async function getSongs(): Promise<SongRow[]> {
  return await listSongsNewestFirst();
}

export async function getSongById(id: string): Promise<SongRow | null> {
  return await findSongById(id);
}

export async function createSong(input: SongCreateInput): Promise<SongRow> {
  return await insertSong(valuesFromCreate(input));
}

// @FollowsBlueprint service-crud-update
export async function patchSong(
  id: string,
  input: SongUpdateInput,
): Promise<{ kind: 'ok'; song: SongRow } | { kind: 'empty' } | { kind: 'not-found' }> {
  if (Object.keys(input).length === 0) return { kind: 'empty' };
  const song = await updateSong(id, input);
  if (song === null) return { kind: 'not-found' };
  return { kind: 'ok', song };
}

export async function removeSong(id: string): Promise<DeletionOutcome> {
  return await deleteSongWithCascade(id);
}

export async function searchExternalSongs(
  query: string,
  options: SearchExternalOptions = {},
): Promise<ExternalSongHit[]> {
  return await searchExternal(query, options);
}
