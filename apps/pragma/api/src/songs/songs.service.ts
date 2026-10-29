import type { z } from 'zod';
import { DEFAULT_SONG_ORIGIN } from '@domain/song-origin.core';
import { collapseTracksOfOneSong, type ExternalSongHit } from './deezer.core';
import { readDeezerTrack, searchExternal, type SearchExternalOptions } from './deezer.adapter';
import { findCatalogueMatch } from './song-identity.core';
import { resolveSpotifyTrackId, type ResolveSpotifyOptions } from './spotify.adapter';
import type { DeletionOutcome } from '../helpers/persistence/deletion.core';
import { isLostInsertRace, isUniqueViolation } from '../helpers/persistence/conflict-abort.core';
import { notifyBand, type WriteActor } from '../notifications/notifications.service';
import { deleteAudioOfDeletedSong } from '../takes/takes.service';
import { hasLineupChanged } from './song-lineup.core';
export type { SongRow } from './songs.repository';
export { didClaimSongWithin, findSongById, findSongByIdWithin } from './songs.repository';
import { readSongMasteryForTool } from '../mastery/mastery.service';
export { writeMasteryOverride } from '../mastery/mastery.service';
export {
  confirmUpdate,
  defineDeletion,
  defineTool,
  pageItems,
  parseToolFields,
  type ToolActor,
  type ToolAnswer,
} from '../mcp/mcp.service';
import { pickReference, resolveReference } from '../mcp/mcp.service';
import {
  type NamedLineupInput,
  readLineupNames,
  resolveNamedLineupOrRefuse,
} from '../instruments/instruments.service';
import {
  listSongCandidates,
  projectSongForTool,
  type SongFilter,
  type SongSummary,
  summarizeSongs,
} from './song-tool.core';
import {
  deleteSongWithCascade,
  findSongByDeezerTrackId,
  findSongById,
  insertSong,
  listSongsNewestFirst,
  type SongInsertShape,
  type SongRow,
  updateSong,
} from './songs.repository';
import type { songCreateInputSchema, songUpdateInputSchema } from './songs.schema';

type SongMasteryToolView = Awaited<ReturnType<typeof readSongMasteryForTool>>;

export type SongToolView = ReturnType<typeof projectSongForTool> & {
  readonly mastery: SongMasteryToolView['overrides'];
  readonly masteryHistory: SongMasteryToolView['history'];
};

type SongCreateInput = z.infer<typeof songCreateInputSchema>;
type SongUpdateInput = z.infer<typeof songUpdateInputSchema>;

interface SpotifyResolvable {
  readonly spotifyTrackId?: string | null;
  readonly isrcs?: readonly string[];
}

