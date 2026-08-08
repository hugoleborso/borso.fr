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
    return parsePersistedState(window.localStorage.getItem(STORAGE_KEY)) ?? INITIAL_STATE;
  } catch {
    // localStorage is unavailable in private mode and over quota, and the
    // application is fully usable without it, so persistence degrades silently.
    return INITIAL_STATE;
  }
}

function persistSafely(state: AppState): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, stringifyPersistedState(state));
  } catch {
    // Same reasoning as readInitialState.
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

/** Leaving learn for play must not inherit the line the user was drilling. */
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
