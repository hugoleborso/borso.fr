export interface CatalogueIdentity {
  readonly mbid: string | null;
  readonly title: string;
  readonly artist: string;
}

const IDENTITY_SEPARATOR = ' ';
const NON_ALPHANUMERIC = /[^\p{Letter}\p{Number}]+/gu;
const DIACRITIC = /\p{Diacritic}/gu;

function foldForComparison(text: string): string {
  return text
    .normalize('NFD')
    .replace(DIACRITIC, '')
    .toLowerCase()
    .replace(NON_ALPHANUMERIC, IDENTITY_SEPARATOR)
    .trim();
}

export function buildSongIdentity(title: string, artist: string): string {
  return `${foldForComparison(title)}${IDENTITY_SEPARATOR}${foldForComparison(artist)}`;
}

/**
 * @Blueprint core-identity-with-a-degraded-fallback
 * @BlueprintName Identity Match With A Degraded Fallback
 * @BlueprintUsage Use when a record carries a strong external identifier that is sometimes absent, and a duplicate must still be caught without it.
 * @BlueprintDescription Matches on the identifier when both sides carry one, because that answer is exact and no amount of spelling can defeat it. Falls back to a folded title and artist only when the identifier is missing, so a weak match can never override a strong one: two recordings with different identifiers are different even when their names agree, which is exactly what a cover and its original are. The fold strips case, accents and punctuation rather than comparing raw text, because the two sides come from two providers who disagree about all three.
 */
export function findCatalogueMatch<TSong extends CatalogueIdentity>(
  songs: readonly TSong[],
  candidate: CatalogueIdentity,
): TSong | null {
  if (candidate.mbid !== null) {
    return songs.find((song) => song.mbid === candidate.mbid) ?? null;
  }
  const wanted = buildSongIdentity(candidate.title, candidate.artist);
  return songs.find((song) => buildSongIdentity(song.title, song.artist) === wanted) ?? null;
}
