/**
 * Which sessions are concerts that have not happened yet.
 *
 * The nav badge counts them and the session detail page offers them as the
 * concert a practice prepares, so both read the same rule. `now` is an
 * argument, which is what lets a test pin the boundary instead of waiting for
 * it.
 */

export interface DatedSession {
  readonly kind: string;
  readonly date: string;
}

const CONCERT_KIND = 'concert';

// @FollowsBlueprint core-view-projection
export function selectUpcomingConcerts<TSession extends DatedSession>(
  sessions: readonly TSession[],
  nowEpochMs: number,
): TSession[] {
  return sessions.filter(
    (session) => session.kind === CONCERT_KIND && new Date(session.date).getTime() > nowEpochMs,
  );
}
