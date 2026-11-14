import { useSyncExternalStore } from 'react';
import {
  DEFAULT_OPPONENT_STRENGTH,
  type OpponentStrengthId,
} from '@/opponent/opponent-strength.core';
import type { BoardThemeId } from '@/theme/boardThemes.utils';
import {
  IS_EVALUATION_BAR_SHOWN_BY_DEFAULT,
  IS_MOVE_SOUND_ON_BY_DEFAULT,
  NEW_CARDS_PER_DAY_DEFAULT,
  parsePersistedState,
  type PersistedState,
  type Side,
  stringifyPersistedState,
} from './persistedState.utils';

const STORAGE_KEY = 'borsouvertures.v1';

export type AppState = PersistedState;

const INITIAL_STATE: AppState = {
  side: 'white',
  boardStyle: 'chesscom',
  newCardsPerDay: NEW_CARDS_PER_DAY_DEFAULT,
  opponentStrength: DEFAULT_OPPONENT_STRENGTH,
  isEvaluationBarShown: IS_EVALUATION_BAR_SHOWN_BY_DEFAULT,
  isMoveSoundOn: IS_MOVE_SOUND_ON_BY_DEFAULT,
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

export function setSide(side: Side): void {
  update({ side });
}

export function setBoardStyle(boardStyle: BoardThemeId): void {
  update({ boardStyle });
}

export function setNewCardsPerDay(newCardsPerDay: number): void {
  update({ newCardsPerDay });
}

export function setOpponentStrength(opponentStrength: OpponentStrengthId): void {
  update({ opponentStrength });
}

export function setEvaluationBarShown(isEvaluationBarShown: boolean): void {
  update({ isEvaluationBarShown });
}

export function setMoveSoundOn(isMoveSoundOn: boolean): void {
  update({ isMoveSoundOn });
}

export function readOpponentStrength(): OpponentStrengthId {
  return store.state.opponentStrength;
}
