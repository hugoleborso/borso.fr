import type { Line, Opening, Variation } from './types';

export const ALL_KEY = 'all';

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
