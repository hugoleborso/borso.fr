/**
 * Pure cache transforms for the setlist entries query.
 *
 * Each mutation in `setlists.ts` snapshots the current `{ entries }`
 * cache, applies one of these helpers in `onMutate`, and rolls back to
 * the snapshot in `onError`. The shape is generic in the entry type so
 * the helpers don't pin themselves to the BE projection — the queries
 * file passes the inferred shape through `setQueryData<EntriesCache>`.
 *
 * A lineup written by a mutation arrives in whichever shape the request body
 * allows — a list of instruments per member, or the single id and null the
 * older rows carry — while the cache holds what a read returns, which is
 * always lists. `toEntryPatch` and `appendOptimisticEntry` normalise on the
 * way in, so an optimistic row and a fetched row are the same shape.
 */

import { type Lineup, normalizeLineup, type StoredLineup } from '@domain/lineup.core';

export interface MinimalSetlistEntry {
  readonly id: string;
  readonly songId: string;
  readonly position: number;
  readonly energy: number | null;
  readonly keyOverride: string | null;
  readonly capo: number | null;
  readonly notes: string;
  readonly lineupOverride: Lineup | null;
}

export interface EntriesCache<TEntry extends MinimalSetlistEntry = MinimalSetlistEntry> {
  readonly entries: readonly TEntry[];
}

export function applyEntryPatch<TEntry extends MinimalSetlistEntry>(
  cache: EntriesCache<TEntry>,
  entryId: string,
  patch: Partial<TEntry>,
): EntriesCache<TEntry> {
  return {
    entries: cache.entries.map((entry) => (entry.id === entryId ? { ...entry, ...patch } : entry)),
  };
}

export function removeEntryById<TEntry extends MinimalSetlistEntry>(
  cache: EntriesCache<TEntry>,
  entryId: string,
): EntriesCache<TEntry> {
  return {
    entries: cache.entries.filter((entry) => entry.id !== entryId),
  };
}

export function reorderEntriesByIds<TEntry extends MinimalSetlistEntry>(
  cache: EntriesCache<TEntry>,
  entryIds: readonly string[],
): EntriesCache<TEntry> {
  const byId = new Map<string, TEntry>();
  for (const entry of cache.entries) byId.set(entry.id, entry);
  const reordered: TEntry[] = [];
  for (const [index, entryId] of entryIds.entries()) {
    const found = byId.get(entryId);
    if (found === undefined) continue;
    reordered.push({ ...found, position: index });
  }
  return { entries: reordered };
}

export interface OptimisticAppendInput {
  readonly id: string;
  readonly songId: string;
  readonly energy?: number | null;
  readonly keyOverride?: string | null;
  readonly capo?: number | null;
  readonly notes?: string;
  readonly lineupOverride?: StoredLineup | null;
}

// @FollowsBlueprint utils-pure-module
export function appendOptimisticEntry(
  cache: EntriesCache,
  input: OptimisticAppendInput,
): EntriesCache {
  const placeholder: MinimalSetlistEntry = {
    id: input.id,
    songId: input.songId,
    position: cache.entries.length,
    energy: input.energy ?? null,
    keyOverride: input.keyOverride ?? null,
    capo: input.capo ?? null,
    notes: input.notes ?? '',
    lineupOverride: input.lineupOverride == null ? null : normalizeLineup(input.lineupOverride),
  };
  return { entries: [...cache.entries, placeholder] };
}

export interface EntryPatchInput {
  readonly songId?: string;
  readonly energy?: number | null;
  readonly keyOverride?: string | null;
  readonly capo?: number | null;
  readonly notes?: string;
  readonly lineupOverride?: StoredLineup | null;
}

/** A mutation's variables as the cache holds them, lineup included. */
export function toEntryPatch(input: EntryPatchInput): Partial<MinimalSetlistEntry> {
  const { lineupOverride, ...rest } = input;
  if (lineupOverride === undefined) return rest;
  return {
    ...rest,
    lineupOverride: lineupOverride === null ? null : normalizeLineup(lineupOverride),
  };
}
