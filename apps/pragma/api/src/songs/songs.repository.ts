/**
 * Repository for the songs (catalog) bounded context. Owns the
 * `song` table queries plus the manual cascade on delete
 * (mastery_override + setlist_entry rows, because DSQL does not
 * enforce FK at write time).
 */

import { desc, eq } from 'drizzle-orm';
import type { Database } from '../database/client';
import { masteryOverrideTable } from '../mastery/mastery.schema';
import { setlistEntryTable } from '../setlists/setlists.schema';
import { songTable } from './songs.schema';

export interface SongRow {
  id: string;
  title: string;
  artist: string;
  status: string;
  links: unknown;
  chart: unknown;
  tonalityStart: string | null;
  tonalityEnd: string | null;
  defaultLineup: unknown;
  baseEnergy: number | null;
  createdAt: Date;
}

export interface SongInsertShape {
  title: string;
  artist: string;
  status: string;
  links: unknown;
  chart: unknown;
  tonalityStart: string | null;
  tonalityEnd: string | null;
  defaultLineup: unknown;
  baseEnergy: number | null;
}

export type SongPersistedShape = Partial<SongInsertShape>;

const PROJECTION = {
  id: songTable.id,
  title: songTable.title,
  artist: songTable.artist,
  status: songTable.status,
  links: songTable.links,
  chart: songTable.chart,
  tonalityStart: songTable.tonalityStart,
  tonalityEnd: songTable.tonalityEnd,
  defaultLineup: songTable.defaultLineup,
  baseEnergy: songTable.baseEnergy,
  createdAt: songTable.createdAt,
} as const;

export async function listSongsNewestFirst(database: Database): Promise<SongRow[]> {
  return await database.select(PROJECTION).from(songTable).orderBy(desc(songTable.createdAt));
}

export async function findSongById(database: Database, id: string): Promise<SongRow | null> {
  const rows = await database
    .select(PROJECTION)
    .from(songTable)
    .where(eq(songTable.id, id))
    .limit(1);
  return rows[0] ?? null;
}

export async function insertSong(database: Database, values: SongInsertShape): Promise<SongRow> {
  const [row] = await database
    .insert(songTable)
    .values({
      title: values.title,
      artist: values.artist,
      status: values.status,
      links: values.links,
      chart: values.chart,
      tonalityStart: values.tonalityStart,
      tonalityEnd: values.tonalityEnd,
      defaultLineup: values.defaultLineup,
      baseEnergy: values.baseEnergy,
    })
    .returning(PROJECTION);
  if (row === undefined) throw new Error('insert returned no row');
  return row;
}

export async function updateSong(
  database: Database,
  id: string,
  updates: SongPersistedShape,
): Promise<SongRow | null> {
  const [row] = await database
    .update(songTable)
    .set(updates)
    .where(eq(songTable.id, id))
    .returning(PROJECTION);
  return row ?? null;
}

export async function deleteSongWithCascade(database: Database, id: string): Promise<boolean> {
  // DSQL ignores FK constraints at write time; cascade the dependent
  // tables ourselves before removing the song row.
  await database.delete(masteryOverrideTable).where(eq(masteryOverrideTable.songId, id));
  await database.delete(setlistEntryTable).where(eq(setlistEntryTable.songId, id));
  const deleted = await database
    .delete(songTable)
    .where(eq(songTable.id, id))
    .returning({ id: songTable.id });
  return deleted.length > 0;
}
