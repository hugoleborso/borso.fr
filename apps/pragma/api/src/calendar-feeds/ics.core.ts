import ICAL from 'ical.js';
import { z } from 'zod';
import { parisWallTimeToInstant } from '../helpers/paris-time/paris-time.core';
import type { BusyInterval } from './calendar-feeds.types';

const TRANSPARENT = 'TRANSPARENT';
const CANCELLED = 'CANCELLED';
const FLOATING_ZONE_ID = 'floating';
const MILLISECONDS_PER_SECOND = 1_000;
const MAX_OCCURRENCES_PER_EVENT = 10_000;

export type BusyIntervalsOutcome =
  | { readonly kind: 'ok'; readonly intervals: readonly BusyInterval[] }
  | { readonly kind: 'unavailable' };

const jcalSchema = z.array(z.unknown());

const UNAVAILABLE: BusyIntervalsOutcome = { kind: 'unavailable' };

interface ReadRange {
  readonly start: Date;
  readonly end: Date;
}

function instantOf(time: ICAL.Time): Date {
  const isWallClockOnly = time.isDate || time.zone.tzid === FLOATING_ZONE_ID;
  if (!isWallClockOnly) return new Date(time.toUnixTime() * MILLISECONDS_PER_SECOND);
  return parisWallTimeToInstant({
    year: time.year,
    month: time.month,
    day: time.day,
    hour: time.isDate ? 0 : time.hour,
    minute: time.isDate ? 0 : time.minute,
  });
}

function isBusy(component: ICAL.Component): boolean {
  return (
    component.getFirstPropertyValue('transp') !== TRANSPARENT &&
    component.getFirstPropertyValue('status') !== CANCELLED
  );
}

function isOverlapping(interval: BusyInterval, range: ReadRange): boolean {
  return interval.start < range.end && interval.end > range.start;
}

function occurrencesOf(event: ICAL.Event, range: ReadRange): BusyInterval[] {
  if (!event.isRecurring()) {
    if (!isBusy(event.component)) return [];
    const single = { start: instantOf(event.startDate), end: instantOf(event.endDate) };
    return isOverlapping(single, range) ? [single] : [];
  }
  const busy: BusyInterval[] = [];
  const iterator = event.iterator();
  for (let index = 0; index < MAX_OCCURRENCES_PER_EVENT; index++) {
    const occurrenceStart = iterator.next();
    if (iterator.complete) break;
    if (instantOf(occurrenceStart) >= range.end) break;
    const details = event.getOccurrenceDetails(occurrenceStart);
    const occurrence = { start: instantOf(details.startDate), end: instantOf(details.endDate) };
    if (isBusy(details.item.component) && isOverlapping(occurrence, range)) busy.push(occurrence);
  }
  return busy;
}

function relateExceptions(events: readonly ICAL.Event[]): ICAL.Event[] {
  const masters = events.filter((event) => !event.isRecurrenceException());
  for (const exception of events.filter((event) => event.isRecurrenceException())) {
    masters.find((master) => master.uid === exception.uid)?.relateException(exception);
  }
  return masters;
}

function withFeedTimezones<T>(root: ICAL.Component, read: () => T): T {
  const registered: string[] = [];
  for (const timezone of root.getAllSubcomponents('vtimezone')) {
    const timezoneId = timezone.getFirstPropertyValue('tzid');
    if (typeof timezoneId !== 'string' || ICAL.TimezoneService.has(timezoneId)) continue;
    ICAL.TimezoneService.register(timezone);
    registered.push(timezoneId);
  }
  try {
    return read();
  } finally {
    for (const timezoneId of registered) ICAL.TimezoneService.remove(timezoneId);
  }
}

// @FollowsBlueprint core-external-payload-mapping
export function readBusyIntervals(body: string, range: ReadRange): BusyIntervalsOutcome {
  try {
    const root = new ICAL.Component(jcalSchema.parse(ICAL.parse(body)));
    const intervals = withFeedTimezones(root, () =>
      relateExceptions(
        root.getAllSubcomponents('vevent').map((vevent) => new ICAL.Event(vevent)),
      ).flatMap((event) => occurrencesOf(event, range)),
    );
    return { kind: 'ok', intervals };
  } catch {
    return UNAVAILABLE;
  }
}
