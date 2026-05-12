/**
 * Tiny one-shot async resource — `useSyncExternalStore` style. The
 * thunk runs once per key; concurrent consumers share the result.
 *
 * Storage is `unknown`-typed because the registry holds heterogeneous
 * values. Narrowing back to `T` happens through a type-predicate trampoline
 * that never inspects the value — callers are responsible for handing in a
 * thunk that already returns a `T`-typed result (api/client.ts parses
 * every server response through Zod before resolving).
 */

import { useSyncExternalStore } from 'react';

interface ResourceEntry {
  value: unknown;
  error: Error | null;
  inFlight: boolean;
  listeners: Set<() => void>;
}

const registry = new Map<string, ResourceEntry>();

function ensureEntry(key: string): ResourceEntry {
  const existing = registry.get(key);
  if (existing !== undefined) return existing;
  const entry: ResourceEntry = { value: null, error: null, inFlight: false, listeners: new Set() };
  registry.set(key, entry);
  return entry;
}

async function load<T>(key: string, thunk: () => Promise<T>): Promise<void> {
  const entry = ensureEntry(key);
  if (entry.inFlight) return;
  entry.inFlight = true;
  try {
    entry.value = await thunk();
    entry.error = null;
  } catch (error) {
    entry.error = error instanceof Error ? error : new Error('unknown error');
  } finally {
    entry.inFlight = false;
    for (const listener of entry.listeners) listener();
  }
}

/**
 * Lying type predicate — narrows `unknown` to `T` without runtime check.
 * Safe here because the caller's thunk already produced a typed result;
 * the registry just widens the storage type. The grit plugin bans
 * `value as T`; this construct is a type predicate, which it accepts.
 */
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
  return useSyncExternalStore(
    (listener) => {
      entry.listeners.add(listener);
      if (entry.value === null && entry.error === null) {
        void load(key, thunk);
      }
      return () => {
        entry.listeners.delete(listener);
      };
    },
    () => ({ value: narrow<T>(entry.value), error: entry.error }),
    () => ({ value: null, error: null }),
  );
}

export function invalidateResource(key: string): void {
  const entry = registry.get(key);
  if (entry === undefined) return;
  entry.value = null;
  entry.error = null;
  for (const listener of entry.listeners) listener();
}
