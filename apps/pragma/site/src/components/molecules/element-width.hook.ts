/** @DependsOnExternal browser-resize-observer */

import { useMemo, useSyncExternalStore } from 'react';

interface ElementWidthStore {
  readonly subscribe: (onStoreChange: () => void) => () => void;
  readonly readWidth: () => number | null;
}

function measure(element: Element | null): number | null {
  return element === null ? null : element.getBoundingClientRect().width;
}

function createElementWidthStore(element: Element | null): ElementWidthStore {
  let width: number | null = measure(element);
  let observer: ResizeObserver | null = null;
  const subscribers = new Set<() => void>();

  const republishWidth = (): void => {
    const measured = measure(element);
    if (measured === width) return;
    width = measured;
    for (const subscriber of subscribers) subscriber();
  };

  const startObserving = (): void => {
    if (element === null) return;
    observer = new ResizeObserver(republishWidth);
    observer.observe(element);
  };

  return {
    subscribe: (onStoreChange) => {
      if (subscribers.size === 0) startObserving();
      subscribers.add(onStoreChange);
      return () => {
        subscribers.delete(onStoreChange);
        if (subscribers.size > 0) return;
        observer?.disconnect();
        observer = null;
      };
    },
    readWidth: () => width,
  };
}

function widthOnServer(): number | null {
  return null;
}

// @FollowsBlueprint hook-external-store
export function useElementWidth(element: Element | null): number | null {
  const store = useMemo(() => createElementWidthStore(element), [element]);
  return useSyncExternalStore(store.subscribe, store.readWidth, widthOnServer);
}
