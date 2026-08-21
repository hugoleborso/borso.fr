import { describe, expect, it } from 'vitest';
import {
  appendOptimisticEntry,
  appendSetlistToCache,
  applyEntryPatch,
  applySessionLinkInCache,
  type EntriesCache,
  type MinimalSetlistEntry,
  type MinimalSetlistSummary,
  removeEntryById,
  removeSetlistFromCache,
  renameSetlistInCache,
  reorderEntriesByIds,
  selectSetlistsNotOnSession,
  settleAppendedEntry,
  type SetlistsCache,
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

describe('setlist list cache transforms', () => {
  const first: MinimalSetlistSummary = {
    id: 'a',
    name: 'Set 1',
    songCount: 2,
    sessionIds: ['concert-1'],
  };
  const second: MinimalSetlistSummary = { id: 'b', name: 'Set 2', songCount: 0, sessionIds: [] };
  const cache: SetlistsCache = { setlists: [first] };

  it('appends a created setlist', () => {
    expect(appendSetlistToCache(cache, second).setlists).toEqual([first, second]);
  });

  it('appends nothing when the setlist is already listed, wherever it sits', () => {
    const twoDeep: SetlistsCache = { setlists: [second, first] };
    expect(appendSetlistToCache(twoDeep, first)).toBe(twoDeep);
  });

  it('removes a deleted setlist', () => {
    expect(removeSetlistFromCache(cache, 'a').setlists).toEqual([]);
  });

  it('leaves the list alone when the deleted setlist is not in it', () => {
    expect(removeSetlistFromCache(cache, 'z').setlists).toEqual([first]);
  });

  it('renames one setlist and only that one', () => {
    const renamed = renameSetlistInCache({ setlists: [first, second] }, 'a', 'Rappel');
    expect(renamed.setlists.map((setlist) => setlist.name)).toEqual(['Rappel', 'Set 2']);
  });

  it('records a session that now carries the setlist', () => {
    const linked = applySessionLinkInCache(cache, 'a', 'practice-1', true);
    expect(linked.setlists[0]?.sessionIds).toEqual(['concert-1', 'practice-1']);
  });

  it('records the same session once, however many times it is linked', () => {
    const linked = applySessionLinkInCache(cache, 'a', 'concert-1', true);
    expect(linked.setlists[0]?.sessionIds).toEqual(['concert-1']);
  });

  it('records a session that no longer carries the setlist', () => {
    const unlinked = applySessionLinkInCache(cache, 'a', 'concert-1', false);
    expect(unlinked.setlists[0]?.sessionIds).toEqual([]);
  });

  it('leaves the other setlists untouched when a link changes', () => {
    const linked = applySessionLinkInCache({ setlists: [first, second] }, 'b', 'concert-1', true);
    expect(linked.setlists[0]).toBe(first);
  });
});

describe('selectSetlistsNotOnSession', () => {
  const attached: MinimalSetlistSummary = {
    id: 'a',
    name: '',
    songCount: 0,
    sessionIds: ['concert-1'],
  };
  const loose: MinimalSetlistSummary = { id: 'b', name: '', songCount: 0, sessionIds: [] };

  it('offers only the setlists the session does not carry', () => {
    expect(selectSetlistsNotOnSession([attached, loose], 'concert-1')).toEqual([loose]);
  });
});

describe('settleAppendedEntry', () => {
  const persisted: MinimalSetlistEntry = {
    id: 'entry-a',
    songId: 'song-a',
    position: 0,
    energy: null,
    keyOverride: null,
    capo: null,
    notes: '',
    lineupOverride: null,
  };
  const temporary: MinimalSetlistEntry = { ...persisted, id: 'temporary-1', position: 1 };

  it('takes the identifier and the position the server answered with', () => {
    const settled = settleAppendedEntry({ entries: [persisted, temporary] }, 'temporary-1', {
      id: 'entry-b',
      position: 7,
    });

    expect(settled.entries[1]).toStrictEqual({ ...temporary, id: 'entry-b', position: 7 });
  });

  it('leaves the entries that were already settled untouched', () => {
    const settled = settleAppendedEntry({ entries: [persisted] }, 'temporary-1', {
      id: 'entry-b',
      position: 7,
    });

    expect(settled.entries).toStrictEqual([persisted]);
  });
});
