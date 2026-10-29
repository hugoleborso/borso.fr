import { parisCalendarDayOf } from '../helpers/paris-time/paris-time.core';
import type { ReferenceCandidate, ReferenceMatch } from '../helpers/reference/reference.core';
import { type NamedEntity, nameEntity } from '../instruments/lineup-names.core';

export const SESSION_WINDOWS = ['upcoming', 'past', 'all'] as const;
export type SessionWindow = (typeof SESSION_WINDOWS)[number];

export interface DatedSession {
  readonly id: string;
  readonly kind: string;
  readonly date: Date;
  readonly venue: string | null;
}

export interface SessionSummary {
  readonly id: string;
  readonly kind: string;
  readonly date: string;
  readonly venue: string | null;
}

const NEXT_KIND_BY_REFERENCE: Readonly<Record<string, string | null>> = {
  next: null,
  'next-concert': 'concert',
  'next-practice': 'practice',
};
const LAST_REFERENCE = 'last';
const CALENDAR_DAY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const MISSING: ReferenceMatch = { kind: 'missing' };

function compareByDate(left: DatedSession, right: DatedSession): number {
  return left.date.getTime() - right.date.getTime() || left.id.localeCompare(right.id);
}

function isUpcoming(session: DatedSession, now: Date): boolean {
  return session.date.getTime() >= now.getTime();
}

export function summarizeSession(session: DatedSession): SessionSummary {
  return {
    id: session.id,
    kind: session.kind,
    date: session.date.toISOString(),
    venue: session.venue,
  };
}

export interface SessionDetail extends DatedSession {
  readonly preparedConcertId: string | null;
  readonly capacity: number | null;
  readonly gear: string | null;
  readonly friendsCountPerMember: unknown;
}

function nameFriendsCounts(
  counts: unknown,
  members: readonly NamedEntity[],
): Record<string, number> | null {
  if (typeof counts !== 'object' || counts === null) return null;
  const named: Record<string, number> = {};
  for (const [memberId, count] of Object.entries(counts)) {
    named[nameEntity(members, memberId)] = Number(count);
  }
  return named;
}

// @FollowsBlueprint core-projection
export function projectSessionForTool(session: SessionDetail, members: readonly NamedEntity[]) {
  return {
    ...summarizeSession(session),
    capacity: session.capacity,
    gear: session.gear,
    preparedConcertId: session.preparedConcertId,
    friendsCountPerMember: nameFriendsCounts(session.friendsCountPerMember, members),
  };
}

// @FollowsBlueprint core-projection
export function selectSessionsInWindow<Session extends DatedSession>(
  sessions: readonly Session[],
  window: SessionWindow,
  now: Date,
): Session[] {
  const ascending = sessions.toSorted(compareByDate);
  if (window === 'upcoming') return ascending.filter((session) => isUpcoming(session, now));
  if (window === 'past') {
    return ascending.filter((session) => !isUpcoming(session, now)).toReversed();
  }
  return ascending;
}

export function summarizeSessionsInWindow(
  sessions: readonly DatedSession[],
  window: SessionWindow,
  kind: string | undefined,
  now: Date,
): SessionSummary[] {
  return selectSessionsInWindow(sessions, window, now)
    .filter((session) => kind === undefined || session.kind === kind)
    .map(summarizeSession);
}

function describeCandidate(session: DatedSession): ReferenceCandidate {
  return { id: session.id, label: `${session.kind} ${session.date.toISOString()}` };
}

function settleSessions(sessions: readonly DatedSession[]): ReferenceMatch {
  const [only, ...others] = sessions;
  if (only === undefined) return MISSING;
  if (others.length === 0) return { kind: 'found', id: only.id };
  return { kind: 'ambiguous', candidates: sessions.map(describeCandidate) };
}

function firstOf(sessions: readonly DatedSession[]): ReferenceMatch {
  const [first] = sessions;
  return first === undefined ? MISSING : { kind: 'found', id: first.id };
}

function isOnCalendarDay(session: DatedSession, day: RegExpExecArray): boolean {
  const { year, month, day: dayOfMonth } = parisCalendarDayOf(session.date);
  return year === Number(day[1]) && month === Number(day[2]) && dayOfMonth === Number(day[3]);
}

// @FollowsBlueprint core-decision
export function matchSessionReference(
  sessions: readonly DatedSession[],
  reference: string,
  now: Date,
): ReferenceMatch {
  const word = reference.trim().toLowerCase();
  if (Object.hasOwn(NEXT_KIND_BY_REFERENCE, word)) {
    const kind = NEXT_KIND_BY_REFERENCE[word] ?? null;
    const upcoming = selectSessionsInWindow(sessions, 'upcoming', now);
    return firstOf(upcoming.filter((session) => kind === null || session.kind === kind));
  }
  if (word === LAST_REFERENCE) return firstOf(selectSessionsInWindow(sessions, 'past', now));
  const day = CALENDAR_DAY_PATTERN.exec(word);
  if (day !== null) {
    return settleSessions(
      sessions.toSorted(compareByDate).filter((session) => isOnCalendarDay(session, day)),
    );
  }
  return settleSessions(sessions.filter((session) => session.id === reference));
}
