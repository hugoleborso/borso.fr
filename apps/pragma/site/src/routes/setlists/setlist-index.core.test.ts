import { describe, expect, it } from 'vitest';
import { buildSetlistIndexRows, type IndexSession, type IndexSetlist } from './setlist-index.core';

const EARLIER_CONCERT: IndexSession = {
  id: 'concert-1',
  kind: 'concert',
  date: '2026-08-01T20:00:00.000Z',
  venue: 'Le Petit Bain',
};
const LATER_PRACTICE: IndexSession = {
  id: 'practice-1',
  kind: 'practice',
  date: '2026-10-01T20:00:00.000Z',
  venue: null,
};

function setlist(overrides: Partial<IndexSetlist> & { id: string }): IndexSetlist {
  return { name: '', songCount: 0, sessionIds: [], ...overrides };
}

describe('buildSetlistIndexRows', () => {
  it('resolves every session carrying the setlist', () => {
    const rows = buildSetlistIndexRows(
      [setlist({ id: 'a', name: 'Set 1', songCount: 4, sessionIds: ['concert-1', 'practice-1'] })],
      [EARLIER_CONCERT, LATER_PRACTICE],
    );
    expect(rows).toEqual([
      { id: 'a', name: 'Set 1', songCount: 4, sessions: [LATER_PRACTICE, EARLIER_CONCERT] },
    ]);
  });

  it('drops a session identifier no loaded session answers', () => {
    const rows = buildSetlistIndexRows(
      [setlist({ id: 'a', sessionIds: ['deleted-session'] })],
      [EARLIER_CONCERT],
    );
    expect(rows[0]?.sessions).toEqual([]);
  });

  it('puts the setlists no session carries first', () => {
    const rows = buildSetlistIndexRows(
      [
        setlist({ id: 'attached', name: 'Set 1', sessionIds: ['concert-1'] }),
        setlist({ id: 'loose', name: 'Set 2' }),
      ],
      [EARLIER_CONCERT],
    );
    expect(rows.map((row) => row.id)).toEqual(['loose', 'attached']);
  });

  it('orders the attached ones by their latest session, most recent first', () => {
    const rows = buildSetlistIndexRows(
      [
        setlist({ id: 'older', name: 'Set 1', sessionIds: ['concert-1'] }),
        setlist({ id: 'newer', name: 'Set 2', sessionIds: ['practice-1'] }),
      ],
      [EARLIER_CONCERT, LATER_PRACTICE],
    );
    expect(rows.map((row) => row.id)).toEqual(['newer', 'older']);
  });

  it('puts them first whichever order the rows came back in', () => {
    const rows = buildSetlistIndexRows(
      [
        setlist({ id: 'loose', name: 'Set 2' }),
        setlist({ id: 'attached', name: 'Set 1', sessionIds: ['concert-1'] }),
      ],
      [EARLIER_CONCERT],
    );
    expect(rows.map((row) => row.id)).toEqual(['loose', 'attached']);
  });

  it('ranks a setlist by its latest session, not by the first one it was attached to', () => {
    const rows = buildSetlistIndexRows(
      [
        setlist({ id: 'both', name: 'Set 1', sessionIds: ['concert-1', 'practice-1'] }),
        setlist({ id: 'older', name: 'Set 2', sessionIds: ['concert-1'] }),
      ],
      [EARLIER_CONCERT, LATER_PRACTICE],
    );
    expect(rows.map((row) => row.id)).toEqual(['both', 'older']);
  });

  it('breaks a tie on the name, so the order never depends on the rows order', () => {
    const rows = buildSetlistIndexRows(
      [
        setlist({ id: 'second', name: 'Rappel', sessionIds: ['concert-1'] }),
        setlist({ id: 'first', name: 'Filage', sessionIds: ['concert-1'] }),
      ],
      [EARLIER_CONCERT],
    );
    expect(rows.map((row) => row.id)).toEqual(['first', 'second']);
  });

  it('holds no row when the band has written no setlist', () => {
    expect(buildSetlistIndexRows([], [EARLIER_CONCERT])).toEqual([]);
  });
});
