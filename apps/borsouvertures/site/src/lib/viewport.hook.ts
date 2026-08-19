import { useSyncExternalStore } from 'react';
import { isCompactViewport, selectBoardWidth } from './viewport.utils';

const SERVER_VIEWPORT_WIDTH_PX = 1024;

/**
 * The viewport width is state owned by the browser rather than by React, so it
 * is read through `useSyncExternalStore`. `subscribe` and `readViewportWidth`
 * live at module scope, so a render does not resubscribe.
 */
function subscribeToViewportWidth(onChange: () => void): () => void {
  window.addEventListener('resize', onChange);
  return () => window.removeEventListener('resize', onChange);
}

function readViewportWidth(): number {
  return window.innerWidth;
}

function readServerViewportWidth(): number {
  return SERVER_VIEWPORT_WIDTH_PX;
}

// @FollowsBlueprint hook-external-store
export function useViewportWidth(): number {
  return useSyncExternalStore(subscribeToViewportWidth, readViewportWidth, readServerViewportWidth);
}

export function useIsCompactViewport(): boolean {
  return isCompactViewport(useViewportWidth());
}

export function useBoardWidth(): number {
  return selectBoardWidth(useViewportWidth());
}
