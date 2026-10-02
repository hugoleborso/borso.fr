import ICAL from 'ical.js';
import { describe, expect, it } from 'vitest';
import type { BusyInterval } from './calendar-feeds.types';
import { readBusyIntervals } from './ics.core';

const RANGE = { start: new Date('2026-10-12T00:00:00Z'), end: new Date('2026-10-26T00:00:00Z') };

const NEW_YORK_TIMEZONE = [
  'BEGIN:VTIMEZONE',
  'TZID:America/New_York',
  'BEGIN:STANDARD',
  'DTSTART:19701101T020000',
  'RRULE:FREQ=YEARLY;BYMONTH=11;BYDAY=1SU',
  'TZOFFSETFROM:-0400',
  'TZOFFSETTO:-0500',
  'END:STANDARD',
  'BEGIN:DAYLIGHT',
  'DTSTART:19700308T020000',
  'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=2SU',
  'TZOFFSETFROM:-0500',
  'TZOFFSETTO:-0400',
  'END:DAYLIGHT',
  'END:VTIMEZONE',
];

function calendar(...lines: string[]): string {
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//test//EN', ...lines, 'END:VCALENDAR'].join(
    '\r\n',
  );
}

function event(uid: string, ...lines: string[]): string[] {
  return ['BEGIN:VEVENT', `UID:${uid}`, ...lines, 'END:VEVENT'];
}

function busyOf(body: string): string[][] {
  const outcome = readBusyIntervals(body, RANGE);
  if (outcome.kind !== 'ok') throw new Error('expected the feed to parse');
  return outcome.intervals.map((interval: BusyInterval) => [
    interval.start.toISOString(),
    interval.end.toISOString(),
  ]);
}

