import { useSyncExternalStore } from 'react';
import type { PaletteKey } from './palettes.utils';
import { buildSearch, freshSeed, readUrlState, type UrlState } from './url-state.utils';

const DEFAULT_PALETTE_KEY: PaletteKey = 'classic';
const POP_STATE_EVENT = 'popstate';
const URL_CHANGED_EVENT = 'borso:composition-url-changed';

export const INITIAL_STATE = readUrlState(window.location.search, {
  paletteKey: DEFAULT_PALETTE_KEY,
  fallbackSeed: freshSeed(Math.random()),
});

const DEFAULTS = { paletteKey: INITIAL_STATE.paletteKey, fallbackSeed: INITIAL_STATE.seed };

export function mirrorResolvedStateIntoUrl(): void {
  window.history.replaceState(INITIAL_STATE, '', buildSearch(INITIAL_STATE));
}

function announceUrlChange(): void {
  window.dispatchEvent(new Event(URL_CHANGED_EVENT));
}

function subscribeToCompositionUrl(onStoreChange: () => void): () => void {
  window.addEventListener(POP_STATE_EVENT, onStoreChange);
  window.addEventListener(URL_CHANGED_EVENT, onStoreChange);
  return () => {
    window.removeEventListener(POP_STATE_EVENT, onStoreChange);
    window.removeEventListener(URL_CHANGED_EVENT, onStoreChange);
  };
}

function readCompositionSearch(): string {
  return window.location.search;
}

function readCompositionSearchOnServer(): string {
  return buildSearch(INITIAL_STATE);
}

function readCurrentState(): UrlState {
  return readUrlState(window.location.search, DEFAULTS);
}

export function readCurrentPaletteKey(): PaletteKey {
  return readCurrentState().paletteKey;
}

// @FollowsBlueprint hook-external-store
export function useCompositionState(): UrlState {
  const search = useSyncExternalStore(
    subscribeToCompositionUrl,
    readCompositionSearch,
    readCompositionSearchOnServer,
  );
  return readUrlState(search, DEFAULTS);
}

// @FollowsBlueprint browser-edge-module
export function composeNewSeed(): void {
  const nextState: UrlState = {
    seed: freshSeed(Math.random()),
    paletteKey: readCurrentState().paletteKey,
  };
  window.history.pushState(nextState, '', buildSearch(nextState));
  announceUrlChange();
}

export function refreshSeedInPlace(): void {
  const nextState: UrlState = {
    seed: freshSeed(Math.random()),
    paletteKey: readCurrentState().paletteKey,
  };
  window.history.replaceState(nextState, '', buildSearch(nextState));
  announceUrlChange();
}

export function changePaletteInUrl(paletteKey: PaletteKey): void {
  const nextState: UrlState = { seed: readCurrentState().seed, paletteKey };
  window.history.replaceState(nextState, '', buildSearch(nextState));
  announceUrlChange();
}
