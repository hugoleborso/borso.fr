/**
 * Tiny one-shot async resource — `useSyncExternalStore` style. The
 * thunk runs once per key; concurrent consumers share the result.
 *
 * Snapshot stability: the entry caches its `ResourceState`-shaped
 * snapshot, and only rebuilds it when `load()` finishes or
 * `invalidateResource()` is called. The hook's `getSnapshot` callback
 * returns the same object reference between mutations — without this,
 * React detects an infinite loop ("The result of getSnapshot should be
 * cached") and unmounts the tree.
 *
 * Storage is `unknown`-typed because the registry holds heterogeneous
 * values. Narrowing back to `T` happens through a type-predicate
 * trampoline that never inspects the value — callers are responsible
 * for handing in a thunk that already returns a `T`-typed result
 * (api/client.ts parses every server response through Zod before
 * resolving).
 */

import { useSyncExternalStore } from 'react';

interface RawSnapshot {
  readonly value: unknown;
  readonly error: Error | null;
}

interface ResourceEntry {
  snapshot: RawSnapshot;
  inFlight: boolean;
  listeners: Set<() => void>;
}

const INITIAL_SNAPSHOT: RawSnapshot = { value: null, error: null };
const registry = new Map<string, ResourceEntry>();

function ensureEntry(key: string): ResourceEntry {
  const existing = registry.get(key);
  if (existing !== undefined) return existing;
  const entry: ResourceEntry = {
    snapshot: INITIAL_SNAPSHOT,
    inFlight: false,
    listeners: new Set(),
  };
  registry.set(key, entry);
  return entry;
}

function notify(entry: ResourceEntry): void {
  for (const listener of entry.listeners) listener();
}

async function load<T>(key: string, thunk: () => Promise<T>): Promise<void> {
  const entry = ensureEntry(key);
  if (entry.inFlight) return;
  entry.inFlight = true;
  try {
    const value = await thunk();
    entry.snapshot = { value, error: null };
  } catch (error) {
    entry.snapshot = {
      value: entry.snapshot.value,
      error: error instanceof Error ? error : new Error('unknown error'),
    };
  } finally {
    entry.inFlight = false;
    notify(entry);
  }
}

function trustsThunkResult<T>(_value: unknown): _value is T {
  return true;
}

function narrow<T>(value: unknown): T | null {
  if (value === null) return null;
  if (trustsThunkResult<T>(value)) return value;
  return null;
}

export interface ResourceState<T> {
  readonly value: T | null;
  readonly error: Error | null;
}

export function useResource<T>(key: string, thunk: () => Promise<T>): ResourceState<T> {
  const entry = ensureEntry(key);
  const rawSnapshot = useSyncExternalStore(
    (listener) => {
      entry.listeners.add(listener);
      if (entry.snapshot === INITIAL_SNAPSHOT) {
        void load(key, thunk);
      }
      return () => {
        entry.listeners.delete(listener);
      };
    },
    () => entry.snapshot,
    () => INITIAL_SNAPSHOT,
  );
  return { value: narrow<T>(rawSnapshot.value), error: rawSnapshot.error };
}

export function invalidateResource(key: string): void {
  const entry = registry.get(key);
  if (entry === undefined) return;
  entry.snapshot = INITIAL_SNAPSHOT;
  notify(entry);
}
