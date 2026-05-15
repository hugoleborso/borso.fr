/**
 * Polls the standings endpoint every 2 s and yields the latest snapshot.
 *
 * Uses a `useSyncExternalStore` pattern over a tiny shared cache, so
 * (a) two consumers on the same edition share one HTTP call, and
 * (b) component code stays free of `useEffect`.
 *
 * Snapshot stability: the entry caches the `StandingsState`-shaped
 * snapshot and only rebuilds it when a fetch resolves. React's
 * `useSyncExternalStore` needs the same object reference between
 * mutations — without that, it logs "getSnapshot should be cached"
 * and unmounts the tree.
 */

import { useCallback, useSyncExternalStore } from 'react';
import { apiClient } from '../api/client';
import type { StandingsDto } from '../domain/types';

const POLL_INTERVAL_MS = 2_000;

export interface StandingsState {
  readonly standings: StandingsDto | null;
  readonly mostRecentCorrectionAt: string | null;
  readonly error: Error | null;
}

const INITIAL_SNAPSHOT: StandingsState = {
  standings: null,
  mostRecentCorrectionAt: null,
  error: null,
};

interface CacheEntry {
  snapshot: StandingsState;
  listeners: Set<() => void>;
  intervalId: ReturnType<typeof setInterval> | null;
}

const cache = new Map<string, CacheEntry>();

function ensureEntry(editionSlug: string): CacheEntry {
  const existing = cache.get(editionSlug);
  if (existing !== undefined) return existing;
  const entry: CacheEntry = {
    snapshot: INITIAL_SNAPSHOT,
    listeners: new Set(),
    intervalId: null,
  };
  cache.set(editionSlug, entry);
  return entry;
}

function notify(entry: CacheEntry): void {
  for (const listener of entry.listeners) listener();
}

async function fetchOnce(editionSlug: string): Promise<void> {
  const entry = ensureEntry(editionSlug);
  try {
    const response = await apiClient.getStandings(editionSlug);
    // Normalise the deploy-gap optional: the server may temporarily omit
    // `fastestLap` during the rollout window, which Zod parses as
    // `undefined`. Pin it to `[]` here so downstream consumers always see
    // an array (`StandingsDto.fastestLap` is non-optional).
    entry.snapshot = {
      standings: {
        ...response.standings,
        fastestLap: response.standings.fastestLap ?? [],
      },
      mostRecentCorrectionAt: response.mostRecentCorrectionAt ?? null,
      error: null,
    };
  } catch (error) {
    entry.snapshot = {
      standings: entry.snapshot.standings,
      mostRecentCorrectionAt: entry.snapshot.mostRecentCorrectionAt,
      error: error instanceof Error ? error : new Error('unknown error'),
    };
  }
  notify(entry);
}

function subscribe(editionSlug: string, listener: () => void): () => void {
  // No edition selected (e.g. spectator landing with no current edition):
  // skip the poll entirely. Otherwise we hammer `/api/standings/` (empty
  // segment → 404) every 2 s, per mounted consumer. The hook still hands
  // back `INITIAL_SNAPSHOT` so callers don't have to special-case it.
  if (editionSlug === '') return () => {};
  const entry = ensureEntry(editionSlug);
  entry.listeners.add(listener);
  if (entry.intervalId === null) {
    void fetchOnce(editionSlug);
    entry.intervalId = setInterval(() => {
      void fetchOnce(editionSlug);
    }, POLL_INTERVAL_MS);
  }
  return () => {
    entry.listeners.delete(listener);
    if (entry.listeners.size === 0 && entry.intervalId !== null) {
      clearInterval(entry.intervalId);
      entry.intervalId = null;
    }
  };
}

export function useStandings(editionSlug: string): StandingsState {
  // Reach into the cache lazily on every getSnapshot call — the cache
  // entry itself is stable (created once via ensureEntry), only
  // `entry.snapshot` mutates as fetches resolve. For the empty-slug
  // short-circuit, return the same `INITIAL_SNAPSHOT` reference every
  // time (otherwise React's `getSnapshot should be cached` warning fires
  // and the tree remounts in a loop).
  const entry = editionSlug === '' ? null : ensureEntry(editionSlug);
  // `subscribe` MUST keep the same reference across renders for a given
  // editionSlug. Without `useCallback`, React's `useSyncExternalStore`
  // sees a new function on every render → runs cleanup → re-subscribes →
  // the re-subscribe immediately fires `fetchOnce` because the cleanup
  // just cleared `intervalId`. Net effect: one extra fetch per render
  // ON TOP of the 2 s timer, which compounds — every fetch resolution
  // re-renders the consumer, which re-fetches, which re-renders, … and
  // the back gets hammered far beyond the intended 1 request / 2 s.
  // Pinning the arrow with `useCallback` keeps the subscription stable.
  const subscribeForEdition = useCallback(
    (listener: () => void) => subscribe(editionSlug, listener),
    [editionSlug],
  );
  const getSnapshot = useCallback(
    () => (entry === null ? INITIAL_SNAPSHOT : entry.snapshot),
    [entry],
  );
  return useSyncExternalStore(
    subscribeForEdition,
    getSnapshot,
    () => INITIAL_SNAPSHOT,
  );
}
