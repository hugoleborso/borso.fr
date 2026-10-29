import { describe, expect, it } from 'vitest';
import {
  collectBusyIntervals,
  countFailedFeeds,
  countReadFeeds,
  selectExcludedMembers,
} from './member-busy-time.core';

const EVENING = { start: new Date('2026-10-13T17:00:00Z'), end: new Date('2026-10-13T18:00:00Z') };
const LATE_EVENING = {
  start: new Date('2026-10-13T19:00:00Z'),
  end: new Date('2026-10-13T20:00:00Z'),
};

describe('selectExcludedMembers', () => {
  it('names each member left out of the calculation and why, in member order', () => {
    expect(
      selectExcludedMembers(
        ['hugo', 'lea', 'marc', 'sarah'],
        [
          { memberId: 'sarah', kind: 'unavailable', calendarName: null, calendarPosition: 1 },
          { memberId: 'hugo', kind: 'read', intervals: [] },
          {
            memberId: 'marc',
            kind: 'needs-reconnecting',
            calendarName: 'Work',
            calendarPosition: 1,
          },
        ],
      ),
    ).toStrictEqual([
      { memberId: 'lea', reason: 'no-calendar', calendarName: null, calendarPosition: null },
      { memberId: 'marc', reason: 'needs-reconnecting', calendarName: 'Work', calendarPosition: 1 },
      { memberId: 'sarah', reason: 'unavailable', calendarName: null, calendarPosition: 1 },
    ]);
  });

  it('names each calendar of a member that failed, and none that was read', () => {
    expect(
      selectExcludedMembers(
        ['hugo'],
        [
          { memberId: 'hugo', kind: 'read', intervals: [] },
          { memberId: 'hugo', kind: 'unavailable', calendarName: 'Band', calendarPosition: 2 },
          {
            memberId: 'hugo',
            kind: 'needs-reconnecting',
            calendarName: 'Work',
            calendarPosition: 3,
          },
        ],
      ),
    ).toStrictEqual([
      { memberId: 'hugo', reason: 'unavailable', calendarName: 'Band', calendarPosition: 2 },
      { memberId: 'hugo', reason: 'needs-reconnecting', calendarName: 'Work', calendarPosition: 3 },
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
    { memberId: 'marc', kind: 'unavailable', calendarName: null, calendarPosition: 1 },
    { memberId: 'sarah', kind: 'read', intervals: [] },
    { memberId: 'sarah', kind: 'read', intervals: [LATE_EVENING] },
  ] as const;

  it('pools the intervals of every feed that was read, several per member included', () => {
    expect(collectBusyIntervals(busyTimes)).toStrictEqual([EVENING, LATE_EVENING]);
  });

  it('counts the feeds that were read, and the ones that failed', () => {
    expect(countReadFeeds(busyTimes)).toBe(3);
    expect(countFailedFeeds(busyTimes)).toBe(1);
  });
});
