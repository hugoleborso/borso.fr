import { desc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { getDatabase } from '../database/client';
import { type DeletionOutcome, selectDeletionOutcome } from '../helpers/persistence/deletion.core';
import { resolveSongOrigin, type SongOrigin } from '@domain/song-origin.core';
import { masteryOverrideTable } from '../mastery/mastery.schema';
import { setlistEntryTable } from '../setlists/setlists.schema';
import { deleteVotesOfDeletedSong } from '../setlists/voting.service';
import { detachTasksOfSongBeingDeleted } from '../tasks/tasks.service';
import {
  chordChartSchema,
  defaultLineupSchema,
  SONG_STATUSES,
  type songExternalLinkSchema,
  songIsrcsRowSchema,
  songLinksRowSchema,
  songTable,
  songTagsRowSchema,
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
  origin: SongOrigin;
  links: SongLink[];
  chart: SongChart | null;
  tonalityStart: string | null;
  tonalityEnd: string | null;
  defaultLineup: SongDefaultLineup;
  baseEnergy: number | null;
  deezerTrackId: string | null;
  deezerAlbumId: string | null;
  spotifyTrackId: string | null;
  album: string | null;
  durationSeconds: number | null;
  isrcs: string[];
  tags: string[];
  structureNotes: string;
  gimmickNotes: string;
  notes: string;
  createdAt: Date;
}

export interface SongInsertShape {
  title: string;
  artist: string;
  status: SongStatus;
  origin: SongOrigin;
  links: SongLink[];
  chart: SongChart | null;
  tonalityStart: string | null;
  tonalityEnd: string | null;
  defaultLineup: SongDefaultLineup;
  baseEnergy: number | null;
  deezerTrackId: string | null;
  deezerAlbumId: string | null;
  spotifyTrackId: string | null;
  album: string | null;
  durationSeconds: number | null;
  isrcs: string[];
  tags: string[];
  structureNotes: string;
  gimmickNotes: string;
  notes: string;
}

export type SongPersistedShape = Partial<SongInsertShape>;

interface SongRawRow {
  id: string;
  title: string;
  artist: string;
  status: string;
  origin: string | null;
  links: string;
  chart: string | null;
  tonalityStart: string | null;
  tonalityEnd: string | null;
  defaultLineup: string;
  baseEnergy: number | null;
  deezerTrackId: string | null;
  deezerAlbumId: string | null;
  spotifyTrackId: string | null;
  album: string | null;
  durationSeconds: number | null;
  isrcs: string | null;
  tags: string | null;
  structureNotes: string | null;
  gimmickNotes: string | null;
  notes: string | null;
  createdAt: Date;
}

// @FollowsBlueprint repository-projection
const PROJECTION = {
  id: songTable.id,
  title: songTable.title,
  artist: songTable.artist,
  status: songTable.status,
  origin: songTable.origin,
  links: songTable.links,
  chart: songTable.chart,
  tonalityStart: songTable.tonalityStart,
  tonalityEnd: songTable.tonalityEnd,
  defaultLineup: songTable.defaultLineup,
  baseEnergy: songTable.baseEnergy,
  deezerTrackId: songTable.deezerTrackId,
  deezerAlbumId: songTable.deezerAlbumId,
  spotifyTrackId: songTable.spotifyTrackId,
  album: songTable.album,
  durationSeconds: songTable.durationSeconds,
  isrcs: songTable.isrcs,
  tags: songTable.tags,
  structureNotes: songTable.structureNotes,
  gimmickNotes: songTable.gimmickNotes,
  notes: songTable.notes,
  createdAt: songTable.createdAt,
} as const;

function parseJsonArrayColumn<T>(raw: string | null, schema: z.ZodSchema<T[]>): T[] {
  if (raw === null) return [];
  const storedValue: unknown = JSON.parse(raw);
  return schema.parse(storedValue);
}

/**
 * @Blueprint repository-json-column
 * @BlueprintName Repository Json Column Boundary
 * @BlueprintUsage Use for a column holding json as text, which is what Aurora DSQL forces because it has no jsonb type.
 * @BlueprintDescription Decodes every text-encoded column in one place: `JSON.parse` into a value annotated `unknown`, then a Zod schema that narrows it, which is why no type assertion is needed. `encodeInsert` and `encodeUpdate` are the matching write side, so the encoded string never leaves this file.
 */
function rowToSong(row: SongRawRow): SongRow {
  const linksRaw: unknown = JSON.parse(row.links);
  const chartRaw: unknown = row.chart === null ? null : JSON.parse(row.chart);
  const defaultLineupRaw: unknown = JSON.parse(row.defaultLineup);
  return {
    id: row.id,
    title: row.title,
    artist: row.artist,
    status: songStatusSchema.parse(row.status),
    origin: resolveSongOrigin(row.origin),
    links: songLinksRowSchema.parse(linksRaw),
    chart: chartRaw === null ? null : chordChartSchema.parse(chartRaw),
    tonalityStart: row.tonalityStart,
    tonalityEnd: row.tonalityEnd,
    defaultLineup: defaultLineupSchema.parse(defaultLineupRaw),
    baseEnergy: row.baseEnergy,
    deezerTrackId: row.deezerTrackId,
    deezerAlbumId: row.deezerAlbumId,
    spotifyTrackId: row.spotifyTrackId,
    album: row.album,
    durationSeconds: row.durationSeconds,
    isrcs: parseJsonArrayColumn(row.isrcs, songIsrcsRowSchema),
    tags: parseJsonArrayColumn(row.tags, songTagsRowSchema),
    structureNotes: row.structureNotes ?? '',
    gimmickNotes: row.gimmickNotes ?? '',
    notes: row.notes ?? '',
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
    origin: values.origin,
    links: JSON.stringify(values.links),
    chart: values.chart === null ? null : JSON.stringify(values.chart),
    tonalityStart: values.tonalityStart,
    tonalityEnd: values.tonalityEnd,
    defaultLineup: JSON.stringify(values.defaultLineup),
    baseEnergy: values.baseEnergy,
    deezerTrackId: values.deezerTrackId,
    deezerAlbumId: values.deezerAlbumId,
    spotifyTrackId: values.spotifyTrackId,
    album: values.album,
    durationSeconds: values.durationSeconds,
    isrcs: JSON.stringify(values.isrcs),
    tags: JSON.stringify(values.tags),
    structureNotes: values.structureNotes,
    gimmickNotes: values.gimmickNotes,
    notes: values.notes,
  };
}

function encodeUpdate(updates: SongPersistedShape): SongUpdateEncoded {
  const encoded: SongUpdateEncoded = {};
  if ('title' in updates && updates.title !== undefined) encoded.title = updates.title;
  if ('artist' in updates && updates.artist !== undefined) encoded.artist = updates.artist;
  if ('status' in updates && updates.status !== undefined) encoded.status = updates.status;
  if ('origin' in updates && updates.origin !== undefined) encoded.origin = updates.origin;
  if ('links' in updates) encoded.links = JSON.stringify(updates.links ?? []);
  if ('chart' in updates) {
    encoded.chart =
      updates.chart === null || updates.chart === undefined ? null : JSON.stringify(updates.chart);
  }
  if ('tonalityStart' in updates) encoded.tonalityStart = updates.tonalityStart;
  if ('tonalityEnd' in updates) encoded.tonalityEnd = updates.tonalityEnd;
  if ('defaultLineup' in updates)
    encoded.defaultLineup = JSON.stringify(updates.defaultLineup ?? {});
  if ('baseEnergy' in updates) encoded.baseEnergy = updates.baseEnergy;
  if ('deezerTrackId' in updates) encoded.deezerTrackId = updates.deezerTrackId;
  if ('deezerAlbumId' in updates) encoded.deezerAlbumId = updates.deezerAlbumId;
  if ('spotifyTrackId' in updates) encoded.spotifyTrackId = updates.spotifyTrackId;
  if ('album' in updates) encoded.album = updates.album;
  if ('durationSeconds' in updates) encoded.durationSeconds = updates.durationSeconds;
  if ('isrcs' in updates) encoded.isrcs = JSON.stringify(updates.isrcs ?? []);
  if ('tags' in updates) encoded.tags = JSON.stringify(updates.tags ?? []);
  if ('structureNotes' in updates) encoded.structureNotes = updates.structureNotes;
  if ('gimmickNotes' in updates) encoded.gimmickNotes = updates.gimmickNotes;
  if ('notes' in updates) encoded.notes = updates.notes;
  return encoded;
}

export async function listSongsNewestFirst(): Promise<SongRow[]> {
  const database = getDatabase();
  const rows = await database.select(PROJECTION).from(songTable).orderBy(desc(songTable.createdAt));
  return rows.map((row) => rowToSong(row));
}

export async function findSongById(id: string): Promise<SongRow | null> {
  const database = getDatabase();
  const rows = await database
    .select(PROJECTION)
    .from(songTable)
    .where(eq(songTable.id, id))
    .limit(1);
  const row = rows[0];
  return row === undefined ? null : rowToSong(row);
}

export async function insertSong(values: SongInsertShape): Promise<SongRow> {
  const database = getDatabase();
  const [row] = await database.insert(songTable).values(encodeInsert(values)).returning(PROJECTION);
  if (row === undefined) throw new Error('insert returned no row');
  return rowToSong(row);
}

export async function updateSong(id: string, updates: SongPersistedShape): Promise<SongRow | null> {
  const database = getDatabase();
  const [row] = await database
    .update(songTable)
    .set(encodeUpdate(updates))
    .where(eq(songTable.id, id))
    .returning(PROJECTION);
  return row === undefined ? null : rowToSong(row);
}

export async function deleteSongWithCascade(id: string): Promise<DeletionOutcome> {
  const database = getDatabase();
  return await database.transaction(async (transaction) => {
    await transaction.delete(masteryOverrideTable).where(eq(masteryOverrideTable.songId, id));
    await transaction.delete(setlistEntryTable).where(eq(setlistEntryTable.songId, id));
    await deleteVotesOfDeletedSong(transaction, id);
    await detachTasksOfSongBeingDeleted(transaction, id);
    const deleted = await transaction
      .delete(songTable)
      .where(eq(songTable.id, id))
      .returning({ id: songTable.id });
    return selectDeletionOutcome(deleted.length);
  });
}
