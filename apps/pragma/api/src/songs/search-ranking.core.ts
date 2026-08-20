import type { ExternalSongHit } from './musicbrainz.core';

const RELEASE_WEIGHT = 3;
const ISRC_WEIGHT = 4;
const TAG_WEIGHT = 2;
const ALBUM_BONUS = 5;
const TITLE_WORD_WEIGHT = 10;
const ARTIST_WORD_WEIGHT = 14;
const UNASKED_TITLE_WORD_PENALTY = 7;
const COVER_MARKER_PENALTY = 40;
const RELEASE_COUNT_CAP = 20;

const COVER_MARKERS = [
  ' vs.',
  ' vs ',
  'mashup',
  'karaoke',
  'tribute',
  'cover',
  'instrumental',
  'made famous by',
  'made popular by',
  'in the style of',
  'backing track',
  'originally performed',
  'remix',
  'live',
  '8-bit',
  '8 bit',
] as const;

export function coverSearchText(hit: ExternalSongHit): string {
  return `${hit.title} ${hit.album ?? ''} ${hit.disambiguation ?? ''}`.toLowerCase();
}

export function hasCoverMarker(hit: ExternalSongHit): boolean {
  const haystack = coverSearchText(hit);
  return COVER_MARKERS.some((marker) => haystack.includes(marker));
}

export function wordsOf(value: string): readonly string[] {
  return (
    value
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .match(/[a-z0-9]+/g) ?? []
  );
}

export function overlapWithQuery(candidate: string, query: string): number {
  const asked = new Set(wordsOf(query));
  return [...new Set(wordsOf(candidate))].filter((word) => asked.has(word)).length;
}

export function unaskedTitleWords(title: string, query: string): number {
  const asked = new Set(wordsOf(query));
  return [...new Set(wordsOf(title))].filter((word) => !asked.has(word)).length;
}

// @FollowsBlueprint core-decision
export function scoreExternalHit(hit: ExternalSongHit, query: string): number {
  const releases = Math.min(hit.releaseCount, RELEASE_COUNT_CAP);
  let score =
    releases * RELEASE_WEIGHT + hit.isrcCount * ISRC_WEIGHT + hit.tags.length * TAG_WEIGHT;
  score += overlapWithQuery(hit.title, query) * TITLE_WORD_WEIGHT;
  score += overlapWithQuery(hit.artist, query) * ARTIST_WORD_WEIGHT;
  score -= unaskedTitleWords(hit.title, query) * UNASKED_TITLE_WORD_PENALTY;
  if (hit.album !== null) score += ALBUM_BONUS;
  if (hasCoverMarker(hit)) score -= COVER_MARKER_PENALTY;
  return score;
}

export function rankExternalHits(
  hits: readonly ExternalSongHit[],
  query: string,
): readonly ExternalSongHit[] {
  return [...hits].sort((left, right) => {
    const difference = scoreExternalHit(right, query) - scoreExternalHit(left, query);
    if (difference !== 0) return difference;
    return left.mbid.localeCompare(right.mbid);
  });
}
