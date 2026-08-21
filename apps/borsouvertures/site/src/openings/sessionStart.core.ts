import type { Mode, PlayScope, TreeVisualizationMode } from '@/state/persistedState.utils';
import { ALL_KEY, type Selection } from './selectors.utils';

export function isLearnSessionReady(selection: Selection): boolean {
  return selection.variationId !== ALL_KEY && selection.variationId !== null;
}

export function isPlaySessionReady(selection: Selection, scope: PlayScope): boolean {
  return (
    isNarrowed(selection.openingId) ||
    isNarrowed(selection.variationId) ||
    isNarrowed(selection.lineId) ||
    scope.openingIds.length > 0 ||
    scope.variationIds.length > 0 ||
    scope.lineIds.length > 0
  );
}

function isNarrowed(selectedId: string | null): boolean {
  return selectedId !== ALL_KEY && selectedId !== null;
}

// @FollowsBlueprint core-view-intent
export function isSessionStartAllowed(mode: Mode, selection: Selection, scope: PlayScope): boolean {
  if (mode === 'learn') return isLearnSessionReady(selection);
  return isPlaySessionReady(selection, scope);
}

export function isPlayScopeResetRequired(currentMode: Mode, nextMode: Mode): boolean {
  return nextMode === 'play' && currentMode !== 'play';
}

export type TreeVisualization = 'arrows' | 'buttons';

export function selectTreeVisualization(
  chosen: TreeVisualizationMode,
  isCompactViewport: boolean,
): TreeVisualization {
  if (chosen !== null) return chosen;
  if (isCompactViewport) return 'buttons';
  return 'arrows';
}

const SESSION_KEY_SEPARATOR = '|';
const ID_LIST_SEPARATOR = ',';

export function buildSessionKey(
  mode: Mode,
  side: string,
  selection: Selection,
  scope: PlayScope,
): string {
  return [
    mode,
    side,
    selection.openingId,
    selection.variationId,
    selection.lineId,
    scope.openingIds.join(ID_LIST_SEPARATOR),
    scope.variationIds.join(ID_LIST_SEPARATOR),
    scope.lineIds.join(ID_LIST_SEPARATOR),
  ].join(SESSION_KEY_SEPARATOR);
}
