import ICAL from 'ical.js';

export const CONCERT_CALENDAR_EVENT_HOURS = 2;
export const CONCERT_CALENDAR_FILE_NAME = 'pragma-concert.ics';

const BAND_NAME = 'pragma';
const PRODUCT_ID = '-//borso.fr//pragma//EN';
const ICALENDAR_VERSION = '2.0';
const UID_DOMAIN = 'pragma.borso.fr';
const MILLISECONDS_PER_HOUR = 3_600_000;
const IS_UTC = true;
const LINE_END = '\r\n';

export interface ConcertCalendarInput {
  readonly sessionId: string;
  readonly date: Date;
  readonly venue: string | null;
  readonly message: string | null;
  readonly now: Date;
}

function describeSummary(venue: string | null): string {
  return venue === null ? BAND_NAME : `${BAND_NAME} · ${venue}`;
}

// @FollowsBlueprint core-serializer
export function buildConcertCalendar(input: ConcertCalendarInput): string {
  const calendar = new ICAL.Component('vcalendar');
  calendar.updatePropertyWithValue('prodid', PRODUCT_ID);
  calendar.updatePropertyWithValue('version', ICALENDAR_VERSION);
  const event = new ICAL.Event();
  event.uid = `${input.sessionId}@${UID_DOMAIN}`;
  event.component.updatePropertyWithValue('dtstamp', ICAL.Time.fromJSDate(input.now, IS_UTC));
  event.startDate = ICAL.Time.fromJSDate(input.date, IS_UTC);
  event.endDate = ICAL.Time.fromJSDate(
    new Date(input.date.getTime() + CONCERT_CALENDAR_EVENT_HOURS * MILLISECONDS_PER_HOUR),
    IS_UTC,
  );
  event.summary = describeSummary(input.venue);
  if (input.venue !== null) event.location = input.venue;
  if (input.message !== null) event.description = input.message;
  calendar.addSubcomponent(event.component);
  return `${calendar.toString()}${LINE_END}`;
}
