import type { Mode, PlayScope } from '@/state/persistedState.utils';
import { ALL_KEY, type Selection } from './selectors.utils';

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

export interface LineToggleRequest {
  readonly scope: PlayScope;
  readonly openingId: string;
  readonly variationId: string;
  readonly lineId: string;
}

export function toggleLineInPlayScope({
  scope,
  openingId,
  variationId,
  lineId,
}: LineToggleRequest): PlayScope {
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

export interface OpeningScopeRequest {
  readonly mode: Mode;
  readonly openingId: string;
  readonly selection: Selection;
  readonly scope: PlayScope;
}

// @FollowsBlueprint core-view-intent
export function isOpeningActive({
  mode,
  openingId,
  selection,
  scope,
}: OpeningScopeRequest): boolean {
  if (mode === 'play') return scope.openingIds.includes(openingId);
  return selection.openingId === openingId;
}

export interface VariationScopeRequest {
  readonly mode: Mode;
  readonly variationId: string;
  readonly selection: Selection;
  readonly scope: PlayScope;
}

export function isVariationActive({
  mode,
  variationId,
  selection,
  scope,
}: VariationScopeRequest): boolean {
  if (mode === 'play') return scope.variationIds.includes(variationId);
  return selection.variationId === variationId;
}

export interface LineScopeRequest {
  readonly mode: Mode;
  readonly lineId: string;
  readonly selection: Selection;
  readonly scope: PlayScope;
}

export function isLineActive({ mode, lineId, selection, scope }: LineScopeRequest): boolean {
  if (mode === 'play') return scope.lineIds.includes(lineId);
  return selection.lineId === lineId;
}
