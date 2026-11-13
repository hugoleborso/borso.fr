import { useSyncExternalStore } from 'react';

const NO_MOVES: readonly string[] = [];

const store: { playedMovesUci: readonly string[] } = { playedMovesUci: NO_MOVES };
const listeners = new Set<() => void>();

function subscribeToExplorerMoves(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function readExplorerMoves(): readonly string[] {
  return store.playedMovesUci;
}

export function replaceExplorerMoves(playedMovesUci: readonly string[]): void {
  store.playedMovesUci = playedMovesUci;
  for (const listener of listeners) listener();
}

// @FollowsBlueprint external-store-module
export function useExplorerMoves(): readonly string[] {
  return useSyncExternalStore(subscribeToExplorerMoves, readExplorerMoves);
}
