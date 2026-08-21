import type { Mode, PlayScope } from '@/state/persistedState.utils';
import { findOpening, type Selection } from './selectors.utils';
import type { Line, Opening, Variation } from './types';

export interface VariationEntry {
  opening: Opening;
  variation: Variation;
}

export interface LineEntry {
  opening: Opening;
  variation: Variation;
  line: Line;
}

export interface OpeningFlowLists {
  readonly variationEntries: VariationEntry[];
  readonly panelVariationEntries: VariationEntry[];
  readonly lineEntries: LineEntry[];
  readonly panelLineEntries: LineEntry[];
}

function listVariationEntries(openings: readonly Opening[]): VariationEntry[] {
  return openings.flatMap((opening) =>
    opening.variations.map((variation) => ({ opening, variation })),
  );
}

function listLineEntries(variationEntries: readonly VariationEntry[]): LineEntry[] {
  return variationEntries.flatMap(({ opening, variation }) =>
    variation.lines.map((line) => ({ opening, variation, line })),
  );
}

function listOpeningsInScope(openings: Opening[], scope: PlayScope): Opening[] {
  if (scope.openingIds.length === 0) return openings;
  return openings.filter((opening) => scope.openingIds.includes(opening.id));
}

function listOpeningsForVariations(
  mode: Mode,
  openings: Opening[],
  scope: PlayScope,
  selectedOpening: Opening | undefined,
): Opening[] {
  if (mode === 'play') return listOpeningsInScope(openings, scope);
  if (selectedOpening === undefined) return openings;
  return [selectedOpening];
}

function listVariationsForLines(
  mode: Mode,
  variationEntries: VariationEntry[],
  scope: PlayScope,
): VariationEntry[] {
  if (mode !== 'play') return variationEntries;
  if (scope.variationIds.length === 0) return variationEntries;
  return variationEntries.filter((entry) => scope.variationIds.includes(entry.variation.id));
}

function listPanelVariationEntries(
  mode: Mode,
  variationEntries: VariationEntry[],
  selectedOpening: Opening | undefined,
): VariationEntry[] {
  if (mode === 'play') return variationEntries;
  if (selectedOpening === undefined) return [];
  return listVariationEntries([selectedOpening]);
}

function listPanelLineEntries(
  mode: Mode,
  lineEntries: LineEntry[],
  panelVariationEntries: VariationEntry[],
  selectedVariationId: string | null,
): LineEntry[] {
  if (mode === 'play') return lineEntries;
  const selectedEntry = panelVariationEntries.find(
    (entry) => entry.variation.id === selectedVariationId,
  );
  if (selectedEntry === undefined) return [];
  return listLineEntries([selectedEntry]);
}

// @FollowsBlueprint core-view-intent
export function buildOpeningFlowLists(
  mode: Mode,
  openings: Opening[],
  selection: Selection,
  scope: PlayScope,
): OpeningFlowLists {
  const selectedOpening = findOpening(openings, selection.openingId);

  const variationEntries = listVariationEntries(
    listOpeningsForVariations(mode, openings, scope, selectedOpening),
  );
  const lineEntries = listLineEntries(listVariationsForLines(mode, variationEntries, scope));
  const panelVariationEntries = listPanelVariationEntries(mode, variationEntries, selectedOpening);

  return {
    variationEntries,
    lineEntries,
    panelVariationEntries,
    panelLineEntries: listPanelLineEntries(
      mode,
      lineEntries,
      panelVariationEntries,
      selection.variationId,
    ),
  };
}
