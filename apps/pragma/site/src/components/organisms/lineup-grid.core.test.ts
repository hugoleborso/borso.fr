import { describe, expect, it } from 'vitest';
import { buildLineupGrid, hasLineupChanges, type LineupGridInput } from './lineup-grid.core';

const ANNA = { id: 'anna', firstName: 'Anna', color: '#e07a5f' };
const BRUNO = { id: 'bruno', firstName: 'Bruno', color: '#3d8b8b' };
const CLARA = { id: 'clara', firstName: 'Clara', color: '#7a4a8b' };
const GUITAR = {
  id: 'guitar',
  name: 'Guitar',
  icon: 'guitar',
  position: 2,
  family: 'harmonic',
} as const;
const VOICE = {
  id: 'voice',
  name: 'Voice',
  icon: 'mic-vocal',
  position: 1,
  family: 'vocal',
} as const;
const BASS = { id: 'bass', name: 'Bass', icon: 'bass', position: 2, family: 'harmonic' } as const;
const PIANO = {
  id: 'piano',
  name: 'Piano',
  icon: 'piano',
  position: 3,
  family: 'harmonic',
} as const;
const CHOIR = { id: 'choir', name: 'Choir', icon: 'choir', position: 1, family: 'vocal' } as const;
const GUITAR_GLYPH = { instrumentId: 'guitar', name: 'Guitar', glyph: 'guitar' } as const;

const INPUT: LineupGridInput = {
  members: [ANNA, BRUNO, CLARA],
  instruments: [GUITAR, BASS, VOICE, PIANO, CHOIR],
  songsById: {
    one: { title: 'One', defaultLineup: { anna: ['guitar', 'voice'], bruno: ['bass'] } },
    two: { title: 'Two', defaultLineup: { anna: ['voice', 'guitar'], bruno: ['bass'] } },
    three: { title: 'Three', defaultLineup: { anna: ['guitar'], bruno: ['bass'] } },
  },
  entries: [
    { id: 'entry-1', songId: 'one', lineupOverride: null },
    { id: 'entry-2', songId: 'two', lineupOverride: { bruno: [] } },
    { id: 'entry-3', songId: 'three', lineupOverride: null },
    { id: 'entry-4', songId: 'lost', lineupOverride: null },
  ],
};

