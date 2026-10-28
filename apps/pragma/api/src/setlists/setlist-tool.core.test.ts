import { describe, expect, it } from 'vitest';
import {
  type CatalogueSong,
  describeSetlist,
  listNamedCandidates,
  matchEntryReference,
  nameSongs,
  type OrderedEntry,
  planEntryOrder,
  projectEntriesForTool,
  projectSetlistsWithEntries,
  projectVoteBoardForTool,
} from './setlist-tool.core';

const NAMES = {
  members: [
    { id: 'member-hugo', name: 'Hugo' },
    { id: 'member-lea', name: 'Léa' },
  ],
  instruments: [
    { id: 'instrument-drums', name: 'Batterie' },
    { id: 'instrument-guitar', name: 'Guitare' },
  ],
};
const SONGS: readonly CatalogueSong[] = [
  { id: 'song-creep', title: 'Creep', defaultLineup: { 'member-hugo': ['instrument-drums'] } },
  { id: 'song-army', title: 'Seven Nation Army', defaultLineup: {} },
];

function buildEntry(overrides: Partial<OrderedEntry>): OrderedEntry {
  return {
    id: 'entry-1',
    setlistId: 'setlist-1',
    songId: 'song-creep',
    position: 0,
    lineupOverride: null,
    energy: null,
    keyOverride: null,
    capo: null,
    notes: '',
    ...overrides,
  };
}

const CREEP_ENTRY = buildEntry({});
const ARMY_ENTRY = buildEntry({
  id: 'entry-2',
  songId: 'song-army',
  position: 1,
  lineupOverride: { 'member-lea': ['instrument-guitar'] },
  keyOverride: 'D',
  capo: 2,
  energy: 4,
  notes: 'Loud',
});

// @FollowsBlueprint test-pure-unit
describe('listNamedCandidates', () => {
  it('labels each setlist with its name', () => {
    expect(listNamedCandidates([{ id: 'setlist-1', name: 'Saturday' }])).toEqual([
      { id: 'setlist-1', label: 'Saturday' },
    ]);
  });
});

describe('describeSetlist', () => {
  it('reads a setlist without a stored status as locked', () => {
    expect(describeSetlist({ id: 'setlist-1', name: 'Saturday', status: null })).toEqual({
      id: 'setlist-1',
      name: 'Saturday',
      status: 'locked',
    });
    expect(describeSetlist({ id: 'setlist-1', name: 'Saturday', status: 'voting' }).status).toBe(
      'voting',
    );
  });
});

describe('projectEntriesForTool', () => {
  it('orders the entries, numbers them from one, and names each song and who plays what', () => {
    expect(projectEntriesForTool([ARMY_ENTRY, CREEP_ENTRY], SONGS, NAMES)).toEqual([
      {
        entryId: 'entry-1',
        position: 1,
        songId: 'song-creep',
        title: 'Creep',
        energy: null,
        key: null,
        capo: null,
        notes: '',
        lineup: { Hugo: 'Batterie' },
      },
      {
        entryId: 'entry-2',
        position: 2,
        songId: 'song-army',
        title: 'Seven Nation Army',
        energy: 4,
        key: 'D',
        capo: 2,
        notes: 'Loud',
        lineup: { Léa: 'Guitare' },
      },
    ]);
  });

  it('keeps the id of a song that is no longer in the catalogue', () => {
    const [entry] = projectEntriesForTool([buildEntry({ songId: 'song-gone' })], SONGS, NAMES);
    expect(entry).toMatchObject({ title: 'song-gone', lineup: {} });
  });
});

describe('projectSetlistsWithEntries', () => {
  it('gives each setlist only its own entries', () => {
    const otherEntry = buildEntry({ id: 'entry-3', setlistId: 'setlist-2' });
    expect(
      projectSetlistsWithEntries(
        [
          { id: 'setlist-1', name: 'Saturday', status: null },
          { id: 'setlist-2', name: 'Encore', status: 'voting' },
        ],
        [CREEP_ENTRY, otherEntry],
        SONGS,
        NAMES,
      ).map((setlist) => [
        setlist.name,
        setlist.status,
        setlist.entries.map((entry) => entry.entryId),
      ]),
    ).toEqual([
      ['Saturday', 'locked', ['entry-1']],
      ['Encore', 'voting', ['entry-3']],
    ]);
  });
});

