import { describe, expect, it } from 'vitest';
import {
  describeEntryLineup,
  indexLineupChangesTonight,
  type EntryLineupInput,
  listLineupChangesTonight,
  toggleTonightInstrument,
} from './entry-lineup-change.core';

const INPUT: EntryLineupInput = {
  songDefaultLineup: { anna: ['guitar'], bruno: ['bass', 'voice'] },
  lineupOverride: { anna: ['voice'], clara: [] },
  members: [
    { id: 'anna', firstName: 'Anna', color: '#e07a5f' },
    { id: 'bruno', firstName: 'Bruno', color: '#3d8b8b' },
    { id: 'clara', firstName: 'Clara', color: '#7a4a8b' },
  ],
  instruments: [
    { id: 'voice', name: 'Voice' },
    { id: 'guitar', name: 'Guitar' },
    { id: 'bass', name: 'Bass' },
  ],
};

describe('describeEntryLineup', () => {
  it('gives every member tonight’s instruments and whether they differ from the song', () => {
    expect(describeEntryLineup(INPUT)).toEqual([
      {
        memberId: 'anna',
        firstName: 'Anna',
        color: '#e07a5f',
        heldInstrumentIds: ['voice'],
        heldInstrumentNames: ['Voice'],
        isChangedTonight: true,
      },
      {
        memberId: 'bruno',
        firstName: 'Bruno',
        color: '#3d8b8b',
        heldInstrumentIds: ['bass', 'voice'],
        heldInstrumentNames: ['Voice', 'Bass'],
        isChangedTonight: false,
      },
      {
        memberId: 'clara',
        firstName: 'Clara',
        color: '#7a4a8b',
        heldInstrumentIds: [],
        heldInstrumentNames: [],
        isChangedTonight: false,
      },
    ]);
  });

  it('treats the same instruments in another order as no change', () => {
    const rows = describeEntryLineup({ ...INPUT, lineupOverride: { bruno: ['voice', 'bass'] } });
    expect(rows.map((row) => row.isChangedTonight)).toEqual([false, false, false]);
  });

  it('counts a member who sits out tonight as a change', () => {
    const rows = describeEntryLineup({ ...INPUT, lineupOverride: { bruno: ['bass'] } });
    expect(rows.map((row) => row.isChangedTonight)).toEqual([false, true, false]);
  });
});

describe('listLineupChangesTonight', () => {
  it('keeps the changed members only', () => {
    expect(listLineupChangesTonight(INPUT).map((row) => row.memberId)).toEqual(['anna']);
  });

  it('is empty with no override', () => {
    expect(listLineupChangesTonight({ ...INPUT, lineupOverride: null })).toEqual([]);
  });
});

describe('toggleTonightInstrument', () => {
  const rows = describeEntryLineup(INPUT);

  it('adds an instrument to one member and keeps the others as they are', () => {
    expect(toggleTonightInstrument(rows, 'clara', 'guitar')).toEqual({
      anna: ['voice'],
      bruno: ['bass', 'voice'],
      clara: ['guitar'],
    });
  });

  it('takes an instrument off the member who held it', () => {
    expect(toggleTonightInstrument(rows, 'bruno', 'voice')).toEqual({
      anna: ['voice'],
      bruno: ['bass'],
      clara: [],
    });
  });
});

describe('indexLineupChangesTonight', () => {
  it('keys tonight’s changes by entry, with no change for a song the catalogue lost', () => {
    const changes = indexLineupChangesTonight({
      entries: [
        { id: 'entry-1', songId: 'one', lineupOverride: { anna: ['voice'] } },
        { id: 'entry-2', songId: 'lost', lineupOverride: null },
      ],
      songsById: { one: { defaultLineup: { anna: ['guitar'] } } },
      members: INPUT.members,
      instruments: INPUT.instruments,
    });
    expect(changes['entry-1']?.map((row) => row.memberId)).toEqual(['anna']);
    expect(changes['entry-2']).toEqual([]);
  });
});
