import type { BusyInterval, FeedFailure } from '../calendar-feeds/calendar-feeds.types';
import type { ExcludedMember } from './free-slots.types';

type BusyTimeOutcome =
  | {
      readonly memberId: string;
      readonly kind: 'read';
      readonly intervals: readonly BusyInterval[];
    }
  | { readonly memberId: string; readonly kind: FeedFailure };

// @FollowsBlueprint core-decision
export function selectExcludedMembers(
  memberIds: readonly string[],
  busyTimes: readonly BusyTimeOutcome[],
): ExcludedMember[] {
  const outcomeByMember = new Map(busyTimes.map((busyTime) => [busyTime.memberId, busyTime.kind]));
  return memberIds.flatMap((memberId): ExcludedMember[] => {
    const outcome = outcomeByMember.get(memberId);
    if (outcome === undefined) return [{ memberId, reason: 'no-calendar' }];
    if (outcome === 'read') return [];
    return [{ memberId, reason: outcome }];
  });
}

export function collectBusyIntervals(busyTimes: readonly BusyTimeOutcome[]): BusyInterval[] {
  return busyTimes.flatMap((busyTime) => (busyTime.kind === 'read' ? busyTime.intervals : []));
}

export function countReadFeeds(busyTimes: readonly BusyTimeOutcome[]): number {
  return busyTimes.filter((busyTime) => busyTime.kind === 'read').length;
}
