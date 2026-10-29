import { BAND_TIME_ZONE } from './band-time-zone.core';

export interface ScheduledSession {
  readonly id: string;
  readonly date: string | Date;
}

const BAND_DAY_FORMATTER = new Intl.DateTimeFormat('en-CA', {
  timeZone: BAND_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

function instantOf(moment: string | Date): number {
  return new Date(moment).getTime();
}

export function bandDayOf(moment: string | Date): string {
  return BAND_DAY_FORMATTER.format(new Date(moment));
}

function isComing(session: ScheduledSession, today: string): boolean {
  return bandDayOf(session.date) >= today;
}

function compareEarliestFirst(left: ScheduledSession, right: ScheduledSession): number {
  return instantOf(left.date) - instantOf(right.date) || left.id.localeCompare(right.id);
}

function compareNewestFirst(left: ScheduledSession, right: ScheduledSession): number {
  return instantOf(right.date) - instantOf(left.date) || left.id.localeCompare(right.id);
}

// @FollowsBlueprint domain-shared-selection
export function selectNextSession<TSession extends ScheduledSession>(
  sessions: readonly TSession[],
  now: Date,
): TSession | null {
  const today = bandDayOf(now);
  return (
    sessions.filter((session) => isComing(session, today)).toSorted(compareEarliestFirst)[0] ?? null
  );
}

// @FollowsBlueprint domain-shared-selection
export function selectComingSessions<TSession extends ScheduledSession>(
  sessions: readonly TSession[],
  now: Date,
): TSession[] {
  const today = bandDayOf(now);
  return sessions.filter((session) => isComing(session, today)).toSorted(compareEarliestFirst);
}

// @FollowsBlueprint domain-shared-selection
export function selectPastSessions<TSession extends ScheduledSession>(
  sessions: readonly TSession[],
  now: Date,
): TSession[] {
  const today = bandDayOf(now);
  return sessions.filter((session) => !isComing(session, today)).toSorted(compareNewestFirst);
}

// @FollowsBlueprint domain-shared-selection
export function orderSessionsForListing<TSession extends ScheduledSession>(
  sessions: readonly TSession[],
  now: Date,
): TSession[] {
  return [...selectComingSessions(sessions, now), ...selectPastSessions(sessions, now)];
}
