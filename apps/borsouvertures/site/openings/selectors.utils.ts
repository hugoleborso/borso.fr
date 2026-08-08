import type { Line, Opening, Variation } from './types';

export const ALL_KEY = 'all';

/**
 * An identifier, or {@link ALL_KEY} to mean every entry at that level, or
 * `null` for no choice yet. The union is written as `string` because
 * `'all' | string` collapses to `string`; the sentinel is a value, not a type.
 */
type SelectionId = string | null;

export interface Selection {
  openingId: SelectionId;
  variationId: SelectionId;
  lineId: SelectionId;
}

export function findOpening(openings: Opening[], openingId?: string | null): Opening | undefined {
  if (!openingId || openingId === ALL_KEY) return undefined;
  return openings.find((opening) => opening.id === openingId);
}

export function findVariation(
  opening: Opening | undefined,
  variationId?: string | null,
): Variation | undefined {
  if (!opening || !variationId || variationId === ALL_KEY) return undefined;
  return opening.variations.find((variation) => variation.id === variationId);
}

export function findLine(
  variation: Variation | undefined,
  lineId?: string | null,
): Line | undefined {
  if (!variation || !lineId || lineId === ALL_KEY) return undefined;
  return variation.lines.find((line) => line.id === lineId);
}

export function listVariations(opening?: Opening): Variation[] {
  return opening?.variations ?? [];
}

export function listLines(variation?: Variation): Line[] {
  return variation?.lines ?? [];
}
