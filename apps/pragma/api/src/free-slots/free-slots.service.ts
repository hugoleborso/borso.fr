import { addWideEventFields } from '../helpers/observability/wide-event.adapter';
import { readBusyTimeOfEveryFeed } from '../calendar-feeds/calendar-feeds.service';
import { getMembersSortedByFirstName } from '../members/members.service';
import { SEARCH_DAYS, selectFreeSlots } from './free-slots.core';
import {
  collectBusyIntervals,
  countFailedFeeds,
  countReadFeeds,
  selectExcludedMembers,
} from './member-busy-time.core';
import type { FreeSlotsResult } from './free-slots.types';

const MILLISECONDS_PER_DAY = 86_400_000;

// @FollowsBlueprint service-orchestration
export async function computeFreeSlots(now: Date): Promise<FreeSlotsResult> {
  const startedAt = Date.now();
  const range = { start: now, end: new Date(now.getTime() + SEARCH_DAYS * MILLISECONDS_PER_DAY) };
  const [members, busyTimes] = await Promise.all([
    getMembersSortedByFirstName(),
    readBusyTimeOfEveryFeed(range),
  ]);
  const memberIds = members.map((member) => member.id);
  const excludedMembers = selectExcludedMembers(memberIds, busyTimes);
  const slots = selectFreeSlots(now, collectBusyIntervals(busyTimes));
  addWideEventFields({
    'free_slots.members': memberIds.length,
    'free_slots.feeds_read': countReadFeeds(busyTimes),
    'free_slots.feeds_failed': countFailedFeeds(busyTimes),
    'free_slots.excluded': excludedMembers.length,
    'free_slots.slots': slots.length,
    'free_slots.duration_ms': Date.now() - startedAt,
  });
  return { slots, excludedMembers };
}

export { defineTool } from '../mcp/mcp.service';
