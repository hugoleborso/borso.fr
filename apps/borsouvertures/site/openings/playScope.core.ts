import type { Mode, PlayScope } from '@/state/persistedState.utils';
import { ALL_KEY, type Selection } from './selectors.utils';

/**
 * Every rule about what the opening picker does when a card is tapped.
 *
 * In learn mode a tap replaces the selection, because a drill runs against one
 * variation. In play mode a tap toggles the card in and out of the play scope,
 * because a game can be played against several openings at once, and picking a
 * child implies its parents.
 */

export const EMPTY_PLAY_SCOPE: PlayScope = { openingIds: [], variationIds: [], lineIds: [] };

export const FULL_SELECTION: Selection = {
  openingId: ALL_KEY,
  variationId: ALL_KEY,
  lineId: ALL_KEY,
};

function toggleMembership(ids: readonly string[], id: string): string[] {
  if (ids.includes(id)) return ids.filter((candidate) => candidate !== id);
  return [...ids, id];
}

function withMembership(ids: readonly string[], id: string): string[] {
  if (ids.includes(id)) return [...ids];
  return [...ids, id];
}

export function clearOpeningsFromPlayScope(scope: PlayScope): PlayScope {
  return { ...scope, openingIds: [], variationIds: [], lineIds: [] };
}

export function clearVariationsFromPlayScope(scope: PlayScope): PlayScope {
  return { ...scope, variationIds: [], lineIds: [] };
}

export function clearLinesFromPlayScope(scope: PlayScope): PlayScope {
  return { ...scope, lineIds: [] };
}

export function toggleOpeningInPlayScope(scope: PlayScope, openingId: string): PlayScope {
  return { ...scope, openingIds: toggleMembership(scope.openingIds, openingId) };
}

export function toggleVariationInPlayScope(
  scope: PlayScope,
  openingId: string,
  variationId: string,
): PlayScope {
  return {
    ...scope,
    openingIds: withMembership(scope.openingIds, openingId),
    variationIds: toggleMembership(scope.variationIds, variationId),
  };
}

export function toggleLineInPlayScope(
  scope: PlayScope,
  openingId: string,
  variationId: string,
  lineId: string,
): PlayScope {
  return {
    openingIds: withMembership(scope.openingIds, openingId),
    variationIds: withMembership(scope.variationIds, variationId),
    lineIds: toggleMembership(scope.lineIds, lineId),
  };
}

export function buildOpeningSelection(openingId: string): Selection {
  return { openingId, variationId: ALL_KEY, lineId: ALL_KEY };
}

export function buildVariationSelection(openingId: string, variationId: string): Selection {
  return { openingId, variationId, lineId: ALL_KEY };
}

export function buildLineSelection(selection: Selection, lineId: string): Selection {
  return { openingId: selection.openingId, variationId: selection.variationId, lineId };
}

// @FollowsBlueprint core-view-intent
export function isOpeningActive(
  mode: Mode,
  openingId: string,
  selection: Selection,
  scope: PlayScope,
): boolean {
  if (mode === 'play') return scope.openingIds.includes(openingId);
  return selection.openingId === openingId;
}

export function isVariationActive(
  mode: Mode,
  variationId: string,
  selection: Selection,
  scope: PlayScope,
): boolean {
  if (mode === 'play') return scope.variationIds.includes(variationId);
  return selection.variationId === variationId;
}

export function isLineActive(
  mode: Mode,
  lineId: string,
  selection: Selection,
  scope: PlayScope,
): boolean {
  if (mode === 'play') return scope.lineIds.includes(lineId);
  return selection.lineId === lineId;
}
