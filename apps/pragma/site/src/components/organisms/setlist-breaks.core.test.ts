import { describe, expect, it } from 'vitest';
import {
  groupBreaksBySongsBefore,
  interleaveBreaks,
  isBreakLine,
  isSubmitKey,
  listItemIds,
  type PlacedBreak,
  recountSongsBefore,
  restoreBreakPlacement,
  selectBreakTitle,
  selectChangedLabel,
  toOrderRows,
  withdrawSongFromBreaks,
} from './setlist-breaks.core';

const OPENING: PlacedBreak = { id: 'p0', label: '', position: 0, songsBefore: 0 };
const INTERMISSION: PlacedBreak = { id: 'p1', label: 'Intermission', position: 3, songsBefore: 2 };
const TUNING: PlacedBreak = { id: 'p2', label: 'Tune', position: 2, songsBefore: 2 };

// @FollowsBlueprint test-pure-unit
describe('groupBreaksBySongsBefore', () => {
  it('groups breaks by the songs played before them, in position order', () => {
    const grouped = groupBreaksBySongsBefore([INTERMISSION, OPENING, TUNING]);

    expect(Object.fromEntries(grouped)).toEqual({ 0: [OPENING], 2: [TUNING, INTERMISSION] });
  });
});

describe('interleaveBreaks', () => {
  it('puts each break before the song that follows it', () => {
    const lines = interleaveBreaks(['a', 'b', 'c'], [INTERMISSION, OPENING]);

    expect(lines).toEqual([
      { kind: 'break', setlistBreak: OPENING },
      { kind: 'song', entry: 'a', songIndex: 0 },
      { kind: 'song', entry: 'b', songIndex: 1 },
      { kind: 'break', setlistBreak: INTERMISSION },
      { kind: 'song', entry: 'c', songIndex: 2 },
    ]);
  });

  it('keeps a break after the last song, even when the songs it counted are gone', () => {
    const lines = interleaveBreaks(['a'], [INTERMISSION, { ...OPENING, songsBefore: 1 }]);

    expect(lines.map((line) => line.kind)).toEqual(['song', 'break', 'break']);
  });
});

describe('recountSongsBefore', () => {
  it('places each break where the new order puts it', () => {
    const moved = recountSongsBefore([OPENING, INTERMISSION], ['a', 'p1', 'b', 'p0']);

    expect(moved).toEqual([
      { ...OPENING, songsBefore: 2, position: 3 },
      { ...INTERMISSION, songsBefore: 1, position: 1 },
    ]);
  });

  it('leaves a break the order does not name untouched', () => {
    expect(recountSongsBefore([OPENING], ['a', 'b'])).toEqual([OPENING]);
  });
});

describe('withdrawSongFromBreaks', () => {
  it('pulls back every break played after the removed song, and leaves the others', () => {
    const left = withdrawSongFromBreaks([OPENING, INTERMISSION], 1);

    expect(left).toEqual([OPENING, { ...INTERMISSION, songsBefore: 1 }]);
  });

  it('leaves a break that sits right before the removed song', () => {
    expect(withdrawSongFromBreaks([INTERMISSION], 2)).toEqual([INTERMISSION]);
  });
});

describe('break labels', () => {
  it('titles an unnamed break with the fallback', () => {
    expect(selectBreakTitle('', 'Break')).toBe('Break');
    expect(selectBreakTitle('Intermission', 'Break')).toBe('Intermission');
  });

  it('answers the trimmed draft only when it differs from the saved label', () => {
    expect(selectChangedLabel(' Intermission ', 'Intermission')).toBeNull();
    expect(selectChangedLabel(' Tune ', 'Intermission')).toBe('Tune');
  });

  it('submits on Enter only', () => {
    expect(isSubmitKey('Enter')).toBe(true);
    expect(isSubmitKey('a')).toBe(false);
  });

  it('tells a break line from a song line', () => {
    expect(isBreakLine({ kind: 'break' })).toBe(true);
    expect(isBreakLine({ kind: 'song' })).toBe(false);
  });
});

describe('toOrderRows', () => {
  it('names each song from the catalogue, each break by its label, and an unknown song by its id', () => {
    const rows = toOrderRows(
      interleaveBreaks(
        [
          { id: 'e1', songId: 'song-dreams', energy: 4 },
          { id: 'e2', songId: '0123456789abcdef', energy: null },
        ],
        [
          { ...INTERMISSION, songsBefore: 1 },
          { ...OPENING, label: '', songsBefore: 2 },
        ],
      ),
      { 'song-dreams': { title: 'Dreams', durationSeconds: 257, baseEnergy: 6 } },
      'Break',
    );

    expect(rows).toEqual([
      {
        id: 'e1',
        kind: 'song',
        title: 'Dreams',
        durationSeconds: 257,
        entryEnergy: 4,
        songEnergy: 6,
      },
      {
        id: 'p1',
        kind: 'break',
        title: 'Intermission',
        durationSeconds: null,
        entryEnergy: null,
        songEnergy: null,
      },
      {
        id: 'e2',
        kind: 'song',
        title: '01234567',
        durationSeconds: null,
        entryEnergy: null,
        songEnergy: null,
      },
      {
        id: 'p0',
        kind: 'break',
        title: 'Break',
        durationSeconds: null,
        entryEnergy: null,
        songEnergy: null,
      },
    ]);
  });
});

describe('listItemIds', () => {
  it('lists the songs and the breaks in the order they are played', () => {
    expect(listItemIds(['a', 'b'], [INTERMISSION, { ...OPENING, songsBefore: 1 }])).toEqual([
      'a',
      'p0',
      'b',
      'p1',
    ]);
  });
});

describe('restoreBreakPlacement', () => {
  const RESTORED_SONG_INDEX = 1;

  it('puts a break the removal moved back where it stood before the removal', () => {
    const afterRemoval = { ...INTERMISSION, songsBefore: 1 };

    expect(restoreBreakPlacement([afterRemoval], [INTERMISSION], RESTORED_SONG_INDEX)).toEqual([
      INTERMISSION,
    ]);
  });

  it('moves a break added after the removed song one song later, and keeps one added before it', () => {
    const addedAfter = { ...TUNING, songsBefore: 2 };
    const addedBefore = { ...OPENING, songsBefore: 1 };

    expect(
      restoreBreakPlacement([addedBefore, addedAfter], [INTERMISSION], RESTORED_SONG_INDEX),
    ).toEqual([addedBefore, { ...addedAfter, songsBefore: 3 }]);
  });

  it('drops a remembered break deleted before the undo', () => {
    expect(restoreBreakPlacement([], [INTERMISSION], RESTORED_SONG_INDEX)).toEqual([]);
  });
});
