import { z } from 'zod';

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
