import { describe, expect, it } from 'vitest';
import {
  collectBusyIntervals,
  countReadFeeds,
  selectExcludedMembers,
} from './member-busy-time.core';

const EVENING = { start: new Date('2026-10-13T17:00:00Z'), end: new Date('2026-10-13T18:00:00Z') };

describe('selectExcludedMembers', () => {
  it('names each member left out of the calculation and why, in member order', () => {
    expect(
      selectExcludedMembers(
        ['hugo', 'lea', 'marc', 'sarah'],
        [
          { memberId: 'sarah', kind: 'unavailable' },
          { memberId: 'hugo', kind: 'read', intervals: [] },
          { memberId: 'marc', kind: 'needs-reconnecting' },
        ],
      ),
    ).toStrictEqual([
      { memberId: 'lea', reason: 'no-calendar' },
      { memberId: 'marc', reason: 'needs-reconnecting' },
      { memberId: 'sarah', reason: 'unavailable' },
    ]);
  });

  it('ignores a feed whose member no longer exists', () => {
    expect(
      selectExcludedMembers([], [{ memberId: 'gone', kind: 'read', intervals: [] }]),
    ).toStrictEqual([]);
  });
});

describe('collectBusyIntervals and countReadFeeds', () => {
  const busyTimes = [
    { memberId: 'hugo', kind: 'read', intervals: [EVENING] },
    { memberId: 'marc', kind: 'unavailable' },
    { memberId: 'sarah', kind: 'read', intervals: [] },
  ] as const;

  it('pools the intervals of every feed that was read', () => {
    expect(collectBusyIntervals(busyTimes)).toStrictEqual([EVENING]);
  });

  it('counts the feeds that were read', () => {
    expect(countReadFeeds(busyTimes)).toBe(2);
  });
});
