export interface DatedSession {
  readonly kind: string;
  readonly date: string | Date;
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