describe('matchEntryReference', () => {
  it('finds an entry by its own id, by its song id, or by the song title', () => {
    const setlistEntries = [CREEP_ENTRY, ARMY_ENTRY];
    expect(matchEntryReference(setlistEntries, SONGS, 'entry-2')).toEqual({
      kind: 'found',
      id: 'entry-2',
    });
    expect(matchEntryReference(setlistEntries, SONGS, 'song-army')).toEqual({
      kind: 'found',
      id: 'entry-2',
    });
    expect(matchEntryReference(setlistEntries, SONGS, 'creep')).toEqual({
      kind: 'found',
      id: 'entry-1',
    });
    expect(matchEntryReference(setlistEntries, SONGS, 'Karma')).toEqual({ kind: 'missing' });
  });

  it('lists both entries of a song played twice', () => {
    const encore = buildEntry({ id: 'entry-9', position: 4 });
    const candidates = [
      { id: 'entry-1', label: 'Creep', hint: '#1' },
      { id: 'entry-9', label: 'Creep', hint: '#5' },
    ];
    expect(matchEntryReference([CREEP_ENTRY, encore], SONGS, 'song-creep')).toEqual({
      kind: 'ambiguous',
      candidates,
    });
    expect(matchEntryReference([CREEP_ENTRY, encore], SONGS, 'Creep')).toEqual({
      kind: 'ambiguous',
      candidates,
    });
  });
});

describe('planEntryOrder', () => {
  const current = ['a', 'b', 'c', 'd'];

  it('answers nothing when no way of reordering was given', () => {
    expect(planEntryOrder(current, { kind: 'none' })).toBeNull();
  });

  it('takes a whole order as given', () => {
    expect(planEntryOrder(current, { kind: 'order', entryIds: ['d', 'c'] })).toEqual(['d', 'c']);
  });

  it('moves one entry to a position counted from one', () => {
    expect(planEntryOrder(current, { kind: 'move', entryId: 'd', position: 1 })).toEqual([
      'd',
      'a',
      'b',
      'c',
    ]);
    expect(planEntryOrder(current, { kind: 'move', entryId: 'a', position: 3 })).toEqual([
      'b',
      'c',
      'a',
      'd',
    ]);
  });

  it('keeps a position past either end inside the setlist', () => {
    expect(planEntryOrder(current, { kind: 'move', entryId: 'b', position: 9 })).toEqual([
      'a',
      'c',
      'd',
      'b',
    ]);
    expect(planEntryOrder(current, { kind: 'move', entryId: 'c', position: 0 })).toEqual([
      'c',
      'a',
      'b',
      'd',
    ]);
  });

  it('swaps two entries and leaves the others in place', () => {
    expect(planEntryOrder(current, { kind: 'swap', entryIds: ['b', 'd'] })).toEqual([
      'a',
      'd',
      'c',
      'b',
    ]);
  });
});

describe('nameSongs', () => {
  it('names each song, keeping the id of one that is gone', () => {
    expect(nameSongs(['song-army', 'song-gone'], SONGS)).toEqual([
      'Seven Nation Army',
      'song-gone',
    ]);
  });
});

describe('projectVoteBoardForTool', () => {
  const tally = {
    songId: 'song-creep',
    points: 3,
    voterCount: 1,
    pointsByMember: { 'member-hugo': 3 },
  };
  const board = {
    status: 'voting',
    targetSongCount: 1,
    budget: { total: 3, spent: 3, remaining: 0 },
    tallies: [tally],
    lastScoredAt: null,
  };

  it('names the tallies and the songs closing now would keep', () => {
    expect(projectVoteBoardForTool(board, { kind: 'ok', tallies: [tally] }, SONGS)).toEqual({
      status: 'voting',
      targetSongCount: 1,
      budget: { total: 3, spent: 3, remaining: 0 },
      lastScoredAt: null,
      tallies: [{ song: 'Creep', songId: 'song-creep', points: 3, voters: 1 }],
      proposal: ['Creep'],
    });
  });

  it('leaves the proposal out when the vote cannot close', () => {
    expect(projectVoteBoardForTool(board, { kind: 'no-votes' }, SONGS)).not.toHaveProperty(
      'proposal',
    );
  });
});
