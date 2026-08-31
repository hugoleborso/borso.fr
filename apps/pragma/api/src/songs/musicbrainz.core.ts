import { z } from 'zod';

export interface ExternalSongHit {
  readonly mbid: string;
  readonly title: string;
  readonly artist: string;
  readonly year: number | null;
  readonly album: string | null;
  readonly releaseId: string | null;
  readonly durationSeconds: number | null;
  readonly durationLabel: string | null;
  readonly disambiguation: string | null;
  readonly tags: readonly string[];
  readonly isrcs: readonly string[];
  readonly releaseCount: number;
  readonly isrcCount: number;
}

const TAGS_MAX = 5;
const TAG_MIN_COUNT = 1;
const ISRCS_MAX = 3;
const MILLIS_PER_SECOND = 1_000;
const SECONDS_PER_MINUTE = 60;
const SECONDS_LABEL_PAD = 2;

const artistCreditSchema = z
  .array(
    z.object({
      name: z.string().optional(),
      joinphrase: z.string().optional(),
      artist: z.object({ name: z.string().optional() }).optional(),
    }),
  )
  .default([]);

const tagSchema = z.object({
  name: z.string(),
  count: z.number().optional(),
});

const releaseSchema = z.object({
  id: z.string(),
  title: z.string().optional(),
});

const recordingSchema = z.object({
  id: z.string(),
  title: z.string().optional(),
  length: z.number().nullable().optional(),
  disambiguation: z.string().optional(),
  'first-release-date': z.string().default(''),
  'artist-credit': artistCreditSchema,
  releases: z.array(releaseSchema).optional(),
  isrcs: z.array(z.string()).optional(),
  tags: z.array(tagSchema).optional(),
});

const responseSchema = z.object({
  recordings: z.array(recordingSchema).default([]),
});

const YEAR_REGEX = /^(\d{4})/;

function parseYear(raw: string): number | null {
  const match = YEAR_REGEX.exec(raw);
  if (match === null) return null;
  return Number(match[1]);
}

function composeArtist(credit: z.infer<typeof artistCreditSchema>): string {
  return credit
    .map((entry) => `${entry.name ?? entry.artist?.name ?? ''}${entry.joinphrase ?? ''}`)
    .join('')
    .trim();
}

function pickFirstRelease(
  releases: z.infer<typeof releaseSchema>[] | undefined,
): { id: string; title: string | null } | null {
  const first = releases?.[0];
  if (first === undefined) return null;
  return { id: first.id, title: first.title ?? null };
}

function tagCountOrZero(tag: z.infer<typeof tagSchema>): number {
  return tag.count ?? 0;
}

function topTagNames(tags: z.infer<typeof tagSchema>[] | undefined): string[] {
  if (tags === undefined) return [];
  const filtered = tags.filter((tag) => tagCountOrZero(tag) >= TAG_MIN_COUNT);
  const sorted = [...filtered].sort((left, right) => tagCountOrZero(right) - tagCountOrZero(left));
  return sorted.slice(0, TAGS_MAX).map((tag) => tag.name);
}

function durationFromLength(lengthMs: number | null | undefined): {
  seconds: number | null;
  label: string | null;
} {
  if (lengthMs === null || lengthMs === undefined) return { seconds: null, label: null };
  const seconds = Math.round(lengthMs / MILLIS_PER_SECOND);
  const minutes = Math.floor(seconds / SECONDS_PER_MINUTE);
  const remainingSeconds = seconds % SECONDS_PER_MINUTE;
  const paddedSeconds = String(remainingSeconds).padStart(SECONDS_LABEL_PAD, '0');
  return { seconds, label: `${minutes}:${paddedSeconds}` };
}

/**
 * @Blueprint core-parse-untrusted
 * @BlueprintName Core Parse Of Untrusted Input
 * @BlueprintUsage Use for the boundary where a third-party response becomes a typed domain value.
 * @BlueprintDescription Takes `unknown` and runs `safeParse`, returning an empty list rather than throwing, so a shape change upstream empties the search dropdown instead of failing the request. Every optional field falls back inside the mapper, and a recording with no title is dropped rather than emitted blank.
 */
export function mapMusicBrainzRecordings(payload: unknown): ExternalSongHit[] {
  const recordings = responseSchema.safeParse(payload);
  if (!recordings.success) return [];
  const hits: ExternalSongHit[] = [];
  for (const recording of recordings.data.recordings) {
    const title = recording.title ?? '';
    if (title.length === 0) continue;
    const release = pickFirstRelease(recording.releases);
    const duration = durationFromLength(recording.length);
    hits.push({
      mbid: recording.id,
      title,
      artist: composeArtist(recording['artist-credit']),
      year: parseYear(recording['first-release-date']),
      album: release?.title ?? null,
      releaseId: release?.id ?? null,
      durationSeconds: duration.seconds,
      durationLabel: duration.label,
      disambiguation:
        recording.disambiguation !== undefined && recording.disambiguation.length > 0
          ? recording.disambiguation
          : null,
      tags: topTagNames(recording.tags),
      isrcs: (recording.isrcs ?? []).slice(0, ISRCS_MAX),
      releaseCount: recording.releases?.length ?? 0,
      isrcCount: (recording.isrcs ?? []).length,
    });
  }
  return hits;
}

const externalSongHitSchema = z.object({
  mbid: z.string(),
  title: z.string(),
  artist: z.string(),
  year: z.number().nullable(),
  album: z.string().nullable(),
  releaseId: z.string().nullable(),
  durationSeconds: z.number().nullable(),
  durationLabel: z.string().nullable(),
  disambiguation: z.string().nullable(),
  tags: z.array(z.string()),
  isrcs: z.array(z.string()),
  releaseCount: z.number(),
  isrcCount: z.number(),
});

const cachedSearchHitsSchema = z.array(externalSongHitSchema);

// @FollowsBlueprint core-parse-untrusted
export function readCachedSearchHits(rawHits: string): ExternalSongHit[] {
  const cachedPayload: unknown = JSON.parse(rawHits);
  const hits = cachedSearchHitsSchema.safeParse(cachedPayload);
  if (!hits.success) return [];
  return hits.data;
}
