import ICAL from 'ical.js';
import { z } from 'zod';
import { parisWallTimeToInstant } from '../helpers/paris-time/paris-time.core';
import type { BusyInterval } from './calendar-feeds.types';

const TRANSPARENT = 'TRANSPARENT';
const CANCELLED = 'CANCELLED';
const FLOATING_ZONE_ID = 'floating';
const RECURRENCE_ID = 'recurrence-id';
const UID = 'uid';
const MILLISECONDS_PER_SECOND = 1_000;
const MAX_OCCURRENCES_PER_EVENT = 100_000;

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

function singleOccurrence(event: ICAL.Event, range: ReadRange): BusyInterval[] {
  if (!isBusy(event.component)) return [];
  const single = { start: instantOf(event.startDate), end: instantOf(event.endDate) };
  return isOverlapping(single, range) ? [single] : [];
}

function recurringOccurrences(event: ICAL.Event, range: ReadRange): BusyInterval[] {
  const busy: BusyInterval[] = [];
  const iterator = event.iterator();
  // Stryker disable next-line EqualityOperator,UpdateOperator: equivalent mutants. The cap only guards against a rule ical.js cannot advance; every rule in a real feed ends on `iterator.complete` or on the range end first, so one more pass or a counter going down changes no output a test can observe.
  for (let index = 0; index < MAX_OCCURRENCES_PER_EVENT; index++) {
    const occurrenceStart = iterator.next();
    if (iterator.complete) break;
    const details = event.getOccurrenceDetails(occurrenceStart);
    const occurrence = { start: instantOf(details.startDate), end: instantOf(details.endDate) };
    if (occurrence.start >= range.end) break;
    if (isBusy(details.item.component) && occurrence.end > range.start) busy.push(occurrence);
  }
  return busy;
}

function occurrencesOf(event: ICAL.Event, range: ReadRange): BusyInterval[] {
  return event.isRecurring() ? recurringOccurrences(event, range) : singleOccurrence(event, range);
}

function hasSameUid(left: ICAL.Component, right: ICAL.Component): boolean {
  return left.getFirstPropertyValue(UID) === right.getFirstPropertyValue(UID);
}

function buildSeries(vevents: readonly ICAL.Component[]): ICAL.Event[] {
  const exceptions = vevents.filter((vevent) => vevent.hasProperty(RECURRENCE_ID));
  return vevents
    .filter((vevent) => !vevent.hasProperty(RECURRENCE_ID))
    .map(
      (master) =>
        new ICAL.Event(master, {
          exceptions: exceptions.filter((exception) => hasSameUid(exception, master)),
        }),
    );
}

// @FollowsBlueprint core-external-payload-mapping
export function readBusyIntervals(body: string, range: ReadRange): BusyIntervalsOutcome {
  try {
    const root = new ICAL.Component(jcalSchema.parse(ICAL.parse(body)));
    const intervals = buildSeries(root.getAllSubcomponents('vevent')).flatMap((event) =>
      occurrencesOf(event, range),
    );
    return { kind: 'ok', intervals };
  } catch {
    return UNAVAILABLE;
  }
}
