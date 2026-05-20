/**
 * Service layer for songs.
 */

import type { Database } from '../database/client';
import {
  type SongInsertShape,
  type SongRow,
  deleteSongWithCascade,
  findSongById,
  insertSong,
  listSongsNewestFirst,
  updateSong,
} from './songs.repository';
import type { songCreateInputSchema, songUpdateInputSchema } from './songs.schema';
import type { z } from 'zod';

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
  };
}

export async function getSongs(database: Database): Promise<SongRow[]> {
  return await listSongsNewestFirst(database);
}

export async function getSongById(database: Database, id: string): Promise<SongRow | null> {
  return await findSongById(database, id);
}

export async function createSong(database: Database, input: SongCreateInput): Promise<SongRow> {
  return await insertSong(database, valuesFromCreate(input));
}

export async function patchSong(
  database: Database,
  id: string,
  input: SongUpdateInput,
): Promise<{ kind: 'ok'; song: SongRow } | { kind: 'empty' } | { kind: 'not-found' }> {
  if (Object.keys(input).length === 0) return { kind: 'empty' };
  const song = await updateSong(database, id, input);
  if (song === null) return { kind: 'not-found' };
  return { kind: 'ok', song };
}

export async function removeSong(database: Database, id: string): Promise<boolean> {
  return await deleteSongWithCascade(database, id);
}
