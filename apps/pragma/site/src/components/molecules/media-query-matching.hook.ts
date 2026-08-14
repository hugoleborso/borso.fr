/**
 * `useIsMediaQueryMatching(query)` is true while
 * `window.matchMedia(query)` matches. It reads through `useSyncExternalStore`, which is correct
 * under concurrent rendering, where an effect that copies the match
 * into state is not.
 *
 * `subscribe` and `getSnapshot` are built once per query string and
 * cached at module level, so a render that does not change the query
 * hands React the same two function identities and React does not
 * resubscribe. See
 * docs/dantotsus/usesyncexternal-store-subscribe-must-be-stable.md.
 *
 * @DependsOnExternal browser-media-query
 */

import { useSyncExternalStore } from 'react';

export const BREAKPOINT_MD = '(min-width: 768px)';
export const BREAKPOINT_LG = '(min-width: 1024px)';
export const BREAKPOINT_BELOW_LG = '(max-width: 1023px)';

type Subscribe = (onStoreChange: () => void) => () => void;
type ReadMatch = () => boolean;

const subscribeByQuery = new Map<string, Subscribe>();
const readMatchByQuery = new Map<string, ReadMatch>();

function buildSubscribe(query: string): Subscribe {
  return (onStoreChange) => {
    const mediaQueryList = window.matchMedia(query);
    mediaQueryList.addEventListener('change', onStoreChange);
    return () => {
      mediaQueryList.removeEventListener('change', onStoreChange);
    };
  };
}

function buildReadMatch(query: string): ReadMatch {
  return () => window.matchMedia(query).matches;
}

function subscribeToMediaQuery(query: string): Subscribe {
  const subscribe = subscribeByQuery.get(query) ?? buildSubscribe(query);
  subscribeByQuery.set(query, subscribe);
  return subscribe;
}

function readMediaQueryMatch(query: string): ReadMatch {
  const readMatch = readMatchByQuery.get(query) ?? buildReadMatch(query);
  readMatchByQuery.set(query, readMatch);
  return readMatch;
}

function isMatchingOnServer(): boolean {
  return false;
}

// @FollowsBlueprint hook-external-store
export function useIsMediaQueryMatching(query: string): boolean {
  return useSyncExternalStore(
    subscribeToMediaQuery(query),
    readMediaQueryMatch(query),
    isMatchingOnServer,
  );
}
