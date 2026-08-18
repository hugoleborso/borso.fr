import { describe, expect, it } from 'vitest';
import {
  buildSetlistIndexRows,
  type SetlistPayload,
  selectConcertsNewestFirst,
} from './setlist-index.core';

const PRACTICE = { id: 'practice-1', kind: 'practice', date: '2026-09-01T20:00:00.000Z' };
const EARLIER_CONCERT = { id: 'concert-1', kind: 'concert', date: '2026-08-01T20:00:00.000Z' };
const LATER_CONCERT = { id: 'concert-2', kind: 'concert', date: '2026-10-01T20:00:00.000Z' };

describe('selectConcertsNewestFirst', () => {
  it('keeps the concerts only', () => {
    expect(selectConcertsNewestFirst([PRACTICE, EARLIER_CONCERT])).toEqual([EARLIER_CONCERT]);
  });

  it('puts the latest concert first', () => {
    expect(selectConcertsNewestFirst([EARLIER_CONCERT, LATER_CONCERT])).toEqual([
      LATER_CONCERT,
      EARLIER_CONCERT,
    ]);
  });

  it('leaves the given list untouched', () => {
    const sessions = [EARLIER_CONCERT, LATER_CONCERT];
    selectConcertsNewestFirst(sessions);
    expect(sessions).toEqual([EARLIER_CONCERT, LATER_CONCERT]);
  });
});

describe('buildSetlistIndexRows', () => {
  const existingSetlist: SetlistPayload = { setlist: { id: 'setlist-1' } };

  it('pairs each concert with the setlist read at its own position', () => {
    expect(
      buildSetlistIndexRows([LATER_CONCERT, EARLIER_CONCERT], [null, existingSetlist]),
    ).toEqual([
      { session: LATER_CONCERT, setlistId: null },
      { session: EARLIER_CONCERT, setlistId: 'setlist-1' },
    ]);
  });

  it('reads a concert whose setlist has not been answered yet as carrying none', () => {
    expect(buildSetlistIndexRows([LATER_CONCERT], [])).toEqual([
      { session: LATER_CONCERT, setlistId: null },
    ]);
  });

  it('holds no row when there is no concert', () => {
    expect(buildSetlistIndexRows([], [existingSetlist])).toEqual([]);
  });
});
