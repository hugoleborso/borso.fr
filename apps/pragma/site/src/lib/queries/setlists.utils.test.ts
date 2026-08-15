import { describe, expect, it } from 'vitest';
import {
  appendOptimisticEntry,
  applyEntryPatch,
  type EntriesCache,
  type MinimalSetlistEntry,
  removeEntryById,
  reorderEntriesByIds,
  toEntryPatch,
} from './setlists.utils';

function makeEntry(overrides: Partial<MinimalSetlistEntry>): MinimalSetlistEntry {
  return {
    id: 'entry-1',
    songId: 'song-1',
    position: 0,
    energy: null,
    keyOverride: null,
    capo: null,
    notes: '',
    lineupOverride: null,
    ...overrides,
  };
}

// @FollowsBlueprint test-pure-unit
describe('applyEntryPatch', () => {
  it('merges the patch into the matching entry', () => {
    const cache: EntriesCache = {
      entries: [
        makeEntry({ id: 'a', notes: 'before' }),
        makeEntry({ id: 'b', notes: 'untouched' }),
      ],
    };
    const next = applyEntryPatch(cache, 'a', { notes: 'after', energy: 7 });
    expect(next.entries[0]).toMatchObject({ id: 'a', notes: 'after', energy: 7 });
    expect(next.entries[1]).toMatchObject({ id: 'b', notes: 'untouched' });
  });

  it('returns a new cache with no entry changed when the id is missing', () => {
    const cache: EntriesCache = {
      entries: [makeEntry({ id: 'a', notes: 'before' })],
    };
    const next = applyEntryPatch(cache, 'missing', { notes: 'after' });
    expect(next.entries).toEqual(cache.entries);
  });
});

describe('removeEntryById', () => {
  it('filters out the matching entry', () => {
    const cache: EntriesCache = {
      entries: [makeEntry({ id: 'a' }), makeEntry({ id: 'b' })],
    };
    expect(removeEntryById(cache, 'a').entries).toEqual([makeEntry({ id: 'b' })]);
  });

  it('returns the same entries when the id is missing', () => {
    const cache: EntriesCache = { entries: [makeEntry({ id: 'a' })] };
    expect(removeEntryById(cache, 'missing').entries).toEqual([makeEntry({ id: 'a' })]);
  });
});

describe('reorderEntriesByIds', () => {
  it('reorders the cached entries to match the provided id list and rewrites positions', () => {
    const cache: EntriesCache = {
      entries: [
        makeEntry({ id: 'a', position: 0 }),
        makeEntry({ id: 'b', position: 1 }),
        makeEntry({ id: 'c', position: 2 }),
      ],
    };
    const next = reorderEntriesByIds(cache, ['c', 'a', 'b']);
    expect(next.entries.map((entry) => entry.id)).toEqual(['c', 'a', 'b']);
    expect(next.entries.map((entry) => entry.position)).toEqual([0, 1, 2]);
  });

  it('skips ids that are missing from the cache', () => {
    const cache: EntriesCache = {
      entries: [makeEntry({ id: 'a' }), makeEntry({ id: 'b' })],
    };
    const next = reorderEntriesByIds(cache, ['b', 'ghost', 'a']);
    expect(next.entries.map((entry) => entry.id)).toEqual(['b', 'a']);
  });

  it('skips undefined slots in the id list', () => {
    const cache: EntriesCache = { entries: [makeEntry({ id: 'a' })] };
    const sparse: string[] = [];
    sparse[1] = 'a';
    const next = reorderEntriesByIds(cache, sparse);
    expect(next.entries.map((entry) => entry.id)).toEqual(['a']);
  });
});

describe('appendOptimisticEntry', () => {
  it('appends a placeholder entry with the next position', () => {
    const cache: EntriesCache = {
      entries: [makeEntry({ id: 'a', position: 0 })],
    };
    const next = appendOptimisticEntry(cache, { id: 'tmp', songId: 'song-2' });
    expect(next.entries).toHaveLength(2);
    expect(next.entries[1]).toMatchObject({
      id: 'tmp',
      songId: 'song-2',
      position: 1,
      energy: null,
      keyOverride: null,
      capo: null,
      notes: '',
      lineupOverride: null,
    });
  });

  it('uses the provided optional fields when given', () => {
    const cache: EntriesCache = { entries: [] };
    const next = appendOptimisticEntry(cache, {
      id: 'tmp',
      songId: 'song-2',
      energy: 5,
      keyOverride: 'Am',
      capo: 2,
      notes: 'rough',
      lineupOverride: { 'member-1': ['instrument-1'] },
    });
    expect(next.entries[0]).toMatchObject({
      id: 'tmp',
      songId: 'song-2',
      position: 0,
      energy: 5,
      keyOverride: 'Am',
      capo: 2,
      notes: 'rough',
      lineupOverride: { 'member-1': ['instrument-1'] },
    });
  });

  it('lifts a lineup written in the older single-instrument shape into lists', () => {
    const next = appendOptimisticEntry(
      { entries: [] },
      { id: 'tmp', songId: 'song-2', lineupOverride: { 'member-1': 'instrument-1' } },
    );
    expect(next.entries[0]?.lineupOverride).toEqual({ 'member-1': ['instrument-1'] });
  });
});

describe('toEntryPatch', () => {
  it('passes a patch without a lineup through untouched', () => {
    expect(toEntryPatch({ energy: 4, notes: 'x' })).toEqual({ energy: 4, notes: 'x' });
  });

  it('normalises the lineup a mutation carries', () => {
    expect(toEntryPatch({ lineupOverride: { 'member-1': 'instrument-1' } })).toEqual({
      lineupOverride: { 'member-1': ['instrument-1'] },
    });
  });

  it('keeps a cleared override as cleared', () => {
    expect(toEntryPatch({ lineupOverride: null })).toEqual({ lineupOverride: null });
  });
});
