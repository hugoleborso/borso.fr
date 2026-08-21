import { useSyncExternalStore } from 'react';
import { EMPTY_PLAY_SCOPE, FULL_SELECTION } from '@/openings/playScope.core';
import type { Selection } from '@/openings/selectors.utils';
import type { BoardThemeId } from '@/theme/boardThemes.utils';
import {
  type Mode,
  parsePersistedState,
  type PersistedState,
  type PlayScope,
  type Side,
  stringifyPersistedState,
  type TreeVisualizationMode,
  type View,
} from './persistedState.utils';

export type { Mode, PlayScope, Side, TreeVisualizationMode, View };

const STORAGE_KEY = 'borsouvertures.v1';

export type AppState = PersistedState;

const INITIAL_STATE: AppState = {
  mode: 'learn',
  side: 'white',
  boardStyle: 'chesscom',
  selection: FULL_SELECTION,
  view: 'select',
  playAutoOpponent: true,
  playScope: EMPTY_PLAY_SCOPE,
  treeVisualizationMode: null,
};

function readInitialState(): AppState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === null) return INITIAL_STATE;
    return parsePersistedState(raw) ?? INITIAL_STATE;
  } catch {
    return INITIAL_STATE;
  }
}

function ignoreUnavailableStorage(): void {
  return undefined;
}

function persistSafely(state: AppState): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, stringifyPersistedState(state));
  } catch {
    ignoreUnavailableStorage();
  }
}

const store: { state: AppState } = { state: readInitialState() };
const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function readSnapshot(): AppState {
  return store.state;
}

function update(next: Partial<AppState>): void {
  store.state = { ...store.state, ...next };
  persistSafely(store.state);
  for (const listener of listeners) listener();
}

/**
 * @Blueprint persisted-store-module
 * @BlueprintName Persisted External Store Module
 * @BlueprintUsage Use for client state that several unrelated components read and that has to survive a reload.
 * @BlueprintDescription Keeps the state in one module level holder with a listener set, exposes it through `useSyncExternalStore` with `subscribe` and `readSnapshot` declared at module scope so a render never resubscribes, and funnels every write through a single `update` that replaces the object, mirrors it to storage, then notifies. The replacement is what makes the snapshot comparable by identity, and both storage calls sit inside `try` blocks that swallow the failure, because private browsing and a full quota both throw and the application still works without persistence.
 */
export function useAppState(): AppState {
  return useSyncExternalStore(subscribe, readSnapshot);
}

export function setMode(mode: Mode): void {
  update({ mode });
}

export function setSide(side: Side): void {
  update({ side });
}

export function setBoardStyle(boardStyle: BoardThemeId): void {
  update({ boardStyle });
}

export function setSelection(selection: Selection): void {
  update({ selection });
}

export function setView(view: View): void {
  update({ view });
}

export function setPlayAutoOpponent(isAutoOpponentEnabled: boolean): void {
  update({ playAutoOpponent: isAutoOpponentEnabled });
}

export function setPlayScope(playScope: PlayScope): void {
  update({ playScope });
}

export function setTreeVisualizationMode(treeVisualizationMode: TreeVisualizationMode): void {
  update({ treeVisualizationMode });
}

export function resetPlayScopeAndSelection(): void {
  update({ playScope: EMPTY_PLAY_SCOPE, selection: FULL_SELECTION });
}

export function startPlayWithVariation(openingId: string, variationId: string): void {
  update({
    playScope: { openingIds: [openingId], variationIds: [variationId], lineIds: [] },
    selection: FULL_SELECTION,
    mode: 'play',
  });
}
