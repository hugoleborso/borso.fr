/** @Feature sessions */

import { selectUpcomingConcerts, type DatedSession } from './upcoming-concerts.core';

export interface NextConcertSession extends DatedSession {
  readonly id: string;
}

export interface NextConcertSetlist {
  readonly id: string;
  readonly sessionIds: readonly string[];
}

export interface NextConcert<TSession extends NextConcertSession> {
  readonly session: TSession;
  readonly setlistId: string | null;
}

export const MEMBER_FILTER_PARAM = 'member';

function compareByDate(first: DatedSession, second: DatedSession): number {
  return new Date(first.date).getTime() - new Date(second.date).getTime();
}

// @FollowsBlueprint core-view-projection
export function selectNextConcert<TSession extends NextConcertSession>(
  sessions: readonly TSession[],
  setlists: readonly NextConcertSetlist[],
  nowEpochMs: number,
): NextConcert<TSession> | null {
  const [session] = selectUpcomingConcerts(sessions, nowEpochMs).sort(compareByDate);
  if (session === undefined) return null;
  const setlist = setlists.find((candidate) => candidate.sessionIds.includes(session.id));
  return { session, setlistId: setlist?.id ?? null };
}

export function buildMemberPartPath(setlistId: string, memberId: string): string {
  if (memberId === '') return `/setlists/${setlistId}`;
  const query = new URLSearchParams({ [MEMBER_FILTER_PARAM]: memberId });
  return `/setlists/${setlistId}?${query.toString()}`;
}

export function joinConcertHeading(venue: string | null, dateLabel: string): string {
  return venue === null || venue === '' ? dateLabel : `${venue} · ${dateLabel}`;
}
