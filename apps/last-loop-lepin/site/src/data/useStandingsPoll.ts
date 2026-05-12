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

import { useSyncExternalStore } from 'react';
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
    entry.snapshot = {
      standings: response.standings,
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
  const entry = ensureEntry(editionSlug);
  return useSyncExternalStore(
    (listener) => subscribe(editionSlug, listener),
    () => entry.snapshot,
    () => INITIAL_SNAPSHOT,
  );
}
