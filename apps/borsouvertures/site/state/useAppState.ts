import { useSyncExternalStore } from 'react';
import { ALL_KEY, type Selection } from '@/openings/selectors.utils';
import type { Opening } from '@/openings/types';
import type { BoardThemeId } from '@/theme/boardThemes.utils';
import {
  parsePersistedState,
  type PersistedState,
  stringifyPersistedState,
} from './persistedState.utils';

import type {
  Mode,
  PlayScope,
  Side,
  TreeVisualizationMode,
  View,
} from './persistedState.utils';

export type { Mode, PlayScope, Side, TreeVisualizationMode };

const STORAGE_KEY = 'borsouvertures.v1';

interface AppState {
  mode: Mode;
  side: Side;
  boardStyle: BoardThemeId;
  selection: Selection;
  openings: Opening[];
  view: View;
  playAutoOpponent: boolean;
  playScope: PlayScope;
  treeVisualizationMode: TreeVisualizationMode;
}

const INITIAL_PERSISTED_STATE: PersistedState = {
  mode: 'learn',
  side: 'white',
  boardStyle: 'chesscom',
  selection: { openingId: ALL_KEY, variationId: ALL_KEY, lineId: ALL_KEY },
  view: 'select',
  playAutoOpponent: true,
  playScope: { openingIds: [], variationIds: [], lineIds: [] },
  treeVisualizationMode: null,
};

function loadInitial(): AppState {
  let restored: PersistedState | null = null;
  try {
    restored = parsePersistedState(window.localStorage.getItem(STORAGE_KEY));
  } catch {
    // localStorage unavailable (private mode / quota / Safari throwback) —
    // fall through to defaults; persistence will degrade silently below too.
  }
  return { ...(restored ?? INITIAL_PERSISTED_STATE), openings: [] };
}

function persistSafely(persisted: PersistedState): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, stringifyPersistedState(persisted));
  } catch {
    // Same reasoning as loadInitial — degrade silently.
  }
}

let state: AppState = loadInitial();
const listeners = new Set<() => void>();

function notifyListeners(): void {
  for (const listener of listeners) listener();
}

function persistedSliceOf(snapshot: AppState): PersistedState {
  return {
    mode: snapshot.mode,
    side: snapshot.side,
    boardStyle: snapshot.boardStyle,
    selection: snapshot.selection,
    view: snapshot.view,
    playAutoOpponent: snapshot.playAutoOpponent,
    playScope: snapshot.playScope,
    treeVisualizationMode: snapshot.treeVisualizationMode,
  };
}

function update(next: Partial<AppState>): void {
  state = { ...state, ...next };
  persistSafely(persistedSliceOf(state));
  notifyListeners();
}

const subscribe = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

const getSnapshot = (): AppState => state;

const dispatchers = {
  setMode: (mode: Mode) => update({ mode }),
  setSide: (side: Side) => update({ side }),
  setBoardStyle: (boardStyle: BoardThemeId) => update({ boardStyle }),
  setSelection: (selection: Selection) => update({ selection }),
  setOpenings: (openings: Opening[]) => update({ openings }),
  setView: (view: View) => update({ view }),
  setPlayAutoOpponent: (playAutoOpponent: boolean) => update({ playAutoOpponent }),
  setPlayScope: (playScope: PlayScope) => update({ playScope }),
  setTreeVisualizationMode: (treeVisualizationMode: TreeVisualizationMode) =>
    update({ treeVisualizationMode }),
};

interface AppStateApi extends AppState {
  setMode: (mode: Mode) => void;
  setSide: (side: Side) => void;
  setBoardStyle: (style: BoardThemeId) => void;
  setSelection: (selection: Selection) => void;
  setOpenings: (openings: Opening[]) => void;
  setView: (view: View) => void;
  setPlayAutoOpponent: (value: boolean) => void;
  setPlayScope: (scope: PlayScope) => void;
  setTreeVisualizationMode: (mode: TreeVisualizationMode) => void;
}

export function useAppState(): AppStateApi {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot);
  return { ...snapshot, ...dispatchers };
}
