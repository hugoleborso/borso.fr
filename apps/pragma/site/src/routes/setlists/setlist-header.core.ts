/** @Feature setlists */

import { orderSessionsForListing } from '@domain/session-schedule.core';
import {
  describeTotalDuration,
  sumKnownDurations,
  type TotalDurationLabel,
} from '../../components/molecules/song-duration.utils';

export interface SetlistHeaderSession {
  readonly id: string;
  readonly kind: string;
  readonly date: string;
  readonly venue: string | null;
}

export interface SetlistHeaderInput<TSession extends SetlistHeaderSession> {
  readonly sessions: readonly TSession[];
  readonly durationsInSeconds: readonly (number | null | undefined)[];
  readonly now: Date;
}

export interface SetlistHeaderView<TSession extends SetlistHeaderSession> {
  readonly parentSession: TSession | null;
  readonly backTo: string;
  readonly songCount: number;
  readonly total: TotalDurationLabel | null;
}

const SETLIST_LIBRARY_PATH = '/setlists';

// @FollowsBlueprint core-view-intent
export function buildSetlistHeader<TSession extends SetlistHeaderSession>(
  input: SetlistHeaderInput<TSession>,
): SetlistHeaderView<TSession> {
  const parentSession = orderSessionsForListing(input.sessions, input.now)[0] ?? null;
  const totalSeconds = sumKnownDurations(input.durationsInSeconds);
  return {
    parentSession,
    backTo: parentSession === null ? SETLIST_LIBRARY_PATH : `/sessions/${parentSession.id}`,
    songCount: input.durationsInSeconds.length,
    total: totalSeconds === null ? null : describeTotalDuration(totalSeconds),
  };
}
