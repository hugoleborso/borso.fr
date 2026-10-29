import type { StoredCalendarFeed } from './calendar-feeds.types';

export type PositionedCalendarFeed = StoredCalendarFeed & { readonly position: number };

// @FollowsBlueprint core-decision
export function numberFeedsOfEachMember(
  feedsInDisplayOrder: readonly StoredCalendarFeed[],
): PositionedCalendarFeed[] {
  const heldByMember = new Map<string, number>();
  return feedsInDisplayOrder.map((feed) => {
    const position = (heldByMember.get(feed.memberId) ?? 0) + 1;
    heldByMember.set(feed.memberId, position);
    return { ...feed, position };
  });
}
