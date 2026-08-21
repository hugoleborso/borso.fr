/** @Feature setlists */

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

export function toEntryPatch(input: EntryPatchInput): Partial<MinimalSetlistEntry> {
  const { lineupOverride, ...rest } = input;
  if (lineupOverride === undefined) return rest;
  return {
    ...rest,
    lineupOverride: lineupOverride === null ? null : normalizeLineup(lineupOverride),
  };
}

export interface MinimalSetlistSummary {
  readonly id: string;
  readonly name: string;
  readonly songCount: number;
  readonly sessionIds: readonly string[];
}

export interface SetlistsCache<TSetlist extends MinimalSetlistSummary = MinimalSetlistSummary> {
  readonly setlists: readonly TSetlist[];
}

export function appendSetlistToCache<TSetlist extends MinimalSetlistSummary>(
  cache: SetlistsCache<TSetlist>,
  setlist: TSetlist,
): SetlistsCache<TSetlist> {
  if (cache.setlists.some((existing) => existing.id === setlist.id)) return cache;
  return { setlists: [...cache.setlists, setlist] };
}

export function removeSetlistFromCache<TSetlist extends MinimalSetlistSummary>(
  cache: SetlistsCache<TSetlist>,
  setlistId: string,
): SetlistsCache<TSetlist> {
  return { setlists: cache.setlists.filter((setlist) => setlist.id !== setlistId) };
}

export function renameSetlistInCache<TSetlist extends MinimalSetlistSummary>(
  cache: SetlistsCache<TSetlist>,
  setlistId: string,
  name: string,
): SetlistsCache<TSetlist> {
  return {
    setlists: cache.setlists.map((setlist) =>
      setlist.id === setlistId ? { ...setlist, name } : setlist,
    ),
  };
}

export function applySessionLinkInCache<TSetlist extends MinimalSetlistSummary>(
  cache: SetlistsCache<TSetlist>,
  setlistId: string,
  sessionId: string,
  isLinked: boolean,
): SetlistsCache<TSetlist> {
  return {
    setlists: cache.setlists.map((setlist) => {
      if (setlist.id !== setlistId) return setlist;
      const withoutSession = setlist.sessionIds.filter((id) => id !== sessionId);
      return {
        ...setlist,
        sessionIds: isLinked ? [...withoutSession, sessionId] : withoutSession,
      };
    }),
  };
}

export function selectSetlistsNotOnSession<TSetlist extends MinimalSetlistSummary>(
  setlists: readonly TSetlist[],
  sessionId: string,
): TSetlist[] {
  return setlists.filter((setlist) => !setlist.sessionIds.includes(sessionId));
}
