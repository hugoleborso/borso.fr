import type { z } from 'zod';
import { DEFAULT_SONG_ORIGIN } from '@domain/song-origin.core';
import { collapseTracksOfOneSong, type ExternalSongHit } from './deezer.core';
import { readDeezerTrack, searchExternal, type SearchExternalOptions } from './deezer.adapter';
import { findCatalogueMatch } from './song-identity.core';
import { resolveSpotifyTrackId, type ResolveSpotifyOptions } from './spotify.adapter';
import type { DeletionOutcome } from '../helpers/persistence/deletion.core';
import { notifyBand, type WriteActor } from '../notifications/notifications.service';
import { deleteAudioOfDeletedSong } from '../takes/takes.service';
import { hasLineupChanged } from './song-lineup.core';
export type { SongRow } from './songs.repository';
export { findSongById } from './songs.repository';
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

export async function createSong(
  input: SongCreateInput,
  options: ResolveSpotifyOptions = {},
): Promise<SongRow> {
  return await insertSong(valuesFromCreate(await withResolvedSpotifyTrack(input, options)));
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
): Promise<{ kind: 'ok'; song: SongRow } | { kind: 'empty' } | { kind: 'not-found' }> {
  if (Object.keys(input).length === 0) return { kind: 'empty' };
  const previous = input.defaultLineup === undefined ? null : await findSongById(id);
  const song = await updateSong(id, await withResolvedSpotifyTrack(input, options));
  if (song === null) return { kind: 'not-found' };
  await notifyIfLineupChanged(previous, song, actor);
  return { kind: 'ok', song };
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
  { kind: 'ok'; hits: ExternalSongHit[] } | { kind: 'unavailable' };

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

async function importSuggestedSong(track: ExternalSongHit): Promise<SongRow> {
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

export type TrackResolution =
  { kind: 'ok'; song: SongRow } | { kind: 'unknown' } | { kind: 'unavailable' };

// @FollowsBlueprint service-orchestration
export async function resolveCatalogueSongForTrack(trackId: string): Promise<TrackResolution> {
  const read = await readDeezerTrack(trackId);
  if (read.kind === 'unavailable') return { kind: 'unavailable' };
  if (read.kind === 'unknown') return { kind: 'unknown' };
  const known = findCatalogueMatch(await getSongs(), read.track);
  if (known !== null) return { kind: 'ok', song: known };
  return { kind: 'ok', song: await importSuggestedSong(read.track) };
}
