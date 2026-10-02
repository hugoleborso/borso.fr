import { describe, expect, it } from 'vitest';
import {
  buildSearchWindows,
  roundUpToQuarterHour,
  SEARCH_DAYS,
  selectFreeSlots,
  subtractBusyIntervals,
} from './free-slots.core';
import type { TimeInterval } from './free-slots.types';

function interval(start: string, end: string): TimeInterval {
  return { start: new Date(start), end: new Date(end) };
}

function asIso(intervals: readonly TimeInterval[]): string[][] {
  return intervals.map((entry) => [entry.start.toISOString(), entry.end.toISOString()]);
}

const TUESDAY_MORNING = new Date('2026-10-13T08:00:00Z');

describe('buildSearchWindows', () => {
  it('opens at 18:00 on weekdays and 10:00 at weekends, until midnight, Paris time', () => {
    const windows = buildSearchWindows(new Date('2026-10-16T08:00:00Z'), 3);
    expect(asIso(windows)).toStrictEqual([
      ['2026-10-16T16:00:00.000Z', '2026-10-16T22:00:00.000Z'],
      ['2026-10-17T08:00:00.000Z', '2026-10-17T22:00:00.000Z'],
      ['2026-10-18T08:00:00.000Z', '2026-10-18T22:00:00.000Z'],
    ]);
  });

  it('follows the October clock change', () => {
    const windows = buildSearchWindows(new Date('2026-10-24T06:00:00Z'), 2);
    expect(asIso(windows)).toStrictEqual([
      ['2026-10-24T08:00:00.000Z', '2026-10-24T22:00:00.000Z'],
      ['2026-10-25T09:00:00.000Z', '2026-10-25T23:00:00.000Z'],
    ]);
  });

  it('starts today at now when now is inside the window', () => {
    const windows = buildSearchWindows(new Date('2026-10-13T18:07:00Z'), 1);
    expect(asIso(windows)).toStrictEqual([
      ['2026-10-13T18:07:00.000Z', '2026-10-13T22:00:00.000Z'],
    ]);
  });

  it('treats the minutes after midnight as the next day', () => {
    const windows = buildSearchWindows(new Date('2026-10-13T22:30:00Z'), 1);
    expect(asIso(windows)).toStrictEqual([
      ['2026-10-14T16:00:00.000Z', '2026-10-14T22:00:00.000Z'],
    ]);
  });

  it('covers the whole search period', () => {
    expect(buildSearchWindows(TUESDAY_MORNING, SEARCH_DAYS)).toHaveLength(SEARCH_DAYS);
  });
});

describe('subtractBusyIntervals', () => {
  const window = interval('2026-10-13T16:00:00Z', '2026-10-13T22:00:00Z');

  it('leaves a window without busy time whole', () => {
    expect(asIso(subtractBusyIntervals([window], []))).toStrictEqual([
      ['2026-10-13T16:00:00.000Z', '2026-10-13T22:00:00.000Z'],
    ]);
  });

  it('cuts overlapping and unsorted busy time out of the window', () => {
    const busy = [
      interval('2026-10-13T19:00:00Z', '2026-10-13T20:00:00Z'),
      interval('2026-10-13T15:00:00Z', '2026-10-13T17:00:00Z'),
      interval('2026-10-13T19:30:00Z', '2026-10-13T19:45:00Z'),
    ];
    expect(asIso(subtractBusyIntervals([window], busy))).toStrictEqual([
      ['2026-10-13T17:00:00.000Z', '2026-10-13T19:00:00.000Z'],
      ['2026-10-13T20:00:00.000Z', '2026-10-13T22:00:00.000Z'],
    ]);
  });

  it('leaves nothing, not an empty interval, when busy time ends exactly at the window end', () => {
    const tail = interval('2026-10-13T16:00:00Z', '2026-10-13T22:00:00Z');
    expect(subtractBusyIntervals([window], [tail])).toStrictEqual([]);
  });

  it('ignores busy time outside the window, and empties a fully busy one', () => {
    const outside = interval('2026-10-14T10:00:00Z', '2026-10-14T11:00:00Z');
    expect(asIso(subtractBusyIntervals([window], [outside]))).toHaveLength(1);
    const covering = interval('2026-10-13T00:00:00Z', '2026-10-14T00:00:00Z');
    expect(subtractBusyIntervals([window], [covering])).toStrictEqual([]);
  });

  it('keeps a busy interval that ends exactly at the window start from cutting anything', () => {
    const touching = interval('2026-10-13T15:00:00Z', '2026-10-13T16:00:00Z');
    expect(asIso(subtractBusyIntervals([window], [touching]))).toStrictEqual([
      ['2026-10-13T16:00:00.000Z', '2026-10-13T22:00:00.000Z'],
    ]);
  });

  it('keeps a busy interval starting exactly at the window end from cutting anything', () => {
    const touching = interval('2026-10-13T22:00:00Z', '2026-10-13T23:00:00Z');
    expect(asIso(subtractBusyIntervals([window], [touching]))).toStrictEqual([
      ['2026-10-13T16:00:00.000Z', '2026-10-13T22:00:00.000Z'],
    ]);
  });

  it('does not move the cursor back for a busy interval nested in an earlier one', () => {
    const busy = [
      interval('2026-10-13T16:00:00Z', '2026-10-13T20:00:00Z'),
      interval('2026-10-13T17:00:00Z', '2026-10-13T18:00:00Z'),
    ];
    expect(asIso(subtractBusyIntervals([window], busy))).toStrictEqual([
      ['2026-10-13T20:00:00.000Z', '2026-10-13T22:00:00.000Z'],
    ]);
  });
});