function valuesFromCreate(input: SongCreateInput): SongInsertShape {
  return {
    title: input.title,
    artist: input.artist,
    status: input.status,
    origin: input.origin,
    links: input.links,
    chart: input.chart,
    tonalityStart: input.tonalityStart,
    tonalityEnd: input.tonalityEnd,
    defaultLineup: input.defaultLineup,
    baseEnergy: input.baseEnergy,
    deezerTrackId: input.deezerTrackId,
    deezerAlbumId: input.deezerAlbumId,
    spotifyTrackId: input.spotifyTrackId,
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

async function withResolvedSpotifyTrack<Input extends SpotifyResolvable>(
  input: Input,
  options: ResolveSpotifyOptions,
): Promise<Input> {
  if (input.spotifyTrackId != null) return input;
  if (input.isrcs === undefined || input.isrcs.length === 0) return input;
  const spotifyTrackId = await resolveSpotifyTrackId(input.isrcs, options);
  if (spotifyTrackId === null) return input;
  return { ...input, spotifyTrackId };
}

export interface DeezerTrackTaken {
  readonly kind: 'deezer-track-taken';
  readonly holder: SongRow;
}

export type SongCreateOutcome = { kind: 'ok'; song: SongRow } | DeezerTrackTaken;

async function refuseTakenDeezerTrack(
  error: unknown,
  deezerTrackId: string | null | undefined,
  writtenSongId: string | null,
): Promise<DeezerTrackTaken> {
  if (!isUniqueViolation(error) || deezerTrackId == null) throw error;
  const holder = await findSongByDeezerTrackId(deezerTrackId);
  if (holder === null || holder.id === writtenSongId) throw error;
  return { kind: 'deezer-track-taken', holder };
}

export async function createSong(
  input: SongCreateInput,
  options: ResolveSpotifyOptions = {},
): Promise<SongCreateOutcome> {
  const values = valuesFromCreate(await withResolvedSpotifyTrack(input, options));
  try {
    return { kind: 'ok', song: await insertSong(values) };
  } catch (error) {
    return await refuseTakenDeezerTrack(error, values.deezerTrackId, null);
  }
}

async function notifyIfLineupChanged(
  previous: SongRow | null,
  song: SongRow,
  actor: WriteActor,
): Promise<void> {
  if (previous === null || !hasLineupChanged(previous.defaultLineup, song.defaultLineup)) return;
  await notifyBand(
    {
      kind: 'song-lineup-changed',
      actorMemberId: actor.memberId,
      songId: song.id,
      songTitle: song.title,
    },
    actor.now,
  );
}

// @FollowsBlueprint service-crud-update
export async function patchSong(
  id: string,
  input: SongUpdateInput,
  actor: WriteActor,
  options: ResolveSpotifyOptions = {},
): Promise<
  { kind: 'ok'; song: SongRow } | { kind: 'empty' } | { kind: 'not-found' } | DeezerTrackTaken
> {
  if (Object.keys(input).length === 0) return { kind: 'empty' };
  const previous = input.defaultLineup === undefined ? null : await findSongById(id);
  let song: SongRow | null;
  try {
    song = await updateSong(id, await withResolvedSpotifyTrack(input, options));
  } catch (error) {
    return await refuseTakenDeezerTrack(error, input.deezerTrackId, id);
  }
  if (song === null) return { kind: 'not-found' };
  await notifyIfLineupChanged(previous, song, actor);
  return { kind: 'ok', song };
}

export async function resolveSongId(reference: string): Promise<string> {
  return await resolveReference('song', reference, async () =>
    listSongCandidates(await getSongs()),
  );
}

export async function resolveSongIds(references: readonly string[]): Promise<string[]> {
  const candidates = listSongCandidates(await getSongs());
  return references.map((reference) => pickReference('song', candidates, reference));
}

export async function listSongsForTool(filter: SongFilter): Promise<SongSummary[]> {
  return summarizeSongs(await getSongs(), filter);
}

export async function readSongForTool(
  reference: string,
  isDetailed: boolean,
): Promise<SongToolView | null> {
  const id = await resolveSongId(reference);
  const [song, names, mastery] = await Promise.all([
    findSongById(id),
    readLineupNames(),
    readSongMasteryForTool(id, isDetailed),
  ]);
  if (song === null) return null;
  return {
    ...projectSongForTool(song, names, isDetailed),
    mastery: mastery.overrides,
    masteryHistory: mastery.history,
  };
}

export async function buildSongUpdate(
  changes: Omit<SongUpdateInput, 'defaultLineup'>,
  lineup: NamedLineupInput | undefined,
): Promise<SongUpdateInput> {
  if (lineup === undefined) return changes;
  return { ...changes, defaultLineup: await resolveNamedLineupOrRefuse(lineup) };
}

export async function buildSongCreate(
  input: Omit<SongCreateInput, 'defaultLineup'>,
  lineup: NamedLineupInput | undefined,
): Promise<SongCreateInput> {
  if (lineup === undefined) return { ...input, defaultLineup: {} };
  return { ...input, defaultLineup: await resolveNamedLineupOrRefuse(lineup) };
}

export async function removeSong(id: string): Promise<DeletionOutcome> {
  const deletion = await deleteSongWithCascade(id);
  await deleteAudioOfDeletedSong(deletion.takeObjectKeys);
  return deletion.outcome;
}

export type SongSearchOutcome = { kind: 'ok'; hits: ExternalSongHit[] } | { kind: 'unavailable' };

export async function searchExternalSongs(
  query: string,
  options: SearchExternalOptions = {},
): Promise<SongSearchOutcome> {
  return await searchExternal(query, options);
}

export type AudienceSearchOutcome =
  | { kind: 'ok'; hits: ExternalSongHit[] }
  | { kind: 'unavailable' };

// @FollowsBlueprint service-orchestration
export async function searchAudienceSongs(
  query: string,
  options: SearchExternalOptions = {},
): Promise<AudienceSearchOutcome> {
  const outcome = await searchExternal(query, options);
  if (outcome.kind === 'unavailable') return { kind: 'unavailable' };
  return { kind: 'ok', hits: collapseTracksOfOneSong(outcome.hits) };
}

const SUGGESTED_SONG_STATUS = 'idea';

async function insertSuggestedSong(track: ExternalSongHit): Promise<SongCreateOutcome> {
  return await createSong({
    title: track.title,
    artist: track.artist,
    status: SUGGESTED_SONG_STATUS,
    origin: DEFAULT_SONG_ORIGIN,
    links: [],
    chart: null,
    tonalityStart: null,
    tonalityEnd: null,
    defaultLineup: {},
    baseEnergy: null,
    deezerTrackId: track.deezerTrackId,
    deezerAlbumId: track.deezerAlbumId,
    spotifyTrackId: null,
    album: track.album,
    durationSeconds: track.durationSeconds,
    isrcs: [...track.isrcs],
    tags: [],
    structureNotes: '',
    gimmickNotes: '',
    notes: '',
  });
}

async function importSuggestedSong(track: ExternalSongHit): Promise<SongRow> {
  try {
    const outcome = await insertSuggestedSong(track);
    return outcome.kind === 'ok' ? outcome.song : outcome.holder;
  } catch (error) {
    if (!isLostInsertRace(error)) throw error;
    const winner = await findSongByDeezerTrackId(track.deezerTrackId);
    if (winner === null) throw error;
    return winner;
  }
}

export type TrackResolution =
  | { kind: 'ok'; song: SongRow }
  | { kind: 'unknown' }
  | { kind: 'unavailable' };

// @FollowsBlueprint service-orchestration
export async function resolveCatalogueSongForTrack(trackId: string): Promise<TrackResolution> {
  const read = await readDeezerTrack(trackId);
  if (read.kind === 'unavailable') return { kind: 'unavailable' };
  if (read.kind === 'unknown') return { kind: 'unknown' };
  const known = findCatalogueMatch(await getSongs(), read.track);
  if (known !== null) return { kind: 'ok', song: known };
  return { kind: 'ok', song: await importSuggestedSong(read.track) };
}
