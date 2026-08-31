/**
 * @DependsOnExternal deezer
 */

import { z } from 'zod';

export interface AudienceSongHit {
  readonly trackId: string;
  readonly title: string;
  readonly artist: string;
  readonly album: string | null;
  readonly durationSeconds: number | null;
  readonly isrc: string | null;
}

const trackSchema = z.object({
  id: z.union([z.number(), z.string()]),
  title: z.string().optional(),
  title_short: z.string().optional(),
  isrc: z.string().optional(),
  duration: z.number().optional(),
  artist: z.object({ name: z.string().optional() }).optional(),
  album: z.object({ title: z.string().optional() }).optional(),
});

const searchPayloadSchema = z.object({ data: z.array(trackSchema).default([]) });

const NO_DURATION = 0;

function readTitle(track: z.infer<typeof trackSchema>): string {
  const short = track.title_short?.trim() ?? '';
  if (short.length > 0) return short;
  return track.title?.trim() ?? '';
}

function readDurationSeconds(track: z.infer<typeof trackSchema>): number | null {
  const duration = track.duration ?? NO_DURATION;
  if (duration <= NO_DURATION) return null;
  return duration;
}

function readOptionalText(value: string | undefined): string | null {
  const trimmed = value?.trim() ?? '';
  if (trimmed.length === 0) return null;
  return trimmed;
}

function toHit(track: z.infer<typeof trackSchema>): AudienceSongHit | null {
  const title = readTitle(track);
  const artist = track.artist?.name?.trim() ?? '';
  if (title.length === 0 || artist.length === 0) return null;
  return {
    trackId: String(track.id),
    title,
    artist,
    album: readOptionalText(track.album?.title),
    durationSeconds: readDurationSeconds(track),
    isrc: readOptionalText(track.isrc),
  };
}

/**
 * @Blueprint core-vendor-payload-mapping
 * @BlueprintName Vendor Payload Mapping
 * @BlueprintUsage Use for the pure function that turns one third-party response into this application's own type, beside the adapter that fetched it.
 * @BlueprintDescription Parses the payload with a schema that makes every field it does not need optional, so a vendor adding or renaming a field it does not read cannot break the mapping. Drops a record the domain cannot use rather than emitting a half-filled one, and returns the application's type so no caller ever holds the vendor's shape.
 * @DependsOnExternal deezer
 */
export function mapDeezerTracks(payload: unknown): AudienceSongHit[] {
  const searchResponse = searchPayloadSchema.safeParse(payload);
  if (!searchResponse.success) return [];
  return searchResponse.data.data.flatMap((track) => {
    const hit = toHit(track);
    return hit === null ? [] : [hit];
  });
}

/**
 * @Blueprint core-collapse-on-shared-identity
 * @BlueprintName Collapse Rows Sharing One Identity
 * @BlueprintUsage Use where a provider returns several rows for one real-world thing and the reader must see it once.
 * @BlueprintDescription Keeps the first row for each identity and drops the rest, so provider order decides the survivor and the caller keeps whatever ranking it was given. Rows carrying no identity are all kept, because absence of an identity is not evidence of sameness — collapsing them would merge things that only look alike.
 */
export function collapseTracksSharingAnIsrc(hits: readonly AudienceSongHit[]): AudienceSongHit[] {
  const seenIsrcs = new Set<string>();
  return hits.filter((hit) => {
    if (hit.isrc === null) return true;
    if (seenIsrcs.has(hit.isrc)) return false;
    seenIsrcs.add(hit.isrc);
    return true;
  });
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

// @FollowsBlueprint core-vendor-payload-mapping
export function mapDeezerTrack(payload: unknown): AudienceSongHit | null {
  const track = trackSchema.safeParse(payload);
  if (!track.success) return null;
  return toHit(track.data);
}

const audienceSongHitSchema = z.object({
  trackId: z.string(),
  title: z.string(),
  artist: z.string(),
  album: z.string().nullable(),
  durationSeconds: z.number().nullable(),
  isrc: z.string().nullable(),
});

const cachedAudienceHitsSchema = z.array(audienceSongHitSchema);

export function readCachedAudienceHits(rawHits: string): AudienceSongHit[] {
  const cachedPayload: unknown = JSON.parse(rawHits);
  const hits = cachedAudienceHitsSchema.safeParse(cachedPayload);
  if (!hits.success) return [];
  return hits.data;
}