describe('readBusyIntervals', () => {
  it('reads a UTC event', () => {
    const body = calendar(...event('a', 'DTSTART:20261013T170000Z', 'DTEND:20261013T180000Z'));
    expect(busyOf(body)).toStrictEqual([['2026-10-13T17:00:00.000Z', '2026-10-13T18:00:00.000Z']]);
  });

  it('reads a time in a zone the feed defines', () => {
    const body = calendar(
      ...NEW_YORK_TIMEZONE,
      ...event(
        'a',
        'DTSTART;TZID=America/New_York:20261013T120000',
        'DTEND;TZID=America/New_York:20261013T130000',
      ),
    );
    expect(busyOf(body)).toStrictEqual([['2026-10-13T16:00:00.000Z', '2026-10-13T17:00:00.000Z']]);
  });

  it('forgets the zones a feed defined once it is read', () => {
    readBusyIntervals(calendar(...NEW_YORK_TIMEZONE), RANGE);
    expect(ICAL.TimezoneService.has('America/New_York')).toBe(false);
  });

  it('keeps a zone it already knew, and skips a zone block without an identifier', () => {
    const body = calendar(
      'BEGIN:VTIMEZONE',
      'TZID:UTC',
      'END:VTIMEZONE',
      'BEGIN:VTIMEZONE',
      'END:VTIMEZONE',
      ...event('a', 'DTSTART:20261013T170000Z', 'DTEND:20261013T180000Z'),
    );
    expect(busyOf(body)).toHaveLength(1);
    expect(ICAL.TimezoneService.has('UTC')).toBe(true);
  });

  it('reads a floating time, or a zone the feed does not define, as Paris time', () => {
    const body = calendar(
      ...event('a', 'DTSTART:20261013T190000', 'DTEND:20261013T200000'),
      ...event('b', 'DTSTART;TZID=Romance Standard Time:20261014T190000', 'DURATION:PT1H'),
    );
    expect(busyOf(body)).toStrictEqual([
      ['2026-10-13T17:00:00.000Z', '2026-10-13T18:00:00.000Z'],
      ['2026-10-14T17:00:00.000Z', '2026-10-14T18:00:00.000Z'],
    ]);
  });

  it('makes an all-day event busy for the whole Paris day', () => {
    const body = calendar(
      ...event('a', 'DTSTART;VALUE=DATE:20261017', 'DTEND;VALUE=DATE:20261018'),
    );
    expect(busyOf(body)).toStrictEqual([['2026-10-16T22:00:00.000Z', '2026-10-17T22:00:00.000Z']]);
  });

  it('leaves out an event marked free, and a cancelled one', () => {
    const body = calendar(
      ...event(
        'a',
        'DTSTART;VALUE=DATE:20261017',
        'DTEND;VALUE=DATE:20261018',
        'TRANSP:TRANSPARENT',
      ),
      ...event('b', 'DTSTART:20261013T170000Z', 'DTEND:20261013T180000Z', 'STATUS:CANCELLED'),
    );
    expect(busyOf(body)).toStrictEqual([]);
  });

  it('expands a weekly rule inside the range, minus its deleted and cancelled occurrences', () => {
    const body = calendar(
      ...event(
        'weekly',
        'DTSTART:20260929T170000Z',
        'DTEND:20260929T180000Z',
        'RRULE:FREQ=WEEKLY',
        'EXDATE:20261013T170000Z',
      ),
      ...event(
        'weekly',
        'RECURRENCE-ID:20261020T170000Z',
        'DTSTART:20261020T170000Z',
        'DTEND:20261020T180000Z',
        'STATUS:CANCELLED',
      ),
    );
    expect(busyOf(body)).toStrictEqual([]);
  });

  it('moves an occurrence its exception moved', () => {
    const body = calendar(
      ...event(
        'weekly',
        'DTSTART:20261006T170000Z',
        'DTEND:20261006T180000Z',
        'RRULE:FREQ=WEEKLY;COUNT=3',
      ),
      ...event(
        'weekly',
        'RECURRENCE-ID:20261013T170000Z',
        'DTSTART:20261013T190000Z',
        'DTEND:20261013T200000Z',
      ),
    );
    expect(busyOf(body)).toStrictEqual([
      ['2026-10-13T19:00:00.000Z', '2026-10-13T20:00:00.000Z'],
      ['2026-10-20T17:00:00.000Z', '2026-10-20T18:00:00.000Z'],
    ]);
  });

  it('leaves out events entirely outside the range, recurring or not', () => {
    const body = calendar(
      ...event('past', 'DTSTART:20261001T170000Z', 'DTEND:20261001T180000Z'),
      ...event('future', 'DTSTART:20261101T170000Z', 'DTEND:20261101T180000Z'),
      ...event(
        'ended',
        'DTSTART:20260901T170000Z',
        'DTEND:20260901T180000Z',
        'RRULE:FREQ=DAILY;UNTIL=20260905T170000Z',
      ),
      ...event('later', 'DTSTART:20261201T170000Z', 'DURATION:PT1H', 'RRULE:FREQ=DAILY'),
    );
    expect(busyOf(body)).toStrictEqual([]);
  });

  it('keeps an event that only overlaps the start of the range', () => {
    const body = calendar(...event('a', 'DTSTART:20261011T230000Z', 'DTEND:20261012T010000Z'));
    expect(busyOf(body)).toStrictEqual([['2026-10-11T23:00:00.000Z', '2026-10-12T01:00:00.000Z']]);
  });

  it('ignores an exception whose series is missing', () => {
    const body = calendar(
      ...event(
        'orphan',
        'RECURRENCE-ID:20261013T170000Z',
        'DTSTART:20261013T190000Z',
        'DTEND:20261013T200000Z',
      ),
    );
    expect(busyOf(body)).toStrictEqual([]);
  });

  it('reports a body that is not a calendar as unavailable', () => {
    expect(readBusyIntervals('<html>not a calendar</html>', RANGE)).toStrictEqual({
      kind: 'unavailable',
    });
  });
});
