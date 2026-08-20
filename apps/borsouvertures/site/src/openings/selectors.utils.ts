import type { Line, Opening, Variation } from './types';

export const ALL_KEY = 'all';

/**
 * An identifier, or {@link ALL_KEY} to mean every entry at that level, or
 * `null` for no choice yet. The union is written as `string` because
 * `'all' | string` collapses to `string`; the sentinel is a value, not a type.
 *
 * `all` is reserved: a dataset entry carrying it as its own id is never
 * returned by the finders below, because the sentinel is read first.
 */
type SelectionId = string | null;

export interface Selection {
  openingId: SelectionId;
  variationId: SelectionId;
  lineId: SelectionId;
}

// @FollowsBlueprint utils-pure-module
export function findOpening(openings: Opening[], openingId?: string | null): Opening | undefined {
  if (openingId === ALL_KEY) return undefined;
  return openings.find((opening) => opening.id === openingId);
}

export function findVariation(
  opening: Opening,
  variationId?: string | null,
): Variation | undefined {
  if (variationId === ALL_KEY) return undefined;
  return opening.variations.find((variation) => variation.id === variationId);
}

export function findLine(variation: Variation, lineId?: string | null): Line | undefined {
  if (lineId === ALL_KEY) return undefined;
  return variation.lines.find((line) => line.id === lineId);
}

export function listVariations(opening?: Opening): Variation[] {
  return opening?.variations ?? [];
}

export function listLines(variation?: Variation): Line[] {
  return variation?.lines ?? [];
}
