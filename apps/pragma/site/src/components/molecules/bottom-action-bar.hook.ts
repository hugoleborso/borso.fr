/** @DependsOnExternal browser-scroll */

import { useSyncExternalStore } from 'react';
import {
  anchorStateAt,
  BOTTOM_ACTION_BAR_AT_REST,
  type BottomActionBarState,
  isAtAScrollEdge,
  nextBottomActionBarState,
  readScrollExtent,
} from './bottom-action-bar.core';

const SCROLL_EVENT = 'scroll';
const RESIZE_EVENT = 'resize';
const PASSIVE = { passive: true } as const;

interface BottomActionBarVisibilityStore {
  readonly subscribe: (onStoreChange: () => void) => () => void;
  readonly isShowing: () => boolean;
}

function findShellScrollRegion(): HTMLElement | null {
  return document.querySelector('main');
}

function createBottomActionBarVisibilityStore(): BottomActionBarVisibilityStore {
  let state: BottomActionBarState = BOTTOM_ACTION_BAR_AT_REST;
  let listenedRegion: HTMLElement | null = null;
  const subscribers = new Set<() => void>();

  const reconsiderVisibility = (): void => {
    if (listenedRegion === null) return;
    const extent = readScrollExtent(listenedRegion);
    const previous = state;
    state = nextBottomActionBarState(previous, {
      offset: extent.offset,
      isAtAnEdge: isAtAScrollEdge(extent),
    });
    if (state.isShowing === previous.isShowing) return;
    for (const subscriber of subscribers) subscriber();
  };

  const startListening = (): void => {
    const region = findShellScrollRegion();
    listenedRegion = region;
    state = region === null ? BOTTOM_ACTION_BAR_AT_REST : anchorStateAt(region.scrollTop);
    region?.addEventListener(SCROLL_EVENT, reconsiderVisibility, PASSIVE);
    window.addEventListener(RESIZE_EVENT, reconsiderVisibility, PASSIVE);
  };

  const stopListening = (): void => {
    listenedRegion?.removeEventListener(SCROLL_EVENT, reconsiderVisibility);
    window.removeEventListener(RESIZE_EVENT, reconsiderVisibility);
    listenedRegion = null;
    state = BOTTOM_ACTION_BAR_AT_REST;
  };

  return {
    subscribe: (onStoreChange) => {
      if (subscribers.size === 0) startListening();
      subscribers.add(onStoreChange);
      return () => {
        subscribers.delete(onStoreChange);
        if (subscribers.size === 0) stopListening();
      };
    },
    isShowing: () => state.isShowing,
  };
}

const visibilityStore = createBottomActionBarVisibilityStore();

function isBarShowingOnServer(): boolean {
  return true;
}

// @FollowsBlueprint hook-external-store
export function useIsBottomActionBarShowing(): boolean {
  return useSyncExternalStore(
    visibilityStore.subscribe,
    visibilityStore.isShowing,
    isBarShowingOnServer,
  );
}
