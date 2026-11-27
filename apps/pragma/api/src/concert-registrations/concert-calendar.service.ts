import { buildConcertCalendar, CONCERT_CALENDAR_FILE_NAME } from './concert-calendar.core';
import { isUpcomingConcert } from './concert-registrations.core';
import { findConcertAnnouncement } from './concert-registrations.repository';
import { refuse, type Refused } from './concert-registrations.types';

export interface ReadConcertCalendarParams {
  readonly sessionId: string;
  readonly now: Date;
}

export type ConcertCalendarOutcome = { kind: 'ok'; calendar: string; fileName: string } | Refused;

// @FollowsBlueprint service-orchestration
export async function readConcertCalendar(
  params: ReadConcertCalendarParams,
): Promise<ConcertCalendarOutcome> {
  const concert = await findConcertAnnouncement(params.sessionId);
  if (concert === null || !isUpcomingConcert(concert, params.now)) {
    return refuse('not-an-upcoming-concert');
  }
  return {
    kind: 'ok',
    fileName: CONCERT_CALENDAR_FILE_NAME,
    calendar: buildConcertCalendar({
      sessionId: concert.id,
      date: concert.date,
      venue: concert.venue,
      message: concert.publicMessage,
      now: params.now,
    }),
  };
}