describe('buildLineupGrid', () => {
  it('keeps a column only for the members who play in the setlist, in the order given', () => {
    const grid = buildLineupGrid(INPUT);
    expect(grid.columns).toEqual([
      { memberId: 'anna', firstName: 'Anna', color: '#e07a5f' },
      { memberId: 'bruno', firstName: 'Bruno', color: '#3d8b8b' },
    ]);
  });

  it('numbers the rows and names their song, empty when the catalogue lost it', () => {
    const grid = buildLineupGrid(INPUT);
    expect(grid.rows.map((row) => [row.entryId, row.position, row.title])).toEqual([
      ['entry-1', 1, 'One'],
      ['entry-2', 2, 'Two'],
      ['entry-3', 3, 'Three'],
      ['entry-4', 4, ''],
    ]);
  });

  it('orders the glyphs by instrument position, then by name', () => {
    const grid = buildLineupGrid(INPUT);
    expect(grid.rows[0]?.cells[0]?.glyphs).toEqual([
      { instrumentId: 'voice', name: 'Voice', glyph: 'micVocal' },
      { instrumentId: 'guitar', name: 'Guitar', glyph: 'guitar' },
    ]);
    const sameSlot = buildLineupGrid({
      ...INPUT,
      songsById: { one: { title: 'One', defaultLineup: { anna: ['guitar', 'bass'] } } },
      entries: [{ id: 'entry-1', songId: 'one', lineupOverride: null }],
    });
    expect(sameSlot.rows[0]?.cells[0]?.glyphs.map((glyph) => glyph.name)).toEqual([
      'Bass',
      'Guitar',
    ]);
  });

  it('marks a played cell whose hand instruments differ from the entry before, and only that', () => {
    const grid = buildLineupGrid(INPUT);
    const marks = grid.rows.map((row) => row.cells.map((cell) => [cell.isPlaying, cell.isChanged]));
    expect(marks).toEqual([
      [
        [true, false],
        [true, false],
      ],
      [
        [true, false],
        [false, false],
      ],
      [
        [true, false],
        [true, true],
      ],
      [
        [false, false],
        [false, false],
      ],
    ]);
  });

  it('carries the member on every cell so a cell can be named and coloured', () => {
    const grid = buildLineupGrid(INPUT);
    expect(grid.rows[1]?.cells[1]).toMatchObject({
      memberId: 'bruno',
      firstName: 'Bruno',
      color: '#3d8b8b',
      glyphs: [],
      previousGlyphs: [],
    });
  });

  it('marks a member who swaps one of two instruments for another', () => {
    const grid = buildLineupGrid({
      ...INPUT,
      songsById: {
        one: { title: 'One', defaultLineup: { anna: ['guitar', 'voice'] } },
        two: { title: 'Two', defaultLineup: { anna: ['guitar', 'bass'] } },
      },
      entries: [
        { id: 'entry-1', songId: 'one', lineupOverride: null },
        { id: 'entry-2', songId: 'two', lineupOverride: null },
      ],
    });
    expect(grid.rows[1]?.cells[0]).toMatchObject({
      isChanged: true,
      previousGlyphs: [GUITAR_GLYPH],
    });
  });

  it('starts the first row with full cells and no change, no badge and no compaction', () => {
    const [first] = buildLineupGrid(INPUT).rows;
    expect(first).toMatchObject({ changeCount: 0, isCompact: false });
    expect(
      first?.cells.map((cell) => [cell.isChanged, cell.joinsPrevious, cell.previousGlyphs]),
    ).toEqual([
      [false, false, []],
      [false, false, []],
    ]);
  });

  it('ignores a Chœurs added then dropped, so the lane stays one run and the rows are compact', () => {
    const grid = buildLineupGrid({
      ...INPUT,
      songsById: {
        one: { title: 'One', defaultLineup: { anna: ['guitar'] } },
        two: { title: 'Two', defaultLineup: { anna: ['guitar', 'choir'] } },
      },
      entries: [
        { id: 'entry-1', songId: 'one', lineupOverride: null },
        { id: 'entry-2', songId: 'two', lineupOverride: null },
        { id: 'entry-3', songId: 'one', lineupOverride: null },
      ],
    });
    expect(
      grid.rows.map((row) => [
        row.changeCount,
        row.isCompact,
        row.cells[0]?.isChanged,
        row.cells[0]?.joinsPrevious,
        row.cells[0]?.joinsNext,
      ]),
    ).toEqual([
      [0, false, false, false, true],
      [0, true, false, true, true],
      [0, true, false, true, false],
    ]);
  });

  it('joins a member who only sings, from Chœurs to Chant', () => {
    const grid = buildLineupGrid({
      ...INPUT,
      songsById: {
        one: { title: 'One', defaultLineup: { clara: ['choir'] } },
        two: { title: 'Two', defaultLineup: { clara: ['voice'] } },
      },
      entries: [
        { id: 'entry-1', songId: 'one', lineupOverride: null },
        { id: 'entry-2', songId: 'two', lineupOverride: null },
      ],
    });
    expect(grid.rows[0]?.cells[0]?.joinsNext).toBe(true);
    expect(grid.rows[1]?.cells[0]).toMatchObject({
      isChanged: false,
      joinsPrevious: true,
      previousGlyphs: [],
    });
  });

  it('marks both cells of a Bass and Piano swap with what each member held before', () => {
    const grid = buildLineupGrid({
      ...INPUT,
      songsById: {
        one: { title: 'One', defaultLineup: { anna: ['bass', 'voice'], bruno: ['piano'] } },
        two: { title: 'Two', defaultLineup: { anna: ['piano', 'voice'], bruno: ['bass'] } },
      },
      entries: [
        { id: 'entry-1', songId: 'one', lineupOverride: null },
        { id: 'entry-2', songId: 'two', lineupOverride: null },
      ],
    });
    const [, second] = grid.rows;
    expect(second).toMatchObject({ changeCount: 2, isCompact: false });
    expect(
      second?.cells.map((cell) => [
        cell.isChanged,
        cell.joinsPrevious,
        cell.previousGlyphs.map((glyph) => glyph.name),
      ]),
    ).toEqual([
      [true, false, ['Bass']],
      [true, false, ['Piano']],
    ]);
    expect(grid.rows[0]?.cells.map((cell) => cell.joinsNext)).toEqual([false, false]);
  });

  it('counts putting a hand instrument down to only sing as a change', () => {
    const grid = buildLineupGrid({
      ...INPUT,
      songsById: {
        one: { title: 'One', defaultLineup: { anna: ['guitar', 'choir'] } },
        two: { title: 'Two', defaultLineup: { anna: ['choir'] } },
      },
      entries: [
        { id: 'entry-1', songId: 'one', lineupOverride: null },
        { id: 'entry-2', songId: 'two', lineupOverride: null },
      ],
    });
    expect(grid.rows[1]?.cells[0]).toMatchObject({
      isPlaying: true,
      isChanged: true,
      joinsPrevious: false,
      previousGlyphs: [GUITAR_GLYPH],
    });
  });

  it('breaks a run where the member sits out, and a voice-only return is no change', () => {
    const grid = buildLineupGrid({
      ...INPUT,
      songsById: {
        hands: { title: 'Hands', defaultLineup: { anna: ['guitar'] } },
        rest: { title: 'Rest', defaultLineup: { bruno: ['bass'] } },
        sings: { title: 'Sings', defaultLineup: { anna: ['voice'] } },
      },
      entries: [
        { id: 'entry-1', songId: 'hands', lineupOverride: null },
        { id: 'entry-2', songId: 'hands', lineupOverride: null },
        { id: 'entry-3', songId: 'rest', lineupOverride: null },
        { id: 'entry-4', songId: 'sings', lineupOverride: null },
        { id: 'entry-5', songId: 'rest', lineupOverride: null },
      ],
    });
    expect(
      grid.rows.map((row) => [
        row.cells[0]?.isChanged,
        row.cells[0]?.joinsPrevious,
        row.cells[0]?.joinsNext,
      ]),
    ).toEqual([
      [false, false, true],
      [false, true, false],
      [false, false, false],
      [false, false, false],
      [false, false, false],
    ]);
  });

  it('returns no column and no row for an empty setlist', () => {
    expect(buildLineupGrid({ ...INPUT, entries: [] })).toEqual({ columns: [], rows: [] });
  });
});

describe('hasLineupChanges', () => {
  it('is true only for a row with at least one changed cell', () => {
    const rows = buildLineupGrid(INPUT).rows;
    expect(rows.map(hasLineupChanges)).toEqual([false, false, true, false]);
  });
});
