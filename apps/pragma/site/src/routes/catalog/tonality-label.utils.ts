/**
 * The label the song detail page shows for a song's key.
 *
 * A song that modulates carries a start key and a different end key, and the
 * label names both. A song that stays in one key names it once, whether the
 * end key is absent or equal to the start key.
 */

const MODULATION_SEPARATOR = ' → ';

export function buildTonalityLabel(start: string | null, end: string | null): string | null {
  if (start === null) return null;
  if (end === null || end === start) return start;
  return `${start}${MODULATION_SEPARATOR}${end}`;
}
