/**
 * Pure cache transforms for the setlist entries query.
 *
 * Each mutation in `setlists.ts` snapshots the current `{ entries }`
 * cache, applies one of these helpers in `onMutate`, and rolls back to
 * the snapshot in `onError`. The shape is generic in the entry type so
 * the helpers don't pin themselves to the BE projection — the queries
 * file passes the inferred shape through `setQueryData<EntriesCache>`.
 */

export interface MinimalSetlistEntry {
  readonly id: string;
  readonly songId: string;
  readonly position: number;
  readonly energy: number | null;
  readonly keyOverride: string | null;
  readonly capo: number | null;
  readonly notes: string;
  readonly lineupOverride: Record<string, string | null> | null;
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
    entries: cache.entries.map((entry) =>
      entry.id === entryId ? { ...entry, ...patch } : entry,
    ),
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
  for (let index = 0; index < entryIds.length; index += 1) {
    const id = entryIds[index];
    if (id === undefined) continue;
    const found = byId.get(id);
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
  readonly lineupOverride?: Record<string, string | null> | null;
}

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
    lineupOverride: input.lineupOverride ?? null,
  };
  return { entries: [...cache.entries, placeholder] };
}
