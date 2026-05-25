/**
 * Pure MusicBrainz response mapper. Takes the JSON the
 * `/ws/2/recording/?query=...&inc=tags+releases+isrcs` endpoint returns
 * and projects it onto the shape the catalog UI renders. The mapper is
 * permissive — every upstream field can be missing — and falls back
 * gracefully so a partial result still surfaces in the search dropdown.
 *
 * Live HTTP and rate-limit live in `songs.service.ts`; this file is
 * IO-free and gated at 100% coverage by the `core` Vitest project.
 *
 * Tonality is deliberately not pulled: MusicBrainz only carries it on
 * `work` entities (sparingly), never on `recording`. Pop/rock coverage
 * is near-zero — see kaizen note for GetSongBPM as a future source.
 */

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
  // Filled by the GetSongBPM secondary lookup when the API key is set.
  // `null` when the upstream returned no match or `GETSONGBPM_API_KEY`
  // was empty at request time — both are graceful no-ops, never errors.
  readonly tonality: string | null;
  readonly bpm: number | null;
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
  .optional();

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
  'first-release-date': z.string().optional(),
  'artist-credit': artistCreditSchema,
  releases: z.array(releaseSchema).optional(),
  isrcs: z.array(z.string()).optional(),
  tags: z.array(tagSchema).optional(),
});

const responseSchema = z.object({
  recordings: z.array(recordingSchema).optional(),
});

const YEAR_REGEX = /^(\d{4})/;

function parseYear(raw: string | undefined): number | null {
  if (raw === undefined) return null;
  const match = YEAR_REGEX.exec(raw);
  if (match === null) return null;
  return Number(match[1]);
}

function composeArtist(credit: z.infer<typeof artistCreditSchema>): string {
  if (credit === undefined || credit.length === 0) return '';
  const parts: string[] = [];
  for (const entry of credit) {
    const name = entry.name ?? entry.artist?.name ?? '';
    parts.push(name);
    if (entry.joinphrase !== undefined) parts.push(entry.joinphrase);
  }
  return parts.join('').trim();
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

export function mapMusicBrainzRecordings(payload: unknown): ExternalSongHit[] {
  const parsed = responseSchema.safeParse(payload);
  if (!parsed.success) return [];
  const recordings = parsed.data.recordings ?? [];
  const hits: ExternalSongHit[] = [];
  for (const recording of recordings) {
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
      tonality: null,
      bpm: null,
    });
  }
  return hits;
}
