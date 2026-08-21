/** @Feature songs */

const MODULATION_SEPARATOR = ' → ';

// @FollowsBlueprint utils-formatter
export function buildTonalityLabel(start: string | null, end: string | null): string | null {
  if (start === null) return null;
  if (end === null || end === start) return start;
  return `${start}${MODULATION_SEPARATOR}${end}`;
}
