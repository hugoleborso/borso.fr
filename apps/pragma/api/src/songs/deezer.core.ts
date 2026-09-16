import { z } from 'zod';
import { buildSongIdentity } from './song-identity.core';

export interface ExternalSongHit {
  readonly deezerTrackId: string;
  readonly title: string;
  readonly artist: string;
  readonly album: string | null;
  readonly deezerAlbumId: string | null;
  readonly durationSeconds: number | null;
  readonly durationLabel: string | null;
  readonly titleVersion: string | null;
  readonly isrcs: readonly string[];
  readonly popularity: number;
  readonly isExplicit: boolean;
}

const SECONDS_PER_MINUTE = 60;
const SECONDS_LABEL_PAD = 2;

const trackSchema = z.object({
  id: z.number(),
  title: z.string().optional(),
  title_short: z.string().optional(),
  title_version: z.string().optional(),
  isrc: z.string().optional(),
  duration: z.number().optional(),
  rank: z.number().optional(),
  explicit_lyrics: z.boolean().optional(),
  artist: z.object({ name: z.string().optional() }).optional(),
  album: z.object({ id: z.number().optional(), title: z.string().optional() }).optional(),
});

const responseSchema = z.object({
  data: z.array(trackSchema).default([]),
});

function durationLabelOf(seconds: number | null): string | null {
  if (seconds === null) return null;
  const minutes = Math.floor(seconds / SECONDS_PER_MINUTE);
  const remainingSeconds = seconds % SECONDS_PER_MINUTE;
  const paddedSeconds = String(remainingSeconds).padStart(SECONDS_LABEL_PAD, '0');
  return `${String(minutes)}:${paddedSeconds}`;
}

function textOrNull(value: string | undefined): string | null {
  if (value === undefined) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function durationOrNull(duration: number | undefined): number | null {
  const seconds = duration ?? 0;
  return seconds > 0 ? seconds : null;
}

/**
 * @Blueprint core-parse-untrusted
 * @BlueprintName Core Parse Of Untrusted Input
 * @BlueprintUsage Use for the boundary where a third-party response becomes a typed domain value.
 * @BlueprintDescription Takes `unknown` and runs `safeParse`, returning an empty list rather than throwing, so a shape change upstream empties the search dropdown instead of failing the request. Every optional field falls back inside the mapper, and a track with no title is dropped rather than emitted blank. Deezer answers an unusable query with an `error` object instead of `data`, which the schema's default turns into no hits rather than a thrown request.
 * @DependsOnExternal deezer
 */
export function mapDeezerTracks(payload: unknown): ExternalSongHit[] {
  const searchResponse = responseSchema.safeParse(payload);
  if (!searchResponse.success) return [];
  const hits: ExternalSongHit[] = [];
  for (const track of searchResponse.data.data) {
    const title = textOrNull(track.title_short) ?? textOrNull(track.title);
    if (title === null) continue;
    const durationSeconds = durationOrNull(track.duration);
    const isrc = textOrNull(track.isrc);
    const albumId = track.album?.id;
    hits.push({
      deezerTrackId: String(track.id),
      title,
      artist: textOrNull(track.artist?.name) ?? '',
      album: textOrNull(track.album?.title),
      deezerAlbumId: albumId === undefined ? null : String(albumId),
      durationSeconds,
      durationLabel: durationLabelOf(durationSeconds),
      titleVersion: textOrNull(track.title_version),
      isrcs: isrc === null ? [] : [isrc],
      popularity: track.rank ?? 0,
      isExplicit: track.explicit_lyrics ?? false,
    });
  }
  return hits;
}

const failurePayloadSchema = z.object({ error: z.object({ code: z.number().optional() }) });

export const DEEZER_QUOTA_ERROR_CODE = 4;

/**
 * @Blueprint core-failure-reported-inside-a-success
 * @BlueprintName Failure Reported Inside A Success
 * @BlueprintUsage Use where a provider answers 200 to a request it refused, and the refusal is only readable in the body.
 * @BlueprintDescription Reads the provider's own error code out of a payload the transport called a success, so the adapter beside it can tell a refusal from an empty answer. The code is returned rather than a boolean, because a quota refusal and an unknown record arrive through the same shape and the caller has to answer them differently. Returns nothing for a payload carrying no error, which is every successful call.
 * @DependsOnExternal deezer
 */
export function readDeezerErrorCode(payload: unknown): number | null {
  const failure = failurePayloadSchema.safeParse(payload);
  if (!failure.success) return null;
  return failure.data.error.code ?? null;
}

// @FollowsBlueprint core-parse-untrusted
export function mapDeezerTrack(payload: unknown): ExternalSongHit | null {
  return mapDeezerTracks({ data: [payload] })[0] ?? null;
}

/**
 * @Blueprint core-collapse-on-what-the-reader-can-tell-apart
 * @BlueprintName Collapse On What The Reader Can Tell Apart
 * @BlueprintUsage Use where a provider indexes something finer than the reader distinguishes, and several rows reach the page reading identically.
 * @BlueprintDescription Collapses on the folded text the reader actually reads rather than on the identifier the provider assigns, because a remaster, a live take and a compilation cut each carry their own identifier and their own ISRC while reaching the page as the same words. Keeps the first row, so whatever ranking the caller was given decides the survivor. It costs the reader the ability to name one particular version; take it only where telling them apart is not the reader's job, as it is not when a room is voting for a song rather than for a master.
 */
export function collapseTracksOfOneSong(hits: readonly ExternalSongHit[]): ExternalSongHit[] {
  const seenSongs = new Set<string>();
  return hits.filter((hit) => {
    const identity = buildSongIdentity(hit.title, hit.artist);
    if (seenSongs.has(identity)) return false;
    seenSongs.add(identity);
    return true;
  });
}

export interface ExternalSearchCacheEntry {
  readonly value: ExternalSongHit[];
  readonly expiresAt: number;
}

export function expiredSearchCacheKeys(
  cache: ReadonlyMap<string, ExternalSearchCacheEntry>,
  nowMillis: number,
): readonly string[] {
  return [...cache]
    .filter(([, entry]) => entry.expiresAt <= nowMillis)
    .map(([cacheKey]) => cacheKey);
}
