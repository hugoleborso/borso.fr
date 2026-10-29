/** @DependsOnExternal browser-scroll */

import { useMemo, useSyncExternalStore } from 'react';
import { readTabRowOverflow, type TabRowOverflow } from './tab-row-overflow.utils';

const SCROLL_EVENT = 'scroll';
const RESIZE_EVENT = 'resize';
const PASSIVE_LISTENER = { passive: true } as const;

interface TabRowOverflowStore {
  readonly subscribe: (onStoreChange: () => void) => () => void;
  readonly readOverflow: () => TabRowOverflow;
}

function createTabRowOverflowStore(row: HTMLElement | null): TabRowOverflowStore {
  return {
    subscribe: (onStoreChange) => {
      row?.addEventListener(SCROLL_EVENT, onStoreChange, PASSIVE_LISTENER);
      window.addEventListener(RESIZE_EVENT, onStoreChange);
      return () => {
        row?.removeEventListener(SCROLL_EVENT, onStoreChange);
        window.removeEventListener(RESIZE_EVENT, onStoreChange);
      };
    },
    readOverflow: () => (row === null ? 'none' : readTabRowOverflow(row)),
  };
}

function overflowOnServer(): TabRowOverflow {
  return 'none';
}

// @FollowsBlueprint hook-external-store
export function useTabRowOverflow(row: HTMLElement | null): TabRowOverflow {
  const store = useMemo(() => createTabRowOverflowStore(row), [row]);
  return useSyncExternalStore(store.subscribe, store.readOverflow, overflowOnServer);
}
