import { readBusyTimeOfEveryFeed } from '../calendar-feeds/calendar-feeds.service';
import { getMembersSortedByFirstName } from '../members/members.service';
import { SEARCH_DAYS, selectFreeSlots } from './free-slots.core';
import {
  collectBusyIntervals,
  countReadFeeds,
  selectExcludedMembers,
} from './member-busy-time.core';
import type { FreeSlotsResult } from './free-slots.types';

const MILLISECONDS_PER_DAY = 86_400_000;
const COMPUTED_EVENT = 'free_slots_computed';

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
  // eslint-disable-next-line no-console -- free_slots_computed is the input metric the spec's production strategy reads from CloudWatch; it carries counts and a duration, never an address
  console.info(
    JSON.stringify({
      event: COMPUTED_EVENT,
      members: memberIds.length,
      feedsRead: countReadFeeds(busyTimes),
      excluded: excludedMembers.length,
      slots: slots.length,
      durationMs: Date.now() - startedAt,
    }),
  );
  return { slots, excludedMembers };
}
