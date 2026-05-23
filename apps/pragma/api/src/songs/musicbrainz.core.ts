/**
 * Pure MusicBrainz response mapper. Takes the JSON the
 * `/ws/2/recording/?query=...` endpoint returns and projects it onto
 * the shape the catalog UI renders. The mapper is permissive — every
 * upstream field can be missing — and falls back gracefully so a
 * partial result still surfaces in the search dropdown.
 *
 * Live HTTP and rate-limit live in `songs.service.ts`; this file is
 * IO-free and gated at 100% coverage by the `core` Vitest project.
 */

import { z } from 'zod';

export interface ExternalSongHit {
  readonly mbid: string;
  readonly title: string;
  readonly artist: string;
  readonly year: number | null;
}

const artistCreditSchema = z
  .array(
    z.object({
      name: z.string().optional(),
      joinphrase: z.string().optional(),
      artist: z.object({ name: z.string().optional() }).optional(),
    }),
  )
  .optional();

const recordingSchema = z.object({
  id: z.string(),
  title: z.string().optional(),
  'first-release-date': z.string().optional(),
  'artist-credit': artistCreditSchema,
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

export function mapMusicBrainzRecordings(payload: unknown): ExternalSongHit[] {
  const parsed = responseSchema.safeParse(payload);
  if (!parsed.success) return [];
  const recordings = parsed.data.recordings ?? [];
  const hits: ExternalSongHit[] = [];
  for (const recording of recordings) {
    const title = recording.title ?? '';
    if (title.length === 0) continue;
    hits.push({
      mbid: recording.id,
      title,
      artist: composeArtist(recording['artist-credit']),
      year: parseYear(recording['first-release-date']),
    });
  }
  return hits;
}
