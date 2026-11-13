import { useSyncExternalStore } from 'react';
import { type AppScreen, INITIAL_SCREEN } from './app-screen.core';

const store: { screen: AppScreen } = { screen: INITIAL_SCREEN };
const listeners = new Set<() => void>();

function subscribeToAppScreen(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function readAppScreen(): AppScreen {
  return store.screen;
}

export function openScreen(screen: AppScreen): void {
  store.screen = screen;
  for (const listener of listeners) listener();
}

// @FollowsBlueprint external-store-module
export function useAppScreen(): AppScreen {
  return useSyncExternalStore(subscribeToAppScreen, readAppScreen);
}