describe('an event crossing midnight', () => {
  it('blocks both evenings it touches', () => {
    const tuesdayEvening = interval('2026-10-13T16:00:00Z', '2026-10-13T22:00:00Z');
    const wednesdayEvening = interval('2026-10-14T16:00:00Z', '2026-10-14T22:00:00Z');
    const overnight = interval('2026-10-13T20:30:00Z', '2026-10-14T17:30:00Z');
    expect(
      asIso(subtractBusyIntervals([tuesdayEvening, wednesdayEvening], [overnight])),
    ).toStrictEqual([
      ['2026-10-13T16:00:00.000Z', '2026-10-13T20:30:00.000Z'],
      ['2026-10-14T17:30:00.000Z', '2026-10-14T22:00:00.000Z'],
    ]);
  });
});

describe('roundUpToQuarterHour', () => {
  it('rounds up to the next quarter hour and leaves a quarter hour alone', () => {
    expect(roundUpToQuarterHour(new Date('2026-10-13T17:01:00Z')).toISOString()).toBe(
      '2026-10-13T17:15:00.000Z',
    );
    expect(roundUpToQuarterHour(new Date('2026-10-13T17:15:00Z')).toISOString()).toBe(
      '2026-10-13T17:15:00.000Z',
    );
  });
});

describe('selectFreeSlots', () => {
  it('keeps free time of at least two hours, starting on a quarter hour', () => {
    const now = new Date('2026-10-13T08:00:00Z');
    const everyOtherDayBusy = buildSearchWindows(now, SEARCH_DAYS).slice(1);
    const tuesdayBusy = [
      interval('2026-10-13T16:00:00Z', '2026-10-13T17:10:00Z'),
      interval('2026-10-13T21:00:00Z', '2026-10-13T22:00:00Z'),
    ];
    expect(asIso(selectFreeSlots(now, [...everyOtherDayBusy, ...tuesdayBusy]))).toStrictEqual([
      ['2026-10-13T17:15:00.000Z', '2026-10-13T21:00:00.000Z'],
    ]);
  });

  it('drops free time shorter than two hours once rounded', () => {
    const now = new Date('2026-10-13T08:00:00Z');
    const everyOtherDayBusy = buildSearchWindows(now, SEARCH_DAYS).slice(1);
    const tuesdayBusy = [
      interval('2026-10-13T16:00:00Z', '2026-10-13T17:05:00Z'),
      interval('2026-10-13T19:10:00Z', '2026-10-13T22:00:00Z'),
    ];
    expect(selectFreeSlots(now, [...everyOtherDayBusy, ...tuesdayBusy])).toStrictEqual([]);
  });

  it('keeps a slot of exactly two hours', () => {
    const now = new Date('2026-10-13T08:00:00Z');
    const everyOtherDayBusy = buildSearchWindows(now, SEARCH_DAYS).slice(1);
    const tuesdayBusy = [interval('2026-10-13T16:00:00Z', '2026-10-13T20:00:00Z')];
    expect(asIso(selectFreeSlots(now, [...everyOtherDayBusy, ...tuesdayBusy]))).toStrictEqual([
      ['2026-10-13T20:00:00.000Z', '2026-10-13T22:00:00.000Z'],
    ]);
  });
});
