/**
 * Polls the standings endpoint every 2 s and yields the latest snapshot.
 *
 * Uses a `useSyncExternalStore` pattern over a tiny shared cache, so
 * (a) two consumers on the same edition share one HTTP call, and
 * (b) component code stays free of `useEffect`.
 */

import { useSyncExternalStore } from 'react';
import { apiClient } from '../api/client';
import type { StandingsDto } from '../domain/types';

const POLL_INTERVAL_MS = 2_000;

interface CacheEntry {
  standings: StandingsDto | null;
  error: Error | null;
  listeners: Set<() => void>;
  intervalId: ReturnType<typeof setInterval> | null;
}

const cache = new Map<string, CacheEntry>();

function ensureEntry(editionSlug: string): CacheEntry {
  const existing = cache.get(editionSlug);
  if (existing !== undefined) return existing;
  const entry: CacheEntry = { standings: null, error: null, listeners: new Set(), intervalId: null };
  cache.set(editionSlug, entry);
  return entry;
}

async function fetchOnce(editionSlug: string): Promise<void> {
  const entry = ensureEntry(editionSlug);
  try {
    const { standings } = await apiClient.getStandings(editionSlug);
    entry.standings = standings;
    entry.error = null;
  } catch (error) {
    entry.error = error instanceof Error ? error : new Error('unknown error');
  }
  for (const listener of entry.listeners) listener();
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

export interface StandingsState {
  readonly standings: StandingsDto | null;
  readonly error: Error | null;
}

export function useStandings(editionSlug: string): StandingsState {
  const entry = ensureEntry(editionSlug);
  return useSyncExternalStore(
    (listener) => subscribe(editionSlug, listener),
    () => ({ standings: entry.standings, error: entry.error }),
    () => ({ standings: null, error: null }),
  );
}
