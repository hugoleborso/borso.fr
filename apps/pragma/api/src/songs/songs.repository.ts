/**
 * Repository for the songs (catalog) bounded context. Owns the
 * `song` table queries plus the manual cascade on delete
 * (mastery_override + setlist_entry rows, because DSQL does not
 * enforce FK at write time).
 *
 * The three JSON blobs (`links`, `chart`, `default_lineup`) are stored
 * as TEXT (Aurora DSQL doesn't support jsonb — see
 * docs/knowledge/dsql-postgres-compat-gaps.md §1). `rowToSong` is the
 * single parse-and-Zod-validate boundary; writes JSON.stringify on the
 * way in.
 */

import { desc, eq } from 'drizzle-orm';
import type { Database } from '../database/client';
import { masteryOverrideTable } from '../mastery/mastery.schema';
import { setlistEntryTable } from '../setlists/setlists.schema';
import { z } from 'zod';
import {
  chordChartSchema,
  defaultLineupSchema,
  SONG_STATUSES,
  songExternalLinkSchema,
  songLinksRowSchema,
  songTable,
} from './songs.schema';

const songStatusSchema = z.enum(SONG_STATUSES);
export type SongStatus = (typeof SONG_STATUSES)[number];
export type SongLink = z.infer<typeof songExternalLinkSchema>;
export type SongChart = z.infer<typeof chordChartSchema>;
export type SongDefaultLineup = z.infer<typeof defaultLineupSchema>;

export interface SongRow {
  id: string;
  title: string;
  artist: string;
  status: SongStatus;
  links: SongLink[];
  chart: SongChart | null;
  tonalityStart: string | null;
  tonalityEnd: string | null;
  defaultLineup: SongDefaultLineup;
  baseEnergy: number | null;
  createdAt: Date;
}

export interface SongInsertShape {
  title: string;
  artist: string;
  status: SongStatus;
  links: SongLink[];
  chart: SongChart | null;
  tonalityStart: string | null;
  tonalityEnd: string | null;
  defaultLineup: SongDefaultLineup;
  baseEnergy: number | null;
}

export type SongPersistedShape = Partial<SongInsertShape>;

interface SongRawRow {
  id: string;
  title: string;
  artist: string;
  status: string;
  links: string;
  chart: string | null;
  tonalityStart: string | null;
  tonalityEnd: string | null;
  defaultLineup: string;
  baseEnergy: number | null;
  createdAt: Date;
}

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

function rowToSong(row: SongRawRow): SongRow {
  // The three JSON blobs are stored as TEXT because Aurora DSQL doesn't
  // support jsonb. The `as unknown` step is the JSON-parse escape hatch
  // the repo allows; Zod schemas do the runtime validation.
  const linksRaw: unknown = JSON.parse(row.links);
  const chartRaw: unknown = row.chart === null ? null : JSON.parse(row.chart);
  const defaultLineupRaw: unknown = JSON.parse(row.defaultLineup);
  return {
    id: row.id,
    title: row.title,
    artist: row.artist,
    status: songStatusSchema.parse(row.status),
    links: songLinksRowSchema.parse(linksRaw),
    chart: chartRaw === null ? null : chordChartSchema.parse(chartRaw),
    tonalityStart: row.tonalityStart,
    tonalityEnd: row.tonalityEnd,
    defaultLineup: defaultLineupSchema.parse(defaultLineupRaw),
    baseEnergy: row.baseEnergy,
    createdAt: row.createdAt,
  };
}

type SongInsertEncoded = typeof songTable.$inferInsert;
type SongUpdateEncoded = Partial<SongInsertEncoded>;

function encodeInsert(values: SongInsertShape): SongInsertEncoded {
  return {
    title: values.title,
    artist: values.artist,
    status: values.status,
    links: JSON.stringify(values.links ?? []),
    chart: values.chart === null || values.chart === undefined ? null : JSON.stringify(values.chart),
    tonalityStart: values.tonalityStart,
    tonalityEnd: values.tonalityEnd,
    defaultLineup: JSON.stringify(values.defaultLineup ?? {}),
    baseEnergy: values.baseEnergy,
  };
}

function encodeUpdate(updates: SongPersistedShape): SongUpdateEncoded {
  const encoded: SongUpdateEncoded = {};
  if ('title' in updates && updates.title !== undefined) encoded.title = updates.title;
  if ('artist' in updates && updates.artist !== undefined) encoded.artist = updates.artist;
  if ('status' in updates && updates.status !== undefined) encoded.status = updates.status;
  if ('links' in updates) encoded.links = JSON.stringify(updates.links ?? []);
  if ('chart' in updates) {
    encoded.chart =
      updates.chart === null || updates.chart === undefined ? null : JSON.stringify(updates.chart);
  }
  if ('tonalityStart' in updates) encoded.tonalityStart = updates.tonalityStart;
  if ('tonalityEnd' in updates) encoded.tonalityEnd = updates.tonalityEnd;
  if ('defaultLineup' in updates) encoded.defaultLineup = JSON.stringify(updates.defaultLineup ?? {});
  if ('baseEnergy' in updates) encoded.baseEnergy = updates.baseEnergy;
  return encoded;
}

export async function listSongsNewestFirst(database: Database): Promise<SongRow[]> {
  const rows = await database.select(PROJECTION).from(songTable).orderBy(desc(songTable.createdAt));
  return rows.map((row) => rowToSong(row));
}

export async function findSongById(database: Database, id: string): Promise<SongRow | null> {
  const rows = await database
    .select(PROJECTION)
    .from(songTable)
    .where(eq(songTable.id, id))
    .limit(1);
  const row = rows[0];
  return row === undefined ? null : rowToSong(row);
}

export async function insertSong(database: Database, values: SongInsertShape): Promise<SongRow> {
  const [row] = await database.insert(songTable).values(encodeInsert(values)).returning(PROJECTION);
  if (row === undefined) throw new Error('insert returned no row');
  return rowToSong(row);
}

export async function updateSong(
  database: Database,
  id: string,
  updates: SongPersistedShape,
): Promise<SongRow | null> {
  const [row] = await database
    .update(songTable)
    .set(encodeUpdate(updates))
    .where(eq(songTable.id, id))
    .returning(PROJECTION);
  return row === undefined ? null : rowToSong(row);
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
