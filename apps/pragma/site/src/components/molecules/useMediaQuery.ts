/**
 * `useMediaQuery(query)` — true if `window.matchMedia(query)` currently
 * matches. Uses `useSyncExternalStore` (not `useEffect`) so the read
 * is consistent with React's concurrent rendering and the subscribe /
 * snapshot are stable per `query`.
 *
 * `useCallback(..., [query])` keeps subscribe + snapshot identities
 * stable across renders that don't change `query` — required to avoid
 * the resubscribe-on-every-render storm the grit plugin
 * `no-inline-subscribe-in-use-sync-external-store` exists to catch
 * (see docs/dantotsus/usesyncexternal-store-subscribe-must-be-stable.md).
 */

import { useCallback, useSyncExternalStore } from 'react';

function getServerSnapshot(): boolean {
  return false;
}

export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const list = window.matchMedia(query);
      list.addEventListener('change', onChange);
      return () => {
        list.removeEventListener('change', onChange);
      };
    },
    [query],
  );
  const getSnapshot = useCallback(() => window.matchMedia(query).matches, [query]);
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export const BREAKPOINT_MD = '(min-width: 768px)';
export const BREAKPOINT_LG = '(min-width: 1024px)';
