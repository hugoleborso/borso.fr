import type { BusyInterval, FeedFailure } from '../calendar-feeds/calendar-feeds.types';
import type { ExcludedMember } from './free-slots.types';

type BusyTimeOutcome =
  | {
      readonly memberId: string;
      readonly kind: 'read';
      readonly intervals: readonly BusyInterval[];
    }
  | {
      readonly memberId: string;
      readonly kind: FeedFailure;
      readonly calendarName: string | null;
      readonly calendarPosition: number;
    };

// @FollowsBlueprint core-decision
export function selectExcludedMembers(
  memberIds: readonly string[],
  busyTimes: readonly BusyTimeOutcome[],
): ExcludedMember[] {
  return memberIds.flatMap((memberId): ExcludedMember[] => {
    const outcomes = busyTimes.filter((busyTime) => busyTime.memberId === memberId);
    if (outcomes.length === 0) {
      return [{ memberId, reason: 'no-calendar', calendarName: null, calendarPosition: null }];
    }
    return outcomes.flatMap((outcome): ExcludedMember[] =>
      outcome.kind === 'read'
        ? []
        : [
            {
              memberId,
              reason: outcome.kind,
              calendarName: outcome.calendarName,
              calendarPosition: outcome.calendarPosition,
            },
          ],
    );
  });
}

export function collectBusyIntervals(busyTimes: readonly BusyTimeOutcome[]): BusyInterval[] {
  return busyTimes.flatMap((busyTime) => (busyTime.kind === 'read' ? busyTime.intervals : []));
}

export function countReadFeeds(busyTimes: readonly BusyTimeOutcome[]): number {
  return busyTimes.filter((busyTime) => busyTime.kind === 'read').length;
}

export function countFailedFeeds(busyTimes: readonly BusyTimeOutcome[]): number {
  return busyTimes.length - countReadFeeds(busyTimes);
}
