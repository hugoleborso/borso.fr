import { describe, expect, it } from 'vitest';
import { buildLineupGrid, type LineupGridInput } from './lineup-grid.core';

const ANNA = { id: 'anna', firstName: 'Anna', color: '#e07a5f' };
const BRUNO = { id: 'bruno', firstName: 'Bruno', color: '#3d8b8b' };
const CLARA = { id: 'clara', firstName: 'Clara', color: '#7a4a8b' };
const GUITAR = { id: 'guitar', name: 'Guitar', icon: 'guitar', position: 2 } as const;
const VOICE = { id: 'voice', name: 'Voice', icon: 'mic-vocal', position: 1 } as const;
const BASS = { id: 'bass', name: 'Bass', icon: 'bass', position: 2 } as const;

const INPUT: LineupGridInput = {
  members: [ANNA, BRUNO, CLARA],
  instruments: [GUITAR, BASS, VOICE],
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

  it('marks a played cell whose instruments differ from the entry before, and only that', () => {
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
        [true, true],
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
    expect(grid.rows[1]?.cells[0]?.isChanged).toBe(true);
  });

  it('returns no column and no row for an empty setlist', () => {
    expect(buildLineupGrid({ ...INPUT, entries: [] })).toEqual({ columns: [], rows: [] });
  });
});
